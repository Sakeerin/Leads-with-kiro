import { BaseModel } from './BaseModel';
import { 
  SystemConfig as SystemConfigType, 
  SystemConfigTable, 
  ConfigCategory,
  ConfigDataType
} from '../types';

export class SystemConfig extends BaseModel {
  protected static override tableName = 'system_config';

  static async findByKey(configKey: string): Promise<SystemConfigTable | undefined> {
    return this.query.where('config_key', configKey).first();
  }

  static async findByCategory(category: ConfigCategory): Promise<SystemConfigTable[]> {
    return this.query
      .where('category', category)
      .orderBy('config_key', 'asc');
  }

  static async createSystemConfig(configData: Omit<SystemConfigType, 'id' | 'createdAt' | 'updatedAt'>): Promise<SystemConfigTable> {
    const dbData: Partial<SystemConfigTable> = {
      config_key: configData.configKey,
      config_value: configData.configValue,
      config_json: configData.configJson ? JSON.stringify(configData.configJson) : null,
      data_type: configData.dataType,
      description: configData.description,
      description_th: configData.descriptionTh,
      category: configData.category,
      is_sensitive: configData.isSensitive,
      requires_restart: configData.requiresRestart,
      updated_by: configData.updatedBy
    };

    return this.create(dbData);
  }

  static async updateSystemConfig(configKey: string, configData: Partial<SystemConfigType>): Promise<SystemConfigTable> {
    const dbData: Partial<SystemConfigTable> = {};
    
    if (configData.configValue !== undefined) dbData.config_value = configData.configValue;
    if (configData.configJson !== undefined) dbData.config_json = configData.configJson ? JSON.stringify(configData.configJson) : null;
    if (configData.dataType) dbData.data_type = configData.dataType;
    if (configData.description) dbData.description = configData.description;
    if (configData.descriptionTh) dbData.description_th = configData.descriptionTh;
    if (configData.category) dbData.category = configData.category;
    if (configData.isSensitive !== undefined) dbData.is_sensitive = configData.isSensitive;
    if (configData.requiresRestart !== undefined) dbData.requires_restart = configData.requiresRestart;
    if (configData.updatedBy) dbData.updated_by = configData.updatedBy;

    const [updated] = await this.knex(this.tableName)
      .where('config_key', configKey)
      .update(dbData)
      .returning('*');

    return updated;
  }

  static async getValue(configKey: string, defaultValue?: any): Promise<any> {
    const config = await this.findByKey(configKey);
    if (!config) {
      return defaultValue;
    }

    const configType = this.transformToSystemConfigType(config);
    
    switch (configType.dataType) {
      case ConfigDataType.JSON:
        return configType.configJson || defaultValue;
      case ConfigDataType.BOOLEAN:
        return configType.configValue === 'true';
      case ConfigDataType.NUMBER:
        return configType.configValue ? Number(configType.configValue) : defaultValue;
      case ConfigDataType.STRING:
      default:
        return configType.configValue || defaultValue;
    }
  }

  static async setValue(configKey: string, value: any, updatedBy: string): Promise<SystemConfigTable> {
    const existing = await this.findByKey(configKey);
    
    if (existing) {
      const configType = this.transformToSystemConfigType(existing);
      let updateData: Partial<SystemConfigType>;
      
      if (configType.dataType === ConfigDataType.JSON) {
        updateData = { configJson: value, updatedBy };
      } else {
        updateData = { configValue: String(value), updatedBy };
      }
      
      return this.updateSystemConfig(configKey, updateData);
    } else {
      throw new Error(`Configuration key '${configKey}' not found`);
    }
  }

