import { BaseModel } from './BaseModel';
import { 
  PicklistValue as PicklistValueType, 
  PicklistValueTable, 
  PicklistType
} from '../types';

export class PicklistValue extends BaseModel {
  protected static override tableName = 'picklist_values';

  static async findByType(picklistType: PicklistType): Promise<PicklistValueTable[]> {
    return this.query
      .where('picklist_type', picklistType)
      .where('is_active', true)
      .orderBy('display_order', 'asc');
  }

  static async findByValue(picklistType: PicklistType, value: string): Promise<PicklistValueTable | undefined> {
    return this.query
      .where('picklist_type', picklistType)
      .where('value', value)
      .first();
  }

  static async findDefault(picklistType: PicklistType): Promise<PicklistValueTable | undefined> {
    return this.query
      .where('picklist_type', picklistType)
      .where('is_default', true)
      .where('is_active', true)
      .first();
  }

  static async createPicklistValue(valueData: Omit<PicklistValueType, 'id' | 'createdAt' | 'updatedAt'>): Promise<PicklistValueTable> {
    const dbData: Partial<PicklistValueTable> = {
      picklist_type: valueData.picklistType,
      value: valueData.value,
      label: valueData.label,
      label_th: valueData.labelTh,
      description: valueData.description,
      description_th: valueData.descriptionTh,
      color_code: valueData.colorCode,
      icon: valueData.icon,
      is_active: valueData.isActive,
      is_default: valueData.isDefault,
      display_order: valueData.displayOrder,
      metadata: valueData.metadata ? JSON.stringify(valueData.metadata) : null,
      created_by: valueData.createdBy
    };

    return this.create(dbData);
  }

  static async updatePicklistValue(id: string, valueData: Partial<PicklistValueType>): Promise<PicklistValueTable> {
    const dbData: Partial<PicklistValueTable> = {};
    
    if (valueData.label) dbData.label = valueData.label;
    if (valueData.labelTh) dbData.label_th = valueData.labelTh;
    if (valueData.description) dbData.description = valueData.description;
    if (valueData.descriptionTh) dbData.description_th = valueData.descriptionTh;
    if (valueData.colorCode) dbData.color_code = valueData.colorCode;
    if (valueData.icon) dbData.icon = valueData.icon;
    if (valueData.isActive !== undefined) dbData.is_active = valueData.isActive;
    if (valueData.isDefault !== undefined) dbData.is_default = valueData.isDefault;
    if (valueData.displayOrder !== undefined) dbData.display_order = valueData.displayOrder;
    if (valueData.metadata) dbData.metadata = JSON.stringify(valueData.metadata);

    return this.update(id, dbData);
  }

  static async setDefault(picklistType: PicklistType, valueId: string): Promise<void> {
    const trx = await this.knex.transaction();
    
    try {
      // Clear existing default
      await trx('picklist_values')
        .where('picklist_type', picklistType)
        .update({ is_default: false });
      
      // Set new default
      await trx('picklist_values')
        .where('id', valueId)
        .update({ is_default: true });
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async reorderValues(picklistType: PicklistType, valueOrders: Array<{id: string, displayOrder: number}>): Promise<void> {
    const trx = await this.knex.transaction();
    
    try {
      for (const { id, displayOrder } of valueOrders) {
        await trx('picklist_values')
          .where('id', id)
          .where('picklist_type', picklistType)
          .update({ display_order: displayOrder });
      }
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async bulkCreate(picklistType: PicklistType, values: Array<Omit<PicklistValueType, 'id' | 'picklistType' | 'createdAt' | 'updatedAt'>>, createdBy: string): Promise<PicklistValueTable[]> {
    const dbValues = values.map((value, index) => ({
      picklist_type: picklistType,
      value: value.value,
      label: value.label,
      label_th: value.labelTh,
      description: value.description,
      description_th: value.descriptionTh,
      color_code: value.colorCode,
      icon: value.icon,
      is_active: value.isActive ?? true,
      is_default: value.isDefault ?? false,
      display_order: value.displayOrder ?? index,
      metadata: value.metadata ? JSON.stringify(value.metadata) : null,
      created_by: createdBy
    }));

    return this.knex(this.tableName).insert(dbValues).returning('*');
  }

  static transformToPicklistValueType(dbValue: PicklistValueTable): PicklistValueType {
    return {
      id: dbValue.id,
      picklistType: dbValue.picklist_type,
      value: dbValue.value,
      label: dbValue.label,
      labelTh: dbValue.label_th,
      description: dbValue.description,
      descriptionTh: dbValue.description_th,
      colorCode: dbValue.color_code,
      icon: dbValue.icon,
      isActive: dbValue.is_active,
      isDefault: dbValue.is_default,
      displayOrder: dbValue.display_order,
      metadata: dbValue.metadata ? JSON.parse(dbValue.metadata) : undefined,
      createdBy: dbValue.created_by,
      createdAt: dbValue.created_at,
      updatedAt: dbValue.updated_at
    };
  }

  static async getPicklistOptions(picklistType: PicklistType, language: 'en' | 'th' = 'en'): Promise<Array<{value: string, label: string}>> {
    const values = await this.findByType(picklistType);
    
    return values.map(value => ({
      value: value.value,
      label: language === 'th' && value.label_th ? value.label_th : value.label
    }));
  }
}