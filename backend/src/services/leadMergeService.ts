import { Lead } from '../models/Lead';
import { Activity } from '../models/Activity';
import { Task } from '../models/Task';
import { Lead as LeadType, ActivityType } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface MergeFieldDecision {
  field: string;
  sourceValue: any;
  targetValue: any;
  selectedValue: any;
  reason: string;
  confidence: number;
}

export interface MergePreview {
  sourceId: string;
  targetId: string;
  fieldDecisions: MergeFieldDecision[];
  conflictCount: number;
  autoMergeCount: number;
  manualDecisionCount: number;
}

export interface MergeRequest {
  sourceId: string;
  targetId: string;
  fieldDecisions: Record<string, any>;
  mergedBy: string;
  preserveSourceData: boolean;
}

export interface MergeResult {
  mergedLead: LeadType;
  mergedFields: string[];
  preservedSourceData?: any;
  activitiesMerged: number;
  tasksMerged: number;
}

export class LeadMergeService {
  /**
   * Generate merge preview showing field conflicts and recommendations
   */
  static async generateMergePreview(sourceId: string, targetId: string): Promise<MergePreview> {
    // Get both leads
    const [sourceLead, targetLead] = await Promise.all([
      Lead.findById(sourceId),
      Lead.findById(targetId)
    ]);

    if (!sourceLead) {
      throw new NotFoundError(`Source lead with ID ${sourceId} not found`);
    }

    if (!targetLead) {
      throw new NotFoundError(`Target lead with ID ${targetId} not found`);
    }

    const sourceLeadType = Lead.transformToLeadType(sourceLead);
    const targetLeadType = Lead.transformToLeadType(targetLead);

    const fieldDecisions: MergeFieldDecision[] = [];

    // Compare all mergeable fields
    this.compareField(fieldDecisions, 'company.name', sourceLeadType.company.name, targetLeadType.company.name);
    this.compareField(fieldDecisions, 'company.industry', sourceLeadType.company.industry, targetLeadType.company.industry);
    this.compareField(fieldDecisions, 'company.size', sourceLeadType.company.size, targetLeadType.company.size);
    
    this.compareField(fieldDecisions, 'contact.name', sourceLeadType.contact.name, targetLeadType.contact.name);
    this.compareField(fieldDecisions, 'contact.phone', sourceLeadType.contact.phone, targetLeadType.contact.phone);
    this.compareField(fieldDecisions, 'contact.mobile', sourceLeadType.contact.mobile, targetLeadType.contact.mobile);
    this.compareField(fieldDecisions, 'contact.email', sourceLeadType.contact.email, targetLeadType.contact.email);
    
    this.compareField(fieldDecisions, 'source.channel', sourceLeadType.source.channel, targetLeadType.source.channel);
    this.compareField(fieldDecisions, 'source.campaign', sourceLeadType.source.campaign, targetLeadType.source.campaign);
    
    this.compareField(fieldDecisions, 'qualification.interest', sourceLeadType.qualification.interest, targetLeadType.qualification.interest);
    this.compareField(fieldDecisions, 'qualification.budget', sourceLeadType.qualification.budget, targetLeadType.qualification.budget);
    this.compareField(fieldDecisions, 'qualification.timeline', sourceLeadType.qualification.timeline, targetLeadType.qualification.timeline);
    this.compareField(fieldDecisions, 'qualification.businessType', sourceLeadType.qualification.businessType, targetLeadType.qualification.businessType);
    
    this.compareField(fieldDecisions, 'product.type', sourceLeadType.product.type, targetLeadType.product.type);
    this.compareField(fieldDecisions, 'product.adType', sourceLeadType.product.adType, targetLeadType.product.adType);
    
    // Compare custom fields
    const allCustomFields = new Set([
      ...Object.keys(sourceLeadType.customFields || {}),
      ...Object.keys(targetLeadType.customFields || {})
    ]);

    allCustomFields.forEach(field => {
      this.compareField(
        fieldDecisions,
        `customFields.${field}`,
        sourceLeadType.customFields?.[field],
        targetLeadType.customFields?.[field]
      );
    });

    // Calculate statistics
    const conflictCount = fieldDecisions.filter(d => d.confidence < 1.0).length;
    const autoMergeCount = fieldDecisions.filter(d => d.confidence === 1.0).length;
    const manualDecisionCount = fieldDecisions.filter(d => d.confidence < 0.8).length;

    return {
      sourceId,
      targetId,
      fieldDecisions,
      conflictCount,
      autoMergeCount,
      manualDecisionCount
    };
  }

