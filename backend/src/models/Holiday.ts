import { BaseModel } from './BaseModel';
import { 
  Holiday as HolidayType, 
  HolidayTable, 
  HolidayType as HolidayTypeEnum
} from '../types';

export class Holiday extends BaseModel {
  protected static override tableName = 'holidays';

  static async findByYear(year: number): Promise<HolidayTable[]> {
    return this.query
      .whereRaw('EXTRACT(YEAR FROM date) = ?', [year])
      .where('is_active', true)
      .orderBy('date', 'asc');
  }

  static async findByType(type: HolidayTypeEnum): Promise<HolidayTable[]> {
    return this.query
      .where('type', type)
      .where('is_active', true)
      .orderBy('date', 'asc');
  }

  static async findByDateRange(startDate: Date, endDate: Date): Promise<HolidayTable[]> {
    return this.query
      .whereBetween('date', [startDate, endDate])
      .where('is_active', true)
      .orderBy('date', 'asc');
  }

  static async findUpcoming(limit: number = 10): Promise<HolidayTable[]> {
    const today = new Date();
    return this.query
      .where('date', '>=', today)
      .where('is_active', true)
      .orderBy('date', 'asc')
      .limit(limit);
  }

  static async createHoliday(holidayData: Omit<HolidayType, 'id' | 'createdAt' | 'updatedAt'>): Promise<HolidayTable> {
    const dbData: Partial<HolidayTable> = {
      name: holidayData.name,
      name_th: holidayData.nameTh,
      date: holidayData.date,
      type: holidayData.type,
      description: holidayData.description,
      description_th: holidayData.descriptionTh,
      is_recurring: holidayData.isRecurring,
      recurrence_pattern: holidayData.recurrencePattern,
      is_active: holidayData.isActive,
      created_by: holidayData.createdBy
    };

    return this.create(dbData);
  }

  static async updateHoliday(id: string, holidayData: Partial<HolidayType>): Promise<HolidayTable> {
    const dbData: Partial<HolidayTable> = {};
    
    if (holidayData.name) dbData.name = holidayData.name;
    if (holidayData.nameTh) dbData.name_th = holidayData.nameTh;
    if (holidayData.date) dbData.date = holidayData.date;
    if (holidayData.type) dbData.type = holidayData.type;
    if (holidayData.description) dbData.description = holidayData.description;
    if (holidayData.descriptionTh) dbData.description_th = holidayData.descriptionTh;
    if (holidayData.isRecurring !== undefined) dbData.is_recurring = holidayData.isRecurring;
    if (holidayData.recurrencePattern) dbData.recurrence_pattern = holidayData.recurrencePattern;
    if (holidayData.isActive !== undefined) dbData.is_active = holidayData.isActive;

    return this.update(id, dbData);
  }

  static async bulkCreateHolidays(holidays: Array<Omit<HolidayType, 'id' | 'createdAt' | 'updatedAt'>>, createdBy: string): Promise<HolidayTable[]> {
    const dbHolidays = holidays.map(holiday => ({
      name: holiday.name,
      name_th: holiday.nameTh,
      date: holiday.date,
      type: holiday.type,
      description: holiday.description,
      description_th: holiday.descriptionTh,
      is_recurring: holiday.isRecurring,
      recurrence_pattern: holiday.recurrencePattern,
      is_active: holiday.isActive,
      created_by: createdBy
    }));

    return this.knex(this.tableName).insert(dbHolidays).returning('*');
  }

  static async isHoliday(date: Date, types?: HolidayTypeEnum[]): Promise<boolean> {
    const dateStr = date.toISOString().split('T')[0];
    
    let query = this.query
      .where('date', dateStr)
      .where('is_active', true);
    
    if (types && types.length > 0) {
      query = query.whereIn('type', types);
    }
    
    const holiday = await query.first();
    return !!holiday;
  }

  static async generateRecurringHolidays(year: number): Promise<HolidayTable[]> {
    const recurringHolidays = await this.query
      .where('is_recurring', true)
      .where('is_active', true);
    
    const generatedHolidays: Array<Omit<HolidayType, 'id' | 'createdAt' | 'updatedAt'>> = [];
    
    for (const holiday of recurringHolidays) {
      const originalDate = new Date(holiday.date);
      const newDate = new Date(year, originalDate.getMonth(), originalDate.getDate());
      
      // Check if this holiday already exists for the year
      const existing = await this.query
        .where('name', holiday.name)
        .where('date', newDate.toISOString().split('T')[0])
        .first();
      
      if (!existing) {
        generatedHolidays.push({
          name: holiday.name,
          nameTh: holiday.name_th,
          date: newDate,
          type: holiday.type,
          description: holiday.description,
          descriptionTh: holiday.description_th,
          isRecurring: false, // Generated holidays are not recurring themselves
          isActive: true,
          createdBy: 'system'
        });
      }
    }
    
    if (generatedHolidays.length > 0) {
      return this.bulkCreateHolidays(generatedHolidays, 'system');
    }
    
    return [];
  }

