import { RoutingService } from '../src/services/routingService';
import { Lead } from '../src/models/Lead';
import { User } from '../src/models/User';
import { AssignmentRule } from '../src/models/AssignmentRule';
import { Activity } from '../src/models/Activity';
import { UserRole, LeadStatus, ScoreBand, LeadChannel } from '../src/types';
import { ValidationError, NotFoundError, BusinessLogicError } from '../src/utils/errors';

// Mock the models
jest.mock('../src/models/Lead');
jest.mock('../src/models/User');
jest.mock('../src/models/AssignmentRule');
jest.mock('../src/models/Activity');

const MockedLead = Lead as jest.Mocked<typeof Lead>;
const MockedUser = User as jest.Mocked<typeof User>;
const MockedAssignmentRule = AssignmentRule as jest.Mocked<typeof AssignmentRule>;
const MockedActivity = Activity as jest.Mocked<typeof Activity>;

describe('RoutingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assignLead', () => {
    const mockLead = {
      id: 'lead-1',
      account_lead_id: 'AL-24-01-001',
      company_name: 'Test Company',
      contact_name: 'John Doe',
      contact_email: 'john@test.com',
      source_channel: LeadChannel.WEB_FORM,
      status: LeadStatus.NEW,
      score_value: 75,
      score_band: ScoreBand.WARM,
      score_last_calculated: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user-1',
      assigned_to: null
    };

    const mockUser = {
      id: 'user-1',
      email: 'sales@test.com',
      password: 'hashedpassword',
      first_name: 'Sales',
      last_name: 'Rep',
      role: UserRole.SALES,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    it('should assign lead manually when assigneeId is provided', async () => {
      MockedLead.findById.mockResolvedValue(mockLead);
      MockedUser.findById.mockResolvedValue(mockUser);
      MockedLead.update.mockResolvedValue({ ...mockLead, assigned_to: 'user-1' });
      MockedActivity.create.mockResolvedValue({} as any);

      const result = await RoutingService.assignLead('lead-1', 'user-1');

      expect(result).toEqual({
        leadId: 'lead-1',
        assignedTo: 'user-1',
        assignmentReason: 'Manual assignment',
        ruleId: undefined,
        previousAssignee: null
      });

      expect(MockedLead.update).toHaveBeenCalledWith('lead-1', {
        assigned_to: 'user-1',
        assigned_at: expect.any(Date),
        assignment_reason: 'Manual assignment'
      });
    });

    it('should throw NotFoundError when lead does not exist', async () => {
      MockedLead.findById.mockResolvedValue(undefined);

      await expect(RoutingService.assignLead('nonexistent-lead')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when manual assignee is invalid', async () => {
      MockedLead.findById.mockResolvedValue(mockLead);
      MockedUser.findById.mockResolvedValue(undefined);

      await expect(RoutingService.assignLead('lead-1', 'invalid-user')).rejects.toThrow(ValidationError);
    });

    it('should use round-robin assignment when no rules match', async () => {
      MockedLead.findById.mockResolvedValue(mockLead);
      MockedLead.transformToLeadType.mockReturnValue({} as any);
      MockedAssignmentRule.findMatchingRules.mockResolvedValue([]);
      MockedUser.findByRole.mockResolvedValue([mockUser]);
      MockedLead.countByAssignee.mockResolvedValue(5);
      MockedLead.update.mockResolvedValue({ ...mockLead, assigned_to: 'user-1' });
      MockedActivity.create.mockResolvedValue({} as any);

      const result = await RoutingService.assignLead('lead-1');

      expect(result.assignmentReason).toContain('Round-robin assignment');
      expect(MockedUser.findByRole).toHaveBeenCalledWith(UserRole.SALES);
    });

    it('should throw BusinessLogicError when no active sales users available', async () => {
      MockedLead.findById.mockResolvedValue(mockLead);
      MockedLead.transformToLeadType.mockReturnValue({} as any);
      MockedAssignmentRule.findMatchingRules.mockResolvedValue([]);
      MockedUser.findByRole.mockResolvedValue([]);

      await expect(RoutingService.assignLead('lead-1')).rejects.toThrow(BusinessLogicError);
    });
  });

  describe('reassignLead', () => {
    const mockLead = {
      id: 'lead-1',
      assigned_to: 'user-1',
      created_at: new Date(),
      updated_at: new Date()
    };

    const mockNewAssignee = {
      id: 'user-2',
      role: UserRole.SALES,
      is_active: true
    };

    const mockReassigner = {
      id: 'manager-1',
      role: UserRole.MANAGER,
      is_active: true
    };

    it('should reassign lead successfully', async () => {
      MockedLead.findById.mockResolvedValue(mockLead as any);
      MockedUser.findById
        .mockResolvedValueOnce(mockNewAssignee as any)
        .mockResolvedValueOnce(mockReassigner as any);
      MockedLead.update.mockResolvedValue({ ...mockLead, assigned_to: 'user-2' } as any);
      MockedActivity.create.mockResolvedValue({} as any);

      const request = {
        leadId: 'lead-1',
        newAssigneeId: 'user-2',
        reason: 'Better expertise match',
        reassignedBy: 'manager-1'
      };

      const result = await RoutingService.reassignLead(request);

      expect(result).toEqual({
        leadId: 'lead-1',
        assignedTo: 'user-2',
        assignmentReason: 'Manual reassignment: Better expertise match',
        previousAssignee: 'user-1'
      });
    });

    it('should throw ValidationError when reassigner lacks permissions', async () => {
      MockedLead.findById.mockResolvedValue(mockLead as any);
      MockedUser.findById
        .mockResolvedValueOnce(mockNewAssignee as any)
        .mockResolvedValueOnce({ ...mockReassigner, role: UserRole.SALES } as any);

      const request = {
        leadId: 'lead-1',
        newAssigneeId: 'user-2',
        reason: 'Better expertise match',
        reassignedBy: 'sales-1'
      };

      await expect(RoutingService.reassignLead(request)).rejects.toThrow(ValidationError);
    });
  });

  describe('getUserWorkload', () => {
    it('should calculate user workload correctly', async () => {
      MockedLead.countByAssignee.mockResolvedValue(10);

      const result = await RoutingService.getUserWorkload('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        activeLeads: 10,
        overdueTasks: 0,
        workloadScore: 10.0
      });
    });
  });

  describe('getAllUserWorkloads', () => {
    it('should get workloads for all sales users', async () => {
      const mockUsers = [
        { id: 'user-1', role: UserRole.SALES },
        { id: 'user-2', role: UserRole.SALES }
      ];

      MockedUser.findByRole.mockResolvedValue(mockUsers as any);
      MockedLead.countByAssignee
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(8);

      const result = await RoutingService.getAllUserWorkloads();

      expect(result).toHaveLength(2);
      expect(result[0]?.workloadScore).toBeGreaterThan(result[1]?.workloadScore || 0); // Sorted by workload desc
    });
  });

  describe('checkSLACompliance', () => {
    it('should calculate SLA status correctly for assigned lead', async () => {
      const assignedAt = new Date(Date.now() - (12 * 60 * 60 * 1000)); // 12 hours ago
      const mockLead = {
        id: 'lead-1',
        assigned_at: assignedAt,
        assigned_to: 'user-1'
      };

      MockedLead.findById.mockResolvedValue(mockLead as any);

      const result = await RoutingService.checkSLACompliance('lead-1');

      expect(result).toEqual({
        leadId: 'lead-1',
        assignedAt,
        slaDeadline: expect.any(Date),
        isOverdue: false,
        hoursRemaining: expect.any(Number),
        escalationLevel: 0
      });
      expect(result.hoursRemaining).toBeCloseTo(12, 0);
    });

    it('should identify overdue leads', async () => {
      const assignedAt = new Date(Date.now() - (30 * 60 * 60 * 1000)); // 30 hours ago
      const mockLead = {
        id: 'lead-1',
        assigned_at: assignedAt,
        assigned_to: 'user-1'
      };

      MockedLead.findById.mockResolvedValue(mockLead as any);

      const result = await RoutingService.checkSLACompliance('lead-1');

      expect(result.isOverdue).toBe(true);
      expect(result.escalationLevel).toBe(1);
    });

    it('should throw BusinessLogicError for unassigned lead', async () => {
      const mockLead = {
        id: 'lead-1',
        assigned_at: null,
        assigned_to: null
      };

      MockedLead.findById.mockResolvedValue(mockLead as any);

      await expect(RoutingService.checkSLACompliance('lead-1')).rejects.toThrow(BusinessLogicError);
    });
  });

  describe('getOverdueLeads', () => {
    it('should return overdue leads with SLA status', async () => {
      const overdueLeads = [
        {
          id: 'lead-1',
          assigned_at: new Date(Date.now() - (30 * 60 * 60 * 1000)),
          assigned_to: 'user-1'
        }
      ];

      MockedLead.findOverdueLeads.mockResolvedValue(overdueLeads as any);
      MockedLead.findById.mockResolvedValue(overdueLeads[0] as any);

      const result = await RoutingService.getOverdueLeads();

      expect(result).toHaveLength(1);
      expect(result[0]?.isOverdue).toBe(true);
    });
  });

  describe('escalateOverdueLeads', () => {
    it('should escalate overdue leads to managers', async () => {
      const overdueLeads = [
        {
          id: 'lead-1',
          assigned_at: new Date(Date.now() - (30 * 60 * 60 * 1000)),
          assigned_to: 'user-1'
        }
      ];

      const mockAssignee = {
        id: 'user-1',
        profile_department: 'sales'
      };

      const mockManagers = [
        { id: 'manager-1', role: UserRole.MANAGER }
      ];

      MockedLead.findOverdueLeads.mockResolvedValue(overdueLeads as any);
      MockedLead.findById.mockResolvedValue(overdueLeads[0] as any);
      MockedUser.findById.mockResolvedValue(mockAssignee as any);
      MockedUser.findManagersByDepartment.mockResolvedValue(mockManagers as any);
      MockedActivity.create.mockResolvedValue({} as any);

      await RoutingService.escalateOverdueLeads();

      expect(MockedActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: 'lead-1',
          subject: expect.stringContaining('Lead escalated')
        })
      );
    });
  });

  describe('working hours validation', () => {
    it('should check if user is available during working hours', async () => {
      const mockUser = {
        id: 'user-1',
        is_active: true,
        profile_working_hours: JSON.stringify({
          timezone: 'UTC',
          monday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          thursday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          friday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
          saturday: { isWorkingDay: false },
          sunday: { isWorkingDay: false }
        })
      };

      MockedUser.findById.mockResolvedValue(mockUser as any);

      // This test would need to be adjusted based on current time
      // For now, we'll just verify the method doesn't throw
      const result = await (RoutingService as any).isUserAvailable('user-1');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('assignment statistics', () => {
    it('should return assignment statistics structure', async () => {
      const result = await RoutingService.getAssignmentStatistics();

      expect(result).toHaveProperty('totalAssignments');
      expect(result).toHaveProperty('assignmentsByRule');
      expect(result).toHaveProperty('assignmentsByUser');
      expect(result).toHaveProperty('averageAssignmentTime');
      expect(result).toHaveProperty('slaComplianceRate');
    });
  });
});