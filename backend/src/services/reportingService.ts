import db from '../config/database';
import { LeadStatus, LeadChannel } from '../types';

export interface FunnelMetrics {
  stage: LeadStatus;
  count: number;
  conversionRate: number;
  averageTimeInStage: number; // in days
}

export interface TimeToFirstTouchReport {
  averageTimeToFirstTouch: number; // in hours
  medianTimeToFirstTouch: number; // in hours
  bySource: Array<{
    source: LeadChannel;
    averageTime: number;
    medianTime: number;
  }>;
  byAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    averageTime: number;
    medianTime: number;
  }>;
}

export interface SLAComplianceReport {
  overallCompliance: number; // percentage
  totalLeads: number;
  compliantLeads: number;
  breachedLeads: number;
  averageResponseTime: number; // in hours
  byAssignee: Array<{
    assigneeId: string;
    assigneeName: string;
    compliance: number;
    totalLeads: number;
    compliantLeads: number;
    averageResponseTime: number;
  }>;
  bySource: Array<{
    source: LeadChannel;
    compliance: number;
    totalLeads: number;
    compliantLeads: number;
    averageResponseTime: number;
  }>;
}

export interface SourceEffectivenessReport {
  source: LeadChannel;
  totalLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  qualificationRate: number;
  conversionRate: number;
  costPerLead?: number;
  costPerConversion?: number;
  averageScore: number;
  averageTimeToConversion: number; // in days
}

export interface SalesRepPerformanceReport {
  assigneeId: string;
  assigneeName: string;
  totalLeads: number;
  activeLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  qualificationRate: number;
  conversionRate: number;
  averageScore: number;
  averageTimeToFirstTouch: number; // in hours
  averageTimeToConversion: number; // in days
  tasksCompleted: number;
  tasksOverdue: number;
  activitiesLogged: number;
  slaCompliance: number;
}