  /**
   * Compare two field values and generate merge decision
   */
  private static compareField(
    decisions: MergeFieldDecision[],
    fieldPath: string,
    sourceValue: any,
    targetValue: any
  ): void {
    let selectedValue = targetValue;
    let reason = 'Keep target value';
    let confidence = 1.0;

    // Both values are empty/null
    if (!sourceValue && !targetValue) {
      return; // Skip empty fields
    }

    // Only source has value
    if (sourceValue && !targetValue) {
      selectedValue = sourceValue;
      reason = 'Source has value, target is empty';
      confidence = 1.0;
    }
    // Only target has value
    else if (!sourceValue && targetValue) {
      selectedValue = targetValue;
      reason = 'Target has value, source is empty';
      confidence = 1.0;
    }
    // Both have values
    else if (sourceValue && targetValue) {
      // Values are identical
      if (sourceValue === targetValue) {
        selectedValue = targetValue;
        reason = 'Values are identical';
        confidence = 1.0;
      }
      // Values are different - need decision logic
      else {
        const decision = this.makeFieldDecision(fieldPath, sourceValue, targetValue);
        selectedValue = decision.selectedValue;
        reason = decision.reason;
        confidence = decision.confidence;
      }
    }

    decisions.push({
      field: fieldPath,
      sourceValue,
      targetValue,
      selectedValue,
      reason,
      confidence
    });
  }

  /**
   * Make intelligent decision about which field value to keep
   */
  private static makeFieldDecision(
    fieldPath: string,
    sourceValue: any,
    targetValue: any
  ): { selectedValue: any; reason: string; confidence: number } {
    // Email field - prefer the one that looks more complete/professional
    if (fieldPath === 'contact.email') {
      const sourceScore = this.scoreEmail(sourceValue);
      const targetScore = this.scoreEmail(targetValue);
      
      if (sourceScore > targetScore) {
        return {
          selectedValue: sourceValue,
          reason: 'Source email appears more professional',
          confidence: 0.8
        };
      } else {
        return {
          selectedValue: targetValue,
          reason: 'Target email appears more professional',
          confidence: 0.8
        };
      }
    }

    // Phone fields - prefer the one with country code
    if (fieldPath.includes('phone') || fieldPath.includes('mobile')) {
      if (sourceValue.startsWith('+') && !targetValue.startsWith('+')) {
        return {
          selectedValue: sourceValue,
          reason: 'Source phone has international format',
          confidence: 0.9
        };
      } else if (!sourceValue.startsWith('+') && targetValue.startsWith('+')) {
        return {
          selectedValue: targetValue,
          reason: 'Target phone has international format',
          confidence: 0.9
        };
      }
    }

    // Company name - prefer the longer, more descriptive one
    if (fieldPath === 'company.name') {
      if (sourceValue.length > targetValue.length * 1.5) {
        return {
          selectedValue: sourceValue,
          reason: 'Source company name is more descriptive',
          confidence: 0.7
        };
      } else if (targetValue.length > sourceValue.length * 1.5) {
        return {
          selectedValue: targetValue,
          reason: 'Target company name is more descriptive',
          confidence: 0.7
        };
      }
    }

    // Contact name - prefer the one with more parts (first + last name)
    if (fieldPath === 'contact.name') {
      const sourceParts = sourceValue.trim().split(' ').length;
      const targetParts = targetValue.trim().split(' ').length;
      
      if (sourceParts > targetParts) {
        return {
          selectedValue: sourceValue,
          reason: 'Source name is more complete',
          confidence: 0.8
        };
      } else if (targetParts > sourceParts) {
        return {
          selectedValue: targetValue,
          reason: 'Target name is more complete',
          confidence: 0.8
        };
      }
    }

    // Qualification fields - prefer more specific values
    if (fieldPath.startsWith('qualification.')) {
      const sourceSpecificity = this.getQualificationSpecificity(sourceValue);
      const targetSpecificity = this.getQualificationSpecificity(targetValue);
      
      if (sourceSpecificity > targetSpecificity) {
        return {
          selectedValue: sourceValue,
          reason: 'Source qualification is more specific',
          confidence: 0.8
        };
      } else if (targetSpecificity > sourceSpecificity) {
        return {
          selectedValue: targetValue,
          reason: 'Target qualification is more specific',
          confidence: 0.8
        };
      }
    }

    // Default: prefer target (newer record assumption)
    return {
      selectedValue: targetValue,
      reason: 'Default to target value (manual review recommended)',
      confidence: 0.5
    };
  }

  /**
   * Score email quality (higher is better)
   */
  private static scoreEmail(email: string): number {
    let score = 0;
    
    // Professional domains get higher score
    const professionalDomains = ['gmail.com', 'outlook.com', 'company.com'];
    const domain = email.split('@')[1]?.toLowerCase();
    
    if (domain && !professionalDomains.includes(domain)) {
      score += 2; // Custom domain is more professional
    }
    
    // Longer local part might be more descriptive
    const localPart = email.split('@')[0];
    if (localPart.length > 5) {
      score += 1;
    }
    
    // Contains dots or underscores (structured)
    if (localPart.includes('.') || localPart.includes('_')) {
      score += 1;
    }
    
    return score;
  }

  /**
   * Get qualification specificity score
   */
  private static getQualificationSpecificity(value: any): number {
    if (!value) return 0;
    
    const specificityMap: Record<string, number> = {
      'high': 3,
      'medium': 2,
      'low': 1,
      'confirmed': 3,
      'estimated': 2,
      'unknown': 0,
      'immediate': 4,
      'within_month': 3,
      'within_quarter': 2,
      'within_year': 1,
      'b2b': 2,
      'b2c': 2
    };
    
    return specificityMap[value] || 0;
  }

