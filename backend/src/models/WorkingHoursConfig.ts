import { BaseModel } from './BaseModel';
import { 
  WorkingHoursConfig as WorkingHoursConfigType, 
  WorkingHoursConfigTable,
  WeeklySchedule,
  Holiday
} from '../types';

export class WorkingHoursConfig extends BaseModel {
  protected static override tableName = 'working_hours_config';

  static async findDefault(): Promise<WorkingHoursConfigTable | undefined> {
    return this.query
      .where('is_default', true)
      .where('is_active', true)
      .first();
  }

  static async findActive(): Promise<WorkingHoursConfigTable[]> {
    return this.query
      .where('is_active', true)
      .orderBy('name', 'asc');
  }

  static async createWorkingHoursConfig(configData: Omit<WorkingHoursConfigType, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkingHoursConfigTable> {
    const dbData: Partial<WorkingHoursConfigTable> = {
      name: configData.name,
      timezone: configData.timezone,
      schedule: JSON.stringify(configData.schedule),
      holidays: configData.holidays ? JSON.stringify(configData.holidays) : null,
      description: configData.description,
      is_active: configData.isActive,
      is_default: configData.isDefault,
      created_by: configData.createdBy
    };

    return this.create(dbData);
  }

  static async updateWorkingHoursConfig(id: string, configData: Partial<WorkingHoursConfigType>): Promise<WorkingHoursConfigTable> {
    const dbData: Partial<WorkingHoursConfigTable> = {};
    
    if (configData.name) dbData.name = configData.name;
    if (configData.timezone) dbData.timezone = configData.timezone;
    if (configData.schedule) dbData.schedule = JSON.stringify(configData.schedule);
    if (configData.holidays) dbData.holidays = JSON.stringify(configData.holidays);
    if (configData.description) dbData.description = configData.description;
    if (configData.isActive !== undefined) dbData.is_active = configData.isActive;
    if (configData.isDefault !== undefined) dbData.is_default = configData.isDefault;

    return this.update(id, dbData);
  }

  static async setDefault(configId: string): Promise<void> {
    const trx = await this.knex.transaction();
    
    try {
      // Clear existing default
      await trx('working_hours_config')
        .update({ is_default: false });
      
      // Set new default
      await trx('working_hours_config')
        .where('id', configId)
        .update({ is_default: true });
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static transformToWorkingHoursConfigType(dbConfig: WorkingHoursConfigTable): WorkingHoursConfigType {
    return {
      id: dbConfig.id,
      name: dbConfig.name,
      timezone: dbConfig.timezone,
      schedule: JSON.parse(dbConfig.schedule),
      holidays: dbConfig.holidays ? JSON.parse(dbConfig.holidays) : undefined,
      description: dbConfig.description,
      isActive: dbConfig.is_active,
      isDefault: dbConfig.is_default,
      createdBy: dbConfig.created_by,
      createdAt: dbConfig.created_at,
      updatedAt: dbConfig.updated_at
    };
  }

  static async isWorkingTime(date: Date, configId?: string): Promise<boolean> {
    let config: WorkingHoursConfigTable | undefined;
    
    if (configId) {
      config = await this.findById(configId);
    } else {
      config = await this.findDefault();
    }

    if (!config) {
      return false; // No working hours configured
    }

    const workingHours = this.transformToWorkingHoursConfigType(config);
    
    // Check if it's a holiday
    if (workingHours.holidays) {
      const dateStr = date.toISOString().split('T')[0];
      const isHoliday = workingHours.holidays.some(holiday => {
        const holidayDate = new Date(holiday.date).toISOString().split('T')[0];
        return holidayDate === dateStr && holiday.isActive;
      });
      
      if (isHoliday) {
        return false;
      }
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek] as keyof WeeklySchedule;
    
    const daySchedule = workingHours.schedule[dayName];
    
    if (!daySchedule.isWorkingDay) {
      return false;
    }

    if (!daySchedule.startTime || !daySchedule.endTime) {
      return true; // Working day but no specific hours set
    }

    // Convert date to timezone and check time
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour12: false, 
      timeZone: workingHours.timezone 
    }).substring(0, 5); // HH:mm format

    return timeStr >= daySchedule.startTime && timeStr <= daySchedule.endTime;
  }

  static async getNextWorkingTime(fromDate: Date, configId?: string): Promise<Date> {
    let config: WorkingHoursConfigTable | undefined;
    
    if (configId) {
      config = await this.findById(configId);
    } else {
      config = await this.findDefault();
    }

    if (!config) {
      return fromDate; // No working hours configured, return original date
    }

    const workingHours = this.transformToWorkingHoursConfigType(config);
    let checkDate = new Date(fromDate);
    
    // Look ahead up to 14 days to find next working time
    for (let i = 0; i < 14; i++) {
      if (await this.isWorkingTime(checkDate, configId)) {
        return checkDate;
      }
      
      // Move to next day at start of working hours
      checkDate.setDate(checkDate.getDate() + 1);
      checkDate.setHours(9, 0, 0, 0); // Default to 9 AM
    }
    
    return fromDate; // Fallback if no working time found
  }

  static createDefaultWorkingHours(): WeeklySchedule {
    const defaultDay = {
      isWorkingDay: true,
      startTime: '09:00',
      endTime: '17:00'
    };

    const weekend = {
      isWorkingDay: false
    };

    return {
      monday: defaultDay,
      tuesday: defaultDay,
      wednesday: defaultDay,
      thursday: defaultDay,
      friday: defaultDay,
      saturday: weekend,
      sunday: weekend
    };
  }
}