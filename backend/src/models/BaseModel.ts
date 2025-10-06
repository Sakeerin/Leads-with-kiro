import db from '../config/database';
import { Knex } from 'knex';

export abstract class BaseModel {
  protected static tableName: string;
  protected static db: Knex = db;

  static get query() {
    return this.db(this.tableName);
  }

  static async findById(id: string) {
    return this.query.where('id', id).first();
  }

  static async findAll(filters: Record<string, any> = {}) {
    let query = this.query;
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(key, value);
      }
    });
    
    return query;
  }

  static async create(data: Record<string, any>) {
    const [result] = await this.query.insert(data).returning('*');
    return result;
  }

  static async update(id: string, data: Record<string, any>) {
    const [result] = await this.query
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return result;
  }

  static async delete(id: string) {
    return this.query.where('id', id).del();
  }

  static async softDelete(id: string) {
    return this.update(id, { is_active: false });
  }

  static async paginate(page: number = 1, limit: number = 10, filters: Record<string, any> = {}) {
    const offset = (page - 1) * limit;
    
    let query = this.query;
    let countQuery = this.query.clone();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(key, value);
        countQuery = countQuery.where(key, value);
      }
    });
    
    const [data, totalCount] = await Promise.all([
      query.limit(limit).offset(offset),
      countQuery.count('* as count').first()
    ]);
    
    const total = parseInt(totalCount?.['count'] as string) || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}