  /**
   * Execute lead merge based on field decisions
   */
  static async mergeLead(request: MergeRequest): Promise<MergeResult> {
    // Validate leads exist
    const [sourceLead, targetLead] = await Promise.all([
      Lead.findById(request.sourceId),
      Lead.findById(request.targetId)
    ]);

    if (!sourceLead) {
      throw new NotFoundError(`Source lead with ID ${request.sourceId} not found`);
    }

    if (!targetLead) {
      throw new NotFoundError(`Target lead with ID ${request.targetId} not found`);
    }

    const sourceLeadType = Lead.transformToLeadType(sourceLead);
    const targetLeadType = Lead.transformToLeadType(targetLead);

    // Build merged data
    const mergedData: Partial<LeadType> = {};
    const mergedFields: string[] = [];

    // Apply field decisions
    Object.entries(request.fieldDecisions).forEach(([fieldPath, value]) => {
      this.setNestedValue(mergedData, fieldPath, value);
      mergedFields.push(fieldPath);
    });

    // Preserve source data if requested
    let preservedSourceData: any = undefined;
    if (request.preserveSourceData) {
      preservedSourceData = {
        ...sourceLeadType,
        mergedAt: new Date(),
        mergedBy: request.mergedBy,
        mergedInto: request.targetId
      };
    }

    // Update target lead with merged data
    const updatedLead = await Lead.updateLead(request.targetId, mergedData);
    const mergedLeadType = Lead.transformToLeadType(updatedLead);

    // Merge activities
    const sourceActivities = await Activity.findByLeadId(request.sourceId);
    const activitiesMerged = sourceActivities.length;

    for (const activity of sourceActivities) {
      await Activity.update(activity.id, {
        lead_id: request.targetId,
        details: JSON.stringify({
          ...JSON.parse(activity.details),
          originalLeadId: request.sourceId,
          mergedAt: new Date()
        })
      });
    }

    // Merge tasks
    const sourceTasks = await Task.findByLeadId(request.sourceId);
    const tasksMerged = sourceTasks.length;

    for (const task of sourceTasks) {
      await Task.update(task.id, {
        lead_id: request.targetId
      });
    }

    // Soft delete source lead
    await Lead.update(request.sourceId, {
      is_active: false,
      custom_fields: JSON.stringify({
        ...(sourceLead.custom_fields ? JSON.parse(sourceLead.custom_fields) : {}),
        mergedInto: request.targetId,
        mergedAt: new Date(),
        mergedBy: request.mergedBy
      })
    });

    // Log merge activity
    await Activity.create({
      lead_id: request.targetId,
      type: ActivityType.LEAD_UPDATED,
      subject: 'Lead merged',
      details: JSON.stringify({
        action: 'merge',
        sourceLeadId: request.sourceId,
        mergedFields,
        activitiesMerged,
        tasksMerged,
        preservedSourceData: request.preserveSourceData
      }),
      performed_by: request.mergedBy,
      performed_at: new Date()
    });

    return {
      mergedLead: mergedLeadType,
      mergedFields,
      preservedSourceData,
      activitiesMerged,
      tasksMerged
    };
  }

  /**
   * Set nested object value using dot notation
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Undo lead merge (if possible)
   */
  static async undoMerge(
    mergedLeadId: string,
    originalSourceData: any,
    undoneBy: string
  ): Promise<LeadType> {
    // Validate merged lead exists
    const mergedLead = await Lead.findById(mergedLeadId);
    if (!mergedLead) {
      throw new NotFoundError(`Merged lead with ID ${mergedLeadId} not found`);
    }

    // Restore source lead
    const restoredSourceLead = await Lead.createLead({
      ...originalSourceData,
      metadata: undefined // Will be set automatically
    });

    // Move activities back to source lead
    const mergedActivities = await Activity.query
      .where('lead_id', mergedLeadId)
      .where('details', 'like', `%"originalLeadId":"${originalSourceData.id}"%`);

    for (const activity of mergedActivities) {
      await Activity.update(activity.id, {
        lead_id: restoredSourceLead.id
      });
    }

    // Move tasks back to source lead
    const mergedTasks = await Task.query
      .where('lead_id', mergedLeadId)
      .where('created_at', '>=', originalSourceData.metadata.createdAt);

    for (const task of mergedTasks) {
      await Task.update(task.id, {
        lead_id: restoredSourceLead.id
      });
    }

    // Log undo activity
    await Activity.create({
      lead_id: mergedLeadId,
      type: ActivityType.LEAD_UPDATED,
      subject: 'Lead merge undone',
      details: JSON.stringify({
        action: 'undo_merge',
        restoredLeadId: restoredSourceLead.id,
        originalSourceData: originalSourceData.id
      }),
      performed_by: undoneBy,
      performed_at: new Date()
    });

    return Lead.transformToLeadType(restoredSourceLead);
  }
}