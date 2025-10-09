import { BaseModel } from './BaseModel';
import { EmailTemplate, EmailTemplateTable, EmailTemplateType } from '../types';

export class EmailTemplateModel extends BaseModel {
  static tableName = 'email_templates';

  static async create(data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const [template] = await this.db(this.tableName)
      .insert({
        name: data.name,
        subject: data.subject,
        body: data.body,
        type: data.type,
        variables: JSON.stringify(data.variables),
        is_active: data.isActive,
        created_by: data.createdBy
      })
      .returning('*');

    return this.mapFromDb(template);
  }

  static async findById(id: string): Promise<EmailTemplate | null> {
    const template = await this.db(this.tableName)
      .where({ id })
      .first();

    return template ? this.mapFromDb(template) : null;
  }

  static async findByType(type: EmailTemplateType, isActive: boolean = true): Promise<EmailTemplate[]> {
    const templates = await this.db(this.tableName)
      .where({ type, is_active: isActive })
      .orderBy('name');

    return templates.map(this.mapFromDb);
  }

  static async findAll(isActive?: boolean): Promise<EmailTemplate[]> {
    let query = this.db(this.tableName);
    
    if (isActive !== undefined) {
      query = query.where({ is_active: isActive });
    }

    const templates = await query.orderBy('name');
    return templates.map(this.mapFromDb);
  }

  static async update(id: string, data: Partial<Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>>): Promise<EmailTemplate | null> {
    const updateData: Partial<EmailTemplateTable> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.subject !== undefined) updateData.subject = data.subject;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.variables !== undefined) updateData.variables = JSON.stringify(data.variables);
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    updateData.updated_at = new Date();

    const [template] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return template ? this.mapFromDb(template) : null;
  }

  static async delete(id: string): Promise<boolean> {
    const result = await this.db(this.tableName)
      .where({ id })
      .update({ is_active: false, updated_at: new Date() });

    return result > 0;
  }

  static async extractVariables(template: string): Promise<string[]> {
    // Extract variables in the format {{variable_name}}
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variable = match[1].trim();
      if (!variables.includes(variable)) {
        variables.push(variable);
      }
    }

    return variables;
  }

  static async renderTemplate(template: string, variables: Record<string, any>): Promise<string> {
    let rendered = template;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      rendered = rendered.replace(regex, String(value || ''));
    }

    return rendered;
  }

  private static mapFromDb(row: EmailTemplateTable): EmailTemplate {
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      body: row.body,
      type: row.type,
      variables: JSON.parse(row.variables),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by
    };
  }
}