  static async bulkSet(configs: Array<{key: string, value: any}>, updatedBy: string): Promise<void> {
    const trx = await this.knex.transaction();
    
    try {
      for (const { key, value } of configs) {
        const existing = await trx('system_config').where('config_key', key).first();
        
        if (existing) {
          const configType = this.transformToSystemConfigType(existing);
          
          if (configType.dataType === ConfigDataType.JSON) {
            await trx('system_config')
              .where('config_key', key)
              .update({
                config_json: JSON.stringify(value),
                updated_by: updatedBy,
                updated_at: new Date()
              });
          } else {
            await trx('system_config')
              .where('config_key', key)
              .update({
                config_value: String(value),
                updated_by: updatedBy,
                updated_at: new Date()
              });
          }
        }
      }
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  static async getConfigsByCategory(category: ConfigCategory, includeSensitive: boolean = false): Promise<Record<string, any>> {
    let query = this.query.where('category', category);
    
    if (!includeSensitive) {
      query = query.where('is_sensitive', false);
    }
    
    const configs = await query;
    const result: Record<string, any> = {};
    
    for (const config of configs) {
      const configType = this.transformToSystemConfigType(config);
      result[configType.configKey] = await this.getValue(configType.configKey);
    }
    
    return result;
  }

  static transformToSystemConfigType(dbConfig: SystemConfigTable): SystemConfigType {
    return {
      id: dbConfig.id,
      configKey: dbConfig.config_key,
      configValue: dbConfig.config_value,
      configJson: dbConfig.config_json ? JSON.parse(dbConfig.config_json) : undefined,
      dataType: dbConfig.data_type,
      description: dbConfig.description,
      descriptionTh: dbConfig.description_th,
      category: dbConfig.category,
      isSensitive: dbConfig.is_sensitive,
      requiresRestart: dbConfig.requires_restart,
      updatedBy: dbConfig.updated_by,
      createdAt: dbConfig.created_at,
      updatedAt: dbConfig.updated_at
    };
  }

  static async initializeDefaultConfigs(updatedBy: string): Promise<void> {
    const defaultConfigs = [
      // General settings
      {
        configKey: 'system.name',
        configValue: 'Lead Management System',
        dataType: ConfigDataType.STRING,
        description: 'System name displayed in UI',
        descriptionTh: 'ชื่อระบบที่แสดงในหน้าจอ',
        category: ConfigCategory.GENERAL,
        isSensitive: false,
        requiresRestart: false,
        updatedBy
      },
      {
        configKey: 'system.timezone',
        configValue: 'Asia/Bangkok',
        dataType: ConfigDataType.STRING,
        description: 'Default system timezone',
        descriptionTh: 'เขตเวลาเริ่มต้นของระบบ',
        category: ConfigCategory.GENERAL,
        isSensitive: false,
        requiresRestart: false,
        updatedBy
      },
      {
        configKey: 'system.language',
        configValue: 'en',
        dataType: ConfigDataType.STRING,
        description: 'Default system language (en/th)',
        descriptionTh: 'ภาษาเริ่มต้นของระบบ (en/th)',
        category: ConfigCategory.GENERAL,
        isSensitive: false,
        requiresRestart: false,
        updatedBy
      },
      
      // Email settings
      {
        configKey: 'email.smtp.host',
        configValue: 'localhost',
        dataType: ConfigDataType.STRING,
        description: 'SMTP server hostname',
        descriptionTh: 'ชื่อเซิร์ฟเวอร์ SMTP',
        category: ConfigCategory.EMAIL,
        isSensitive: false,
        requiresRestart: true,
        updatedBy
      },
      {
        configKey: 'email.smtp.port',
        configValue: '587',
        dataType: ConfigDataType.NUMBER,
        description: 'SMTP server port',
        descriptionTh: 'พอร์ตเซิร์ฟเวอร์ SMTP',
        category: ConfigCategory.EMAIL,
        isSensitive: false,
        requiresRestart: true,
        updatedBy
      },
      {
        configKey: 'email.from.address',
        configValue: 'noreply@leadmanagement.com',
        dataType: ConfigDataType.STRING,
        description: 'Default from email address',
        descriptionTh: 'ที่อยู่อีเมลผู้ส่งเริ่มต้น',
        category: ConfigCategory.EMAIL,
        isSensitive: false,
        requiresRestart: false,
        updatedBy
      },
      
      // Scoring settings
      {
        configKey: 'scoring.model.weights',
        configJson: {
          profile: 0.4,
          behavior: 0.4,
          recency: 0.2
        },
        dataType: ConfigDataType.JSON,
        description: 'Lead scoring model weights',
        descriptionTh: 'น้ำหนักของโมเดลการให้คะแนนลีด',
        category: ConfigCategory.SCORING,
        isSensitive: false,
        requiresRestart: false,
        updatedBy
      },
      
      // Security settings
      {
        configKey: 'security.session.timeout',
        configValue: '3600',
        dataType: ConfigDataType.NUMBER,
        description: 'Session timeout in seconds',
        descriptionTh: 'เวลาหมดอายุเซสชันเป็นวินาที',
        category: ConfigCategory.SECURITY,
        isSensitive: false,
        requiresRestart: false,
        updatedBy
      },
      {
        configKey: 'security.password.min_length',
        configValue: '8',
        dataType: ConfigDataType.NUMBER,
        description: 'Minimum password length',
        descriptionTh: 'ความยาวรหัสผ่านขั้นต่ำ',
        category: ConfigCategory.SECURITY,
        isSensitive: false,
        requiresRestart: false,
        updatedBy
      }
    ];

    for (const config of defaultConfigs) {
      const existing = await this.findByKey(config.configKey);
      if (!existing) {
        await this.createSystemConfig(config);
      }
    }
  }
}