export interface DataQualityReport {
  totalLeads: number;
  duplicateLeads: number;
  duplicateRate: number;
  missingFields: Array<{
    field: string;
    missingCount: number;
    missingRate: number;
  }>;
  invalidEmails: number;
  invalidPhones: number;
  dataCompletenessScore: number; // percentage
  duplicateGroups: Array<{
    groupId: string;
    leads: Array<{
      id: string;
      accountLeadId: string;
      companyName: string;
      contactEmail: string;
      similarity: number;
    }>;
  }>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class ReportingService {
  /**
   * Generate funnel metrics showing conversion rates at each stage
   */
  static async getFunnelMetrics(dateRange?: DateRange): Promise<FunnelMetrics[]> {
    let query = db('leads')
      .select('status')
      .count('* as count')
      .where('is_active', true)
      .groupBy('status');

    if (dateRange) {
      query = query.whereBetween('created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const statusCounts = await query;
    const totalLeads = statusCounts.reduce((sum: number, item: any) => sum + parseInt(item.count as string), 0);

    // Calculate average time in stage using activities
    const timeInStageQuery = db('activities')
      .select(
        'activities.lead_id',
        'leads.status',
        db.raw('MIN(activities.performed_at) as first_activity'),
        db.raw('MAX(activities.performed_at) as last_activity')
      )
      .join('leads', 'leads.id', 'activities.lead_id')
      .where('leads.is_active', true)
      .where('activities.type', 'status_change');

    if (dateRange) {
      timeInStageQuery.whereBetween('leads.created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const timeInStageData = await timeInStageQuery
      .groupBy('activities.lead_id', 'leads.status');

    const stageTimeMap = new Map<string, number[]>();
    
    timeInStageData.forEach((item: any) => {
      const status = item.status;
      const timeInStage = item.last_activity && item.first_activity ? 
        (new Date(item.last_activity).getTime() - new Date(item.first_activity).getTime()) / (1000 * 60 * 60 * 24) : 0;
      
      if (!stageTimeMap.has(status)) {
        stageTimeMap.set(status, []);
      }
      stageTimeMap.get(status)!.push(timeInStage);
    });

    return statusCounts.map((item: any) => {
      const count = parseInt(item.count as string);
      const status = item.status as LeadStatus;
      const stageTimes = stageTimeMap.get(status) || [];
      const averageTimeInStage = stageTimes.length > 0 ? 
        stageTimes.reduce((sum, time) => sum + time, 0) / stageTimes.length : 0;
      
      return {
        stage: status,
        count,
        conversionRate: totalLeads > 0 ? (count / totalLeads) * 100 : 0,
        averageTimeInStage
      };
    });
  }

  /**
   * Generate time-to-first-touch report
   */
  static async getTimeToFirstTouchReport(dateRange?: DateRange): Promise<TimeToFirstTouchReport> {
    let baseQuery = db('leads')
      .select(
        'leads.id',
        'leads.source_channel',
        'leads.assigned_to',
        'leads.created_at',
        'leads.assigned_at',
        'users.first_name',
        'users.last_name'
      )
      .leftJoin('users', 'users.id', 'leads.assigned_to')
      .whereNotNull('leads.assigned_at')
      .where('leads.is_active', true);

    if (dateRange) {
      baseQuery = baseQuery.whereBetween('leads.created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const leads = await baseQuery;

    if (leads.length === 0) {
      return {
        averageTimeToFirstTouch: 0,
        medianTimeToFirstTouch: 0,
        bySource: [],
        byAssignee: []
      };
    }

    // Calculate time differences in hours
    const timeToFirstTouch = leads.map((lead: any) => {
      const createdAt = new Date(lead.created_at);
      const assignedAt = new Date(lead.assigned_at);
      return {
        ...lead,
        timeToFirstTouch: (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60) // hours
      };
    });

    const times = timeToFirstTouch.map((item: any) => item.timeToFirstTouch);
    const averageTime = times.reduce((sum: number, time: number) => sum + time, 0) / times.length;
    const sortedTimes = times.sort((a: number, b: number) => a - b);
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

    // Group by source
    const bySourceMap = new Map<string, number[]>();
    timeToFirstTouch.forEach((item: any) => {
      const source = item.source_channel || 'Unknown';
      if (!bySourceMap.has(source)) {
        bySourceMap.set(source, []);
      }
      bySourceMap.get(source)!.push(item.timeToFirstTouch);
    });

    const bySource = Array.from(bySourceMap.entries()).map(([source, times]) => {
      const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const sortedSourceTimes = times.sort((a, b) => a - b);
      const medianSourceTime = sortedSourceTimes[Math.floor(sortedSourceTimes.length / 2)] || 0;
      
      return {
        source: source as LeadChannel,
        averageTime: avgTime,
        medianTime: medianSourceTime
      };
    });

    // Group by assignee
    const byAssigneeMap = new Map<string, { times: number[], name: string }>();
    timeToFirstTouch.forEach((item: any) => {
      const assigneeId = item.assigned_to;
      const assigneeName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Unknown';
      
      if (!byAssigneeMap.has(assigneeId)) {
        byAssigneeMap.set(assigneeId, { times: [], name: assigneeName });
      }
      byAssigneeMap.get(assigneeId)!.times.push(item.timeToFirstTouch);
    });

    const byAssignee = Array.from(byAssigneeMap.entries()).map(([assigneeId, data]) => {
      const avgTime = data.times.reduce((sum, time) => sum + time, 0) / data.times.length;
      const sortedAssigneeTimes = data.times.sort((a, b) => a - b);
      const medianAssigneeTime = sortedAssigneeTimes[Math.floor(sortedAssigneeTimes.length / 2)] || 0;
      
      return {
        assigneeId,
        assigneeName: data.name,
        averageTime: avgTime,
        medianTime: medianAssigneeTime
      };
    });

    return {
      averageTimeToFirstTouch: averageTime || 0,
      medianTimeToFirstTouch: medianTime || 0,
      bySource,
      byAssignee
    };
  }

  /**
   * Generate SLA compliance report
   */
  static async getSLAComplianceReport(slaHours: number = 24, dateRange?: DateRange): Promise<SLAComplianceReport> {
    let baseQuery = db('leads')
      .select(
        'leads.id',
        'leads.source_channel',
        'leads.assigned_to',
        'leads.created_at',
        'leads.assigned_at',
        'users.first_name',
        'users.last_name'
      )
      .leftJoin('users', 'users.id', 'leads.assigned_to')
      .whereNotNull('leads.assigned_at')
      .where('leads.is_active', true);

    if (dateRange) {
      baseQuery = baseQuery.whereBetween('leads.created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const leads = await baseQuery;

    if (leads.length === 0) {
      return {
        overallCompliance: 100,
        totalLeads: 0,
        compliantLeads: 0,
        breachedLeads: 0,
        averageResponseTime: 0,
        byAssignee: [],
        bySource: []
      };
    }

    const leadsWithCompliance = leads.map((lead: any) => {
      const createdAt = new Date(lead.created_at);
      const assignedAt = new Date(lead.assigned_at);
      const responseTimeHours = (assignedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      
      return {
        ...lead,
        responseTimeHours,
        isCompliant: responseTimeHours <= slaHours
      };
    });

    const totalLeads = leadsWithCompliance.length;
    const compliantLeads = leadsWithCompliance.filter((lead: any) => lead.isCompliant).length;
    const averageResponseTime = leadsWithCompliance.reduce((sum: number, lead: any) => sum + lead.responseTimeHours, 0) / totalLeads;

    // Group by assignee
    const byAssigneeMap = new Map<string, { leads: any[], name: string }>();
    leadsWithCompliance.forEach((lead: any) => {
      const assigneeId = lead.assigned_to;
      const assigneeName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown';
      
      if (!byAssigneeMap.has(assigneeId)) {
        byAssigneeMap.set(assigneeId, { leads: [], name: assigneeName });
      }
      byAssigneeMap.get(assigneeId)!.leads.push(lead);
    });

    const byAssignee = Array.from(byAssigneeMap.entries()).map(([assigneeId, data]) => {
      const assigneeLeads = data.leads;
      const assigneeCompliantLeads = assigneeLeads.filter(lead => lead.isCompliant).length;
      const assigneeAvgResponseTime = assigneeLeads.reduce((sum, lead) => sum + lead.responseTimeHours, 0) / assigneeLeads.length;
      
      return {
        assigneeId,
        assigneeName: data.name,
        compliance: (assigneeCompliantLeads / assigneeLeads.length) * 100,
        totalLeads: assigneeLeads.length,
        compliantLeads: assigneeCompliantLeads,
        averageResponseTime: assigneeAvgResponseTime
      };
    });

    // Group by source
    const bySourceMap = new Map<string, any[]>();
    leadsWithCompliance.forEach((lead: any) => {
      const source = lead.source_channel || 'Unknown';
      if (!bySourceMap.has(source)) {
        bySourceMap.set(source, []);
      }
      bySourceMap.get(source)!.push(lead);
    });

    const bySource = Array.from(bySourceMap.entries()).map(([source, sourceLeads]) => {
      const sourceCompliantLeads = sourceLeads.filter(lead => lead.isCompliant).length;
      const sourceAvgResponseTime = sourceLeads.reduce((sum, lead) => sum + lead.responseTimeHours, 0) / sourceLeads.length;
      
      return {
        source: source as LeadChannel,
        compliance: (sourceCompliantLeads / sourceLeads.length) * 100,
        totalLeads: sourceLeads.length,
        compliantLeads: sourceCompliantLeads,
        averageResponseTime: sourceAvgResponseTime
      };
    });

    return {
      overallCompliance: (compliantLeads / totalLeads) * 100,
      totalLeads,
      compliantLeads,
      breachedLeads: totalLeads - compliantLeads,
      averageResponseTime,
      byAssignee,
      bySource
    };
  }

  /**
   * Generate source effectiveness report
   */
  static async getSourceEffectivenessReport(dateRange?: DateRange): Promise<SourceEffectivenessReport[]> {
    let baseQuery = db('leads')
      .select(
        'source_channel',
        db.raw('COUNT(*) as total_leads'),
        db.raw('COUNT(CASE WHEN status IN (?, ?, ?, ?) THEN 1 END) as qualified_leads', 
          [LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION, LeadStatus.WON]),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as converted_leads', [LeadStatus.WON]),
        db.raw('AVG(score_value) as avg_score')
      )
      .where('is_active', true)
      .groupBy('source_channel');

    if (dateRange) {
      baseQuery = baseQuery.whereBetween('created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const results = await baseQuery;

    // Calculate average time to conversion for each source
    let conversionTimeQuery = db('leads')
      .select(
        'source_channel',
        'created_at',
        'updated_at'
      )
      .where('status', LeadStatus.WON)
      .where('is_active', true);

    if (dateRange) {
      conversionTimeQuery = conversionTimeQuery.whereBetween('created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const conversionTimes = await conversionTimeQuery;
    
    const conversionTimeMap = new Map<string, number[]>();
    conversionTimes.forEach((item: any) => {
      const source = item.source_channel || 'Unknown';
      const timeToConversion = (new Date(item.updated_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24); // days
      
      if (!conversionTimeMap.has(source)) {
        conversionTimeMap.set(source, []);
      }
      conversionTimeMap.get(source)!.push(timeToConversion);
    });

    return results.map((result: any) => {
      const source = result.source_channel as LeadChannel;
      const totalLeads = parseInt(result.total_leads);
      const qualifiedLeads = parseInt(result.qualified_leads);
      const convertedLeads = parseInt(result.converted_leads);
      
      const conversionTimes = conversionTimeMap.get(source) || [];
      const averageTimeToConversion = conversionTimes.length > 0 ? 
        conversionTimes.reduce((sum, time) => sum + time, 0) / conversionTimes.length : 0;

      return {
        source,
        totalLeads,
        qualifiedLeads,
        convertedLeads,
        qualificationRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
        conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
        costPerLead: 0, // Would need cost data from campaigns
        costPerConversion: 0, // Would need cost data from campaigns
        averageScore: parseFloat(result.avg_score) || 0,
        averageTimeToConversion
      };
    });
  }

  /**
   * Generate sales representative performance report
   */
  static async getSalesRepPerformanceReport(dateRange?: DateRange): Promise<SalesRepPerformanceReport[]> {
    let baseQuery = db('leads')
      .select(
        'assigned_to',
        'users.first_name',
        'users.last_name',
        db.raw('COUNT(*) as total_leads'),
        db.raw('COUNT(CASE WHEN leads.status NOT IN (?, ?, ?) THEN 1 END) as active_leads', 
          [LeadStatus.WON, LeadStatus.LOST, LeadStatus.DISQUALIFIED]),
        db.raw('COUNT(CASE WHEN leads.status IN (?, ?, ?, ?) THEN 1 END) as qualified_leads', 
          [LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION, LeadStatus.WON]),
        db.raw('COUNT(CASE WHEN leads.status = ? THEN 1 END) as converted_leads', [LeadStatus.WON]),
        db.raw('AVG(leads.score_value) as avg_score')
      )
      .leftJoin('users', 'users.id', 'leads.assigned_to')
      .whereNotNull('assigned_to')
      .where('leads.is_active', true)
      .groupBy('assigned_to', 'users.first_name', 'users.last_name');

    if (dateRange) {
      baseQuery = baseQuery.whereBetween('leads.created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const leadResults = await baseQuery;

    // Get task statistics for each assignee
    let taskQuery = db('tasks')
      .select(
        'assigned_to',
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as completed_tasks', ['completed']),
        db.raw('COUNT(CASE WHEN status != ? AND due_date < NOW() THEN 1 END) as overdue_tasks', ['completed'])
      )
      .groupBy('assigned_to');

    if (dateRange) {
      taskQuery = taskQuery.whereBetween('created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const taskResults = await taskQuery;
    const taskMap = new Map(taskResults.map((task: any) => [task.assigned_to, task]));

    // Get activity statistics for each assignee
    let activityQuery = db('activities')
      .select(
        'performed_by',
        db.raw('COUNT(*) as activities_logged')
      )
      .groupBy('performed_by');

    if (dateRange) {
      activityQuery = activityQuery.whereBetween('performed_at', [dateRange.startDate, dateRange.endDate]);
    }

    const activityResults = await activityQuery;
    const activityMap = new Map(activityResults.map((activity: any) => [activity.performed_by, activity]));

    // Get time-to-first-touch for each assignee
    let timeToFirstTouchQuery = db('leads')
      .select(
        'assigned_to',
        'created_at',
        'assigned_at'
      )
      .whereNotNull('assigned_at')
      .where('is_active', true);

    if (dateRange) {
      timeToFirstTouchQuery = timeToFirstTouchQuery.whereBetween('created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const timeToFirstTouchResults = await timeToFirstTouchQuery;
    const timeToFirstTouchMap = new Map<string, number[]>();
    
    timeToFirstTouchResults.forEach((item: any) => {
      const assigneeId = item.assigned_to;
      const timeToFirstTouch = (new Date(item.assigned_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60); // hours
      
      if (!timeToFirstTouchMap.has(assigneeId)) {
        timeToFirstTouchMap.set(assigneeId, []);
      }
      timeToFirstTouchMap.get(assigneeId)!.push(timeToFirstTouch);
    });

    // Get time-to-conversion for each assignee
    let timeToConversionQuery = db('leads')
      .select(
        'assigned_to',
        'created_at',
        'updated_at'
      )
      .where('status', LeadStatus.WON)
      .where('is_active', true);

    if (dateRange) {
      timeToConversionQuery = timeToConversionQuery.whereBetween('created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const timeToConversionResults = await timeToConversionQuery;
    const timeToConversionMap = new Map<string, number[]>();
    
    timeToConversionResults.forEach((item: any) => {
      const assigneeId = item.assigned_to;
      const timeToConversion = (new Date(item.updated_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24); // days
      
      if (!timeToConversionMap.has(assigneeId)) {
        timeToConversionMap.set(assigneeId, []);
      }
      timeToConversionMap.get(assigneeId)!.push(timeToConversion);
    });

    // Calculate SLA compliance for each assignee (using 24 hours as default)
    const slaHours = 24;
    const slaComplianceMap = new Map<string, number>();
    
    timeToFirstTouchResults.forEach((item: any) => {
      const assigneeId = item.assigned_to;
      const timeToFirstTouch = (new Date(item.assigned_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60); // hours
      const isCompliant = timeToFirstTouch <= slaHours;
      
      if (!slaComplianceMap.has(assigneeId)) {
        slaComplianceMap.set(assigneeId, 0);
      }
      
      const currentCompliance = slaComplianceMap.get(assigneeId)!;
      slaComplianceMap.set(assigneeId, currentCompliance + (isCompliant ? 1 : 0));
    });

    return leadResults.map((result: any) => {
      const assigneeId = result.assigned_to;
      const totalLeads = parseInt(result.total_leads);
      const qualifiedLeads = parseInt(result.qualified_leads);
      const convertedLeads = parseInt(result.converted_leads);

      const taskData = taskMap.get(assigneeId);
      const activityData = activityMap.get(assigneeId);
      
      const timeToFirstTouchTimes = timeToFirstTouchMap.get(assigneeId) || [];
      const averageTimeToFirstTouch = timeToFirstTouchTimes.length > 0 ? 
        timeToFirstTouchTimes.reduce((sum, time) => sum + time, 0) / timeToFirstTouchTimes.length : 0;

      const timeToConversionTimes = timeToConversionMap.get(assigneeId) || [];
      const averageTimeToConversion = timeToConversionTimes.length > 0 ? 
        timeToConversionTimes.reduce((sum, time) => sum + time, 0) / timeToConversionTimes.length : 0;

      const compliantLeads = slaComplianceMap.get(assigneeId) || 0;
      const slaCompliance = timeToFirstTouchTimes.length > 0 ? (compliantLeads / timeToFirstTouchTimes.length) * 100 : 100;

      return {
        assigneeId,
        assigneeName: `${result.first_name} ${result.last_name}`,
        totalLeads,
        activeLeads: parseInt(result.active_leads),
        qualifiedLeads,
        convertedLeads,
        qualificationRate: totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0,
        conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
        averageScore: parseFloat(result.avg_score) || 0,
        averageTimeToFirstTouch,
        averageTimeToConversion,
        tasksCompleted: parseInt(taskData?.completed_tasks || '0'),
        tasksOverdue: parseInt(taskData?.overdue_tasks || '0'),
        activitiesLogged: parseInt(activityData?.activities_logged || '0'),
        slaCompliance
      };
    });
  }

  /**
   * Generate data quality report
   */
  static async getDataQualityReport(dateRange?: DateRange): Promise<DataQualityReport> {
    let baseQuery = db('leads').where('is_active', true);

    if (dateRange) {
      baseQuery = baseQuery.whereBetween('created_at', [dateRange.startDate, dateRange.endDate]);
    }

    const totalLeads = await baseQuery.clone().count('* as count').first();
    const totalCount = parseInt(totalLeads?.['count'] as string) || 0;

    // Check for missing fields
    const missingFieldsQuery = await baseQuery.clone()
      .select(
        db.raw('COUNT(CASE WHEN contact_phone IS NULL AND contact_mobile IS NULL THEN 1 END) as missing_phone'),
        db.raw('COUNT(CASE WHEN company_industry IS NULL THEN 1 END) as missing_industry'),
        db.raw('COUNT(CASE WHEN company_size IS NULL THEN 1 END) as missing_company_size'),
        db.raw('COUNT(CASE WHEN source_channel IS NULL THEN 1 END) as missing_source'),
        db.raw('COUNT(CASE WHEN assigned_to IS NULL THEN 1 END) as missing_assignment')
      )
      .first();

    const missingFields = [
      { field: 'phone', missingCount: parseInt(missingFieldsQuery?.['missing_phone'] as string) || 0 },
      { field: 'industry', missingCount: parseInt(missingFieldsQuery?.['missing_industry'] as string) || 0 },
      { field: 'company_size', missingCount: parseInt(missingFieldsQuery?.['missing_company_size'] as string) || 0 },
      { field: 'source', missingCount: parseInt(missingFieldsQuery?.['missing_source'] as string) || 0 },
      { field: 'assignment', missingCount: parseInt(missingFieldsQuery?.['missing_assignment'] as string) || 0 }
    ].map(field => ({
      ...field,
      missingRate: totalCount > 0 ? (field.missingCount / totalCount) * 100 : 0
    }));

    // Check for invalid emails and phones
    const invalidDataQuery = await baseQuery.clone()
      .select(
        db.raw('COUNT(CASE WHEN contact_email IS NOT NULL AND contact_email NOT LIKE \'%@%.%\' THEN 1 END) as invalid_emails'),
        db.raw('COUNT(CASE WHEN contact_phone IS NOT NULL AND LENGTH(REGEXP_REPLACE(contact_phone, \'[^0-9]\', \'\')) < 10 THEN 1 END) as invalid_phones')
      )
      .first();

    const invalidEmails = parseInt(invalidDataQuery?.['invalid_emails'] as string) || 0;
    const invalidPhones = parseInt(invalidDataQuery?.['invalid_phones'] as string) || 0;

    // Find potential duplicates based on email and phone
    const duplicateEmailQuery = await baseQuery.clone()
      .select('contact_email')
      .whereNotNull('contact_email')
      .groupBy('contact_email')
      .havingRaw('COUNT(*) > 1');

    const duplicatePhoneQuery = await baseQuery.clone()
      .select('contact_phone')
      .whereNotNull('contact_phone')
      .groupBy('contact_phone')
      .havingRaw('COUNT(*) > 1');

    const duplicateEmails = duplicateEmailQuery.length;
    const duplicatePhones = duplicatePhoneQuery.length;
    const estimatedDuplicates = Math.max(duplicateEmails, duplicatePhones);

    // Get detailed duplicate groups for top duplicates
    const duplicateGroups: any[] = [];
    
    if (duplicateEmailQuery.length > 0) {
      const topDuplicateEmails = duplicateEmailQuery.slice(0, 5); // Top 5 duplicate groups
      
      for (const emailGroup of topDuplicateEmails) {
        const duplicateLeads = await baseQuery.clone()
          .select('id', 'account_lead_id', 'company_name', 'contact_email')
          .where('contact_email', emailGroup.contact_email)
          .limit(10);

        if (duplicateLeads.length > 1) {
          duplicateGroups.push({
            groupId: `email-${emailGroup.contact_email}`,
            leads: duplicateLeads.map((lead: any) => ({
              id: lead.id,
              accountLeadId: lead.account_lead_id,
              companyName: lead.company_name,
              contactEmail: lead.contact_email,
              similarity: 100 // Same email = 100% similarity
            }))
          });
        }
      }
    }

    // Calculate data completeness score
    const totalFields = 5; // Number of fields we're checking
    const totalMissingFields = missingFields.reduce((sum, field) => sum + field.missingCount, 0);
    const dataCompletenessScore = totalCount > 0 ? 
      ((totalCount * totalFields - totalMissingFields) / (totalCount * totalFields)) * 100 : 100;

    return {
      totalLeads: totalCount,
      duplicateLeads: estimatedDuplicates,
      duplicateRate: totalCount > 0 ? (estimatedDuplicates / totalCount) * 100 : 0,
      missingFields,
      invalidEmails,
      invalidPhones,
      dataCompletenessScore,
      duplicateGroups
    };
  }
}