  static transformToHolidayType(dbHoliday: HolidayTable): HolidayType {
    return {
      id: dbHoliday.id,
      name: dbHoliday.name,
      nameTh: dbHoliday.name_th,
      date: dbHoliday.date,
      type: dbHoliday.type,
      description: dbHoliday.description,
      descriptionTh: dbHoliday.description_th,
      isRecurring: dbHoliday.is_recurring,
      recurrencePattern: dbHoliday.recurrence_pattern,
      isActive: dbHoliday.is_active,
      createdBy: dbHoliday.created_by,
      createdAt: dbHoliday.created_at,
      updatedAt: dbHoliday.updated_at
    };
  }

  static getThaiHolidays(year: number): Array<Omit<HolidayType, 'id' | 'createdAt' | 'updatedAt'>> {
    return [
      {
        name: "New Year's Day",
        nameTh: "วันขึ้นปีใหม่",
        date: new Date(year, 0, 1),
        type: HolidayTypeEnum.NATIONAL,
        description: "New Year's Day",
        descriptionTh: "วันขึ้นปีใหม่",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "Chakri Memorial Day",
        nameTh: "วันจักรี",
        date: new Date(year, 3, 6),
        type: HolidayTypeEnum.NATIONAL,
        description: "Chakri Memorial Day",
        descriptionTh: "วันจักรี",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "Songkran Festival",
        nameTh: "วันสงกรานต์",
        date: new Date(year, 3, 13),
        type: HolidayTypeEnum.NATIONAL,
        description: "Songkran Festival",
        descriptionTh: "วันสงกรานต์",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "Labour Day",
        nameTh: "วันแรงงาน",
        date: new Date(year, 4, 1),
        type: HolidayTypeEnum.NATIONAL,
        description: "Labour Day",
        descriptionTh: "วันแรงงาน",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "Coronation Day",
        nameTh: "วันฉัตรมงคล",
        date: new Date(year, 4, 4),
        type: HolidayTypeEnum.NATIONAL,
        description: "Coronation Day",
        descriptionTh: "วันฉัตรมงคล",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "HM Queen Suthida's Birthday",
        nameTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา",
        date: new Date(year, 5, 3),
        type: HolidayTypeEnum.NATIONAL,
        description: "HM Queen Suthida's Birthday",
        descriptionTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "HM King's Birthday",
        nameTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว",
        date: new Date(year, 6, 28),
        type: HolidayTypeEnum.NATIONAL,
        description: "HM King's Birthday",
        descriptionTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "HM Queen Mother's Birthday",
        nameTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์",
        date: new Date(year, 7, 12),
        type: HolidayTypeEnum.NATIONAL,
        description: "HM Queen Mother's Birthday",
        descriptionTh: "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสิริกิติ์",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "HM King Bhumibol Memorial Day",
        nameTh: "วันคล้ายวันสวรรคตพระบาทสมเด็จพระปรมินทรมหาภูมิพลอดุลยเดช",
        date: new Date(year, 9, 13),
        type: HolidayTypeEnum.NATIONAL,
        description: "HM King Bhumibol Memorial Day",
        descriptionTh: "วันคล้ายวันสวรรคตพระบาทสมเด็จพระปรมินทรมหาภูมิพลอดุลยเดช",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "Chulalongkorn Day",
        nameTh: "วันปิยมหาราช",
        date: new Date(year, 9, 23),
        type: HolidayTypeEnum.NATIONAL,
        description: "Chulalongkorn Day",
        descriptionTh: "วันปิยมหาราช",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "HM King Bhumibol's Birthday",
        nameTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระปรมินทรมหาภูมิพลอดุลยเดช",
        date: new Date(year, 11, 5),
        type: HolidayTypeEnum.NATIONAL,
        description: "HM King Bhumibol's Birthday",
        descriptionTh: "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระปรมินทรมหาภูมิพลอดุลยเดช",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "Constitution Day",
        nameTh: "วันรัฐธรรมนูญ",
        date: new Date(year, 11, 10),
        type: HolidayTypeEnum.NATIONAL,
        description: "Constitution Day",
        descriptionTh: "วันรัฐธรรมนูญ",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      },
      {
        name: "New Year's Eve",
        nameTh: "วันสิ้นปี",
        date: new Date(year, 11, 31),
        type: HolidayTypeEnum.NATIONAL,
        description: "New Year's Eve",
        descriptionTh: "วันสิ้นปี",
        isRecurring: true,
        isActive: true,
        createdBy: 'system'
      }
    ];
  }
}