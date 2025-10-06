import { AssignmentRule } from '../models/AssignmentRule';
import { Lead } from '../models/Lead';
import { User } from '../models/User';
import { Activity } from '../models/Activity';
import { 
  ActivityType,
  UserRole,
  RuleAction,
  WorkingHours
} from '../types';
import { ValidationError, NotFoundError, BusinessLogicError } from '../utils/errors';

export interface AssignmentResult {
  leadId: string;
  assignedTo: string;
  assignmentReason: string;
  ruleId?: string | undefined;
  previousAssignee?: string | undefined;
}

export interface WorkloadInfo {
  userId: string;
  activeLeads: number;
  overdueTasks: number;
  workloadScore: number;
}

export interface SLAStatus {
  leadId: string;
  assignedAt: Date;
  slaDeadline: Date;
  isOverdue: boolean;
  hoursRemaining: number;
  escalationLevel: number;
}

export interface ReassignmentRequest {
  leadId: string;
  newAssigneeId: string;
  reason: string;
  reassignedBy: string;
}

export class RoutingService {
  private static readonly DEFAULT_SLA_HOURS = 24;
  private static readonly ESCALATION_LEVELS = [24, 48, 72]; // Hours for each escalation level

  /**
   * Assign a lead using the configured assignment rules
   */
  static async assignLead(leadId: string, manualAssigneeId?: string): Promise<AssignmentResult> {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // If manual assignment is specified, validate and assign directly
    if (manualAssigneeId) {
      const assignee = await User.findById(manualAssigneeId);
      if (!assignee || !assignee.is_active) {
        throw new ValidationError('Invalid or inactive assignee');
      }

      return this.performAssignment(leadId, manualAssigneeId, 'Manual assignment', undefined, lead.assigned_to);
    }

    // Convert database lead to Lead type for rule evaluation
    const leadData = Lead.transformToLeadType(lead);

    // Find matching assignment rules
    const matchingRules = await AssignmentRule.findMatchingRules(leadData);
    
    if (matchingRules.length === 0) {
      // No rules match, use default round-robin assignment
      return this.performRoundRobinAssignment(leadId, lead.assigned_to);
    }

    // Process rules in priority order
    for (const rule of matchingRules) {
      const assigneeId = await this.executeAssignmentRule(rule);
      if (assigneeId) {
        return this.performAssignment(
          leadId, 
          assigneeId, 
          `Rule-based assignment: ${rule.name}`, 
          rule.id,
          lead.assigned_to
        );
      }
    }

    // If no rule could assign, fall back to round-robin
    return this.performRoundRobinAssignment(leadId, lead.assigned_to);
  }

  /**
   * Execute a specific assignment rule and return the assigned user ID
   */
  private static async executeAssignmentRule(rule: any): Promise<string | null> {
    const actions = JSON.parse(rule.actions) as RuleAction[];
    
    for (const action of actions) {
      switch (action.type) {
        case 'assign_to_user':
          const userId = action.parameters['userId'];
          if (await this.isUserAvailable(userId, rule.working_hours)) {
            return userId;
          }
          break;
          
        case 'assign_to_team':
          const teamId = action.parameters['teamId'];
          const availableUser = await this.findAvailableUserInTeam(teamId, rule.working_hours);
          if (availableUser) {
            return availableUser;
          }
          break;
      }
    }
    
    return null;
  }

  /**
   * Perform round-robin assignment among active sales users
   */
  private static async performRoundRobinAssignment(leadId: string, currentAssignee?: string): Promise<AssignmentResult> {
    const salesUsers = await User.findByRole(UserRole.SALES);
    const activeUsers = salesUsers.filter(user => user.is_active);
    
    if (activeUsers.length === 0) {
      throw new BusinessLogicError('No active sales users available for assignment');
    }

    // Get workload information for all users
    const workloads = await Promise.all(
      activeUsers.map(user => this.getUserWorkload(user.id))
    );

    // Sort by workload score (ascending - least loaded first)
    workloads.sort((a, b) => a.workloadScore - b.workloadScore);
    
    if (workloads.length === 0) {
      throw new BusinessLogicError('No users available for assignment');
    }
    
    const assigneeId = workloads[0]!.userId;
    
    return this.performAssignment(
      leadId, 
      assigneeId, 
      'Round-robin assignment based on workload', 
      undefined,
      currentAssignee
    );
  }

