import { BaseModel } from './BaseModel';
import { 
  CustomField as CustomFieldType, 
  CustomFieldTable, 
  CustomFieldEntityType, 
  CustomFieldType as FieldType,
  ValidationRule,
  PicklistOption
} from '../types';

export class CustomField extends BaseModel {
  protected static override tableName = 'custom_fields';

  static async findByEntityType(entityType: CustomFieldEntityType): Promise<CustomFieldTable[]> {
    return this.query
      .where('entity_type', entityType)
      .where('is_active', true)
      .orderBy('display_order', 'asc');
  }

  static async findByFieldName(entityType: CustomFieldEntityType, fieldName: string): Promise<CustomFieldTable | undefined> {
    return this.query
      .where('entity_type', entityType)
      .where('field_name', fieldName)
      .first();
  }

  static async createCustomField(fieldData: Omit<CustomFieldType, 'id' | 'createdAt' | 'updatedAt'>): Promise<CustomFieldTable> {
    const dbData: Partial<CustomFieldTable> = {
      entity_type: fieldData.entityType,
      field_name: fieldData.fieldName,
      field_label: fieldData.fieldLabel,
      field_label_th: fieldData.fieldLabelTh,
      field_type: fieldData.fieldType,
      description: fieldData.description,
      description_th: fieldData.descriptionTh,
      is_required: fieldData.isRequired,
      is_active: fieldData.isActive,
      display_order: fieldData.displayOrder,
      validation_rules: fieldData.validationRules ? JSON.stringify(fieldData.validationRules) : null,
      picklist_values: fieldData.picklistValues ? JSON.stringify(fieldData.picklistValues) : null,
      default_value: fieldData.defaultValue,
      created_by: fieldData.createdBy
    };

    return this.create(dbData);
  }

  static async updateCustomField(id: string, fieldData: Partial<CustomFieldType>): Promise<CustomFieldTable> {
    const dbData: Partial<CustomFieldTable> = {};
    
    if (fieldData.fieldLabel) dbData.field_label = fieldData.fieldLabel;
    if (fieldData.fieldLabelTh) dbData.field_label_th = fieldData.fieldLabelTh;
    if (fieldData.fieldType) dbData.field_type = fieldData.fieldType;
    if (fieldData.description) dbData.description = fieldData.description;
    if (fieldData.descriptionTh) dbData.description_th = fieldData.descriptionTh;
    if (fieldData.isRequired !== undefined) dbData.is_required = fieldData.isRequired;
    if (fieldData.isActive !== undefined) dbData.is_active = fieldData.isActive;
    if (fieldData.displayOrder !== undefined) dbData.display_order = fieldData.displayOrder;
    if (fieldData.validationRules) dbData.validation_rules = JSON.stringify(fieldData.validationRules);
    if (fieldData.picklistValues) dbData.picklist_values = JSON.stringify(fieldData.picklistValues);
    if (fieldData.defaultValue) dbData.default_value = fieldData.defaultValue;

    return this.update(id, dbData);
  }

  static async reorderFields(entityType: CustomFieldEntityType, fieldOrders: Array<{id: string, displayOrder: number}>): Promise<void> {
    const trx = await this.knex.transaction();
    
    try {
      for (const { id, displayOrder } of fieldOrders) {
        await trx('custom_fields')
          .where('id', id)
          .where('entity_type', entityType)
          .update({ display_order: displayOrder });
      }
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static transformToCustomFieldType(dbField: CustomFieldTable): CustomFieldType {
    return {
      id: dbField.id,
      entityType: dbField.entity_type,
      fieldName: dbField.field_name,
      fieldLabel: dbField.field_label,
      fieldLabelTh: dbField.field_label_th,
      fieldType: dbField.field_type,
      description: dbField.description,
      descriptionTh: dbField.description_th,
      isRequired: dbField.is_required,
      isActive: dbField.is_active,
      displayOrder: dbField.display_order,
      validationRules: dbField.validation_rules ? JSON.parse(dbField.validation_rules) : undefined,
      picklistValues: dbField.picklist_values ? JSON.parse(dbField.picklist_values) : undefined,
      defaultValue: dbField.default_value,
      createdBy: dbField.created_by,
      createdAt: dbField.created_at,
      updatedAt: dbField.updated_at
    };
  }

  static async validateFieldValue(entityType: CustomFieldEntityType, fieldName: string, value: any): Promise<{isValid: boolean, errors: string[]}> {
    const field = await this.findByFieldName(entityType, fieldName);
    if (!field) {
      return { isValid: false, errors: ['Field not found'] };
    }

    const errors: string[] = [];
    const fieldConfig = this.transformToCustomFieldType(field);

    // Required validation
    if (fieldConfig.isRequired && (value === null || value === undefined || value === '')) {
      errors.push(`${fieldConfig.fieldLabel} is required`);
    }

    // Type-specific validation
    if (value !== null && value !== undefined && value !== '') {
      switch (fieldConfig.fieldType) {
        case FieldType.EMAIL:
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push(`${fieldConfig.fieldLabel} must be a valid email address`);
          }
          break;
        case FieldType.PHONE:
          if (!/^\+?[\d\s\-\(\)]+$/.test(value)) {
            errors.push(`${fieldConfig.fieldLabel} must be a valid phone number`);
          }
          break;
        case FieldType.URL:
          try {
            new URL(value);
          } catch {
            errors.push(`${fieldConfig.fieldLabel} must be a valid URL`);
          }
          break;
        case FieldType.NUMBER:
        case FieldType.DECIMAL:
        case FieldType.CURRENCY:
          if (isNaN(Number(value))) {
            errors.push(`${fieldConfig.fieldLabel} must be a valid number`);
          }
          break;
        case FieldType.DATE:
        case FieldType.DATETIME:
          if (isNaN(Date.parse(value))) {
            errors.push(`${fieldConfig.fieldLabel} must be a valid date`);
          }
          break;
        case FieldType.BOOLEAN:
          if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            errors.push(`${fieldConfig.fieldLabel} must be true or false`);
          }
          break;
      }
    }

    // Custom validation rules
    if (fieldConfig.validationRules && value !== null && value !== undefined && value !== '') {
      for (const rule of fieldConfig.validationRules) {
        switch (rule.type) {
          case 'min_length':
            if (String(value).length < rule.value) {
              errors.push(rule.message || `${fieldConfig.fieldLabel} must be at least ${rule.value} characters`);
            }
            break;
          case 'max_length':
            if (String(value).length > rule.value) {
              errors.push(rule.message || `${fieldConfig.fieldLabel} must be no more than ${rule.value} characters`);
            }
            break;
          case 'min_value':
            if (Number(value) < rule.value) {
              errors.push(rule.message || `${fieldConfig.fieldLabel} must be at least ${rule.value}`);
            }
            break;
          case 'max_value':
            if (Number(value) > rule.value) {
              errors.push(rule.message || `${fieldConfig.fieldLabel} must be no more than ${rule.value}`);
            }
            break;
          case 'regex':
            if (!new RegExp(rule.value).test(String(value))) {
              errors.push(rule.message || `${fieldConfig.fieldLabel} format is invalid`);
            }
            break;
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }
}