  /**
   * Perform the actual assignment operation
   */
  private static async performAssignment(
    leadId: string, 
    assigneeId: string, 
    reason: string, 
    ruleId?: string,
    previousAssignee?: string
  ): Promise<AssignmentResult> {
    const now = new Date();
    
    // Update the lead assignment
    await Lead.update(leadId, {
      assigned_to: assigneeId,
      assigned_at: now,
      assignment_reason: reason
    });

    // Log the assignment activity
    await Activity.create({
      lead_id: leadId,
      type: previousAssignee ? ActivityType.LEAD_REASSIGNED : ActivityType.LEAD_ASSIGNED,
      subject: previousAssignee ? 'Lead reassigned' : 'Lead assigned',
      details: JSON.stringify({
        assignedTo: assigneeId,
        previousAssignee,
        reason,
        ruleId,
        assignedAt: now
      }),
      performed_by: 'system', // TODO: Get from context
      performed_at: now
    });

    return {
      leadId,
      assignedTo: assigneeId,
      assignmentReason: reason,
      ruleId,
      previousAssignee
    };
  }

  /**
   * Manually reassign a lead with reason logging
   */
  static async reassignLead(request: ReassignmentRequest): Promise<AssignmentResult> {
    const { leadId, newAssigneeId, reason, reassignedBy } = request;

    // Validate lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    // Validate new assignee
    const newAssignee = await User.findById(newAssigneeId);
    if (!newAssignee || !newAssignee.is_active) {
      throw new ValidationError('Invalid or inactive assignee');
    }

    // Validate reassigner has permission
    const reassigner = await User.findById(reassignedBy);
    if (!reassigner || ![UserRole.ADMIN, UserRole.MANAGER].includes(reassigner.role)) {
      throw new ValidationError('Insufficient permissions for reassignment');
    }

    const now = new Date();
    const previousAssignee = lead.assigned_to;

    // Update the lead assignment
    await Lead.update(leadId, {
      assigned_to: newAssigneeId,
      assigned_at: now,
      assignment_reason: `Manual reassignment: ${reason}`
    });

    // Log the reassignment activity
    await Activity.create({
      lead_id: leadId,
      type: ActivityType.LEAD_REASSIGNED,
      subject: 'Lead manually reassigned',
      details: JSON.stringify({
        assignedTo: newAssigneeId,
        previousAssignee,
        reason,
        reassignedBy,
        reassignedAt: now
      }),
      performed_by: reassignedBy,
      performed_at: now
    });

    return {
      leadId,
      assignedTo: newAssigneeId,
      assignmentReason: `Manual reassignment: ${reason}`,
      previousAssignee
    };
  }

  /**
   * Check if a user is available based on working hours
   */
  private static async isUserAvailable(userId: string, ruleWorkingHours?: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user || !user.is_active) {
      return false;
    }

    // If no working hours specified, assume available
    if (!ruleWorkingHours && !user.profile_working_hours) {
      return true;
    }

    const workingHours = ruleWorkingHours 
      ? JSON.parse(ruleWorkingHours) as WorkingHours
      : user.profile_working_hours 
        ? JSON.parse(user.profile_working_hours) as WorkingHours
        : null;

    if (!workingHours) {
      return true;
    }

    return this.isWithinWorkingHours(workingHours);
  }

  /**
   * Check if current time is within working hours
   */
  private static isWithinWorkingHours(workingHours: WorkingHours): boolean {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek] as keyof WorkingHours;
    
    const daySchedule = workingHours[dayName];
    
    if (typeof daySchedule === 'string' || !daySchedule.isWorkingDay || !daySchedule.startTime || !daySchedule.endTime) {
      return false;
    }

    const currentTime = now.toTimeString().slice(0, 5); // HH:mm format
    
    return currentTime >= daySchedule.startTime && currentTime <= daySchedule.endTime;
  }

  /**
   * Find an available user in a team
   */
  private static async findAvailableUserInTeam(teamId: string, ruleWorkingHours?: string): Promise<string | null> {
    // For now, we'll treat department as team
    const teamUsers = await User.findByDepartment(teamId);
    
    for (const user of teamUsers) {
      if (await this.isUserAvailable(user.id, ruleWorkingHours)) {
        return user.id;
      }
    }
    
    return null;
  }

  /**
   * Get workload information for a user
   */
  static async getUserWorkload(userId: string): Promise<WorkloadInfo> {
    // Count active leads assigned to user
    const activeLeads = await Lead.countByAssignee(userId);
    
    // Count overdue tasks (this would require Task model implementation)
    const overdueTasks = 0; // TODO: Implement when Task model is available
    
    // Calculate workload score (higher = more loaded)
    const workloadScore = activeLeads * 1.0 + overdueTasks * 2.0;
    
    return {
      userId,
      activeLeads,
      overdueTasks,
      workloadScore
    };
  }

  /**
   * Get workload information for all users
   */
  static async getAllUserWorkloads(): Promise<WorkloadInfo[]> {
    const salesUsers = await User.findByRole(UserRole.SALES);
    const workloads = await Promise.all(
      salesUsers.map(user => this.getUserWorkload(user.id))
    );
    
    return workloads.sort((a, b) => b.workloadScore - a.workloadScore);
  }

  /**
   * Check SLA compliance for a lead
   */
  static async checkSLACompliance(leadId: string): Promise<SLAStatus> {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    if (!lead.assigned_at) {
      throw new BusinessLogicError('Lead has not been assigned yet');
    }

    const assignedAt = new Date(lead.assigned_at);
    const now = new Date();
    const slaDeadline = new Date(assignedAt.getTime() + (this.DEFAULT_SLA_HOURS * 60 * 60 * 1000));
    
    const hoursElapsed = (now.getTime() - assignedAt.getTime()) / (1000 * 60 * 60);
    const hoursRemaining = this.DEFAULT_SLA_HOURS - hoursElapsed;
    const isOverdue = hoursRemaining < 0;
    
    // Determine escalation level
    let escalationLevel = 0;
    for (let i = 0; i < this.ESCALATION_LEVELS.length; i++) {
      const level = this.ESCALATION_LEVELS[i];
      if (level && hoursElapsed >= level) {
        escalationLevel = i + 1;
      }
    }

    return {
      leadId,
      assignedAt,
      slaDeadline,
      isOverdue,
      hoursRemaining: Math.max(0, hoursRemaining),
      escalationLevel
    };
  }

  /**
   * Get all leads that are overdue for SLA
   */
  static async getOverdueLeads(): Promise<SLAStatus[]> {
    const cutoffTime = new Date(Date.now() - (this.DEFAULT_SLA_HOURS * 60 * 60 * 1000));
    const overdueLeads = await Lead.findOverdueLeads(cutoffTime);
    
    const slaStatuses = await Promise.all(
      overdueLeads.map(lead => this.checkSLACompliance(lead.id))
    );
    
    return slaStatuses.filter(status => status.isOverdue);
  }

  /**
   * Escalate overdue leads to managers
   */
  static async escalateOverdueLeads(): Promise<void> {
    const overdueLeads = await this.getOverdueLeads();
    
    for (const slaStatus of overdueLeads) {
      await this.escalateLead(slaStatus);
    }
  }

  /**
   * Escalate a specific lead based on its SLA status
   */
  private static async escalateLead(slaStatus: SLAStatus): Promise<void> {
    const lead = await Lead.findById(slaStatus.leadId);
    if (!lead || !lead.assigned_to) {
      return;
    }

    // Find the assignee's manager
    const assignee = await User.findById(lead.assigned_to);
    if (!assignee) {
      return;
    }

    // For now, escalate to any manager in the same department
    const managers = await User.findManagersByDepartment(assignee.profile_department);
    
    if (managers.length === 0) {
      return;
    }

    // Log escalation activity
    await Activity.create({
      lead_id: slaStatus.leadId,
      type: ActivityType.LEAD_ASSIGNED, // We might need a new type for escalation
      subject: `Lead escalated - SLA breach (Level ${slaStatus.escalationLevel})`,
      details: JSON.stringify({
        escalationLevel: slaStatus.escalationLevel,
        hoursOverdue: Math.abs(slaStatus.hoursRemaining),
        originalAssignee: lead.assigned_to,
        escalatedTo: managers.map(m => m.id),
        escalatedAt: new Date()
      }),
      performed_by: 'system',
      performed_at: new Date()
    });

    // TODO: Send notifications to managers
    // This would be implemented when notification service is available
  }

  /**
   * Get assignment statistics
   */
  static async getAssignmentStatistics(): Promise<{
    totalAssignments: number;
    assignmentsByRule: Record<string, number>;
    assignmentsByUser: Record<string, number>;
    averageAssignmentTime: number;
    slaComplianceRate: number;
  }> {
    // This would require more complex queries
    // For now, return basic structure
    return {
      totalAssignments: 0,
      assignmentsByRule: {},
      assignmentsByUser: {},
      averageAssignmentTime: 0,
      slaComplianceRate: 0
    };
  }
}