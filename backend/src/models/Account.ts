import { BaseModel } from './BaseModel';
import { Account as AccountType, AccountTable } from '../types';

export class Account extends BaseModel {
  protected static override tableName = 'accounts';

  static async findByName(name: string): Promise<AccountTable[]> {
    return this.query.where('name', 'ilike', `%${name}%`).where('is_active', true);
  }

  static async findExactByName(name: string): Promise<AccountTable | undefined> {
    return this.query.where('name', 'ilike', name).where('is_active', true).first();
  }

  static async searchAccounts(searchTerm: string, limit: number = 10): Promise<AccountTable[]> {
    return this.query
      .where('is_active', true)
      .where(function() {
        this.where('name', 'ilike', `%${searchTerm}%`)
          .orWhere('industry', 'ilike', `%${searchTerm}%`);
      })
      .orderBy('name')
      .limit(limit);
  }

  static async createAccount(accountData: Omit<AccountType, 'id' | 'metadata'>): Promise<AccountTable> {
    const dbData: Partial<AccountTable> = {
      name: accountData.name,
      ...(accountData.industry && { industry: accountData.industry }),
      ...(accountData.size && { size: accountData.size }),
      ...(accountData.website && { website: accountData.website }),
      ...(accountData.phone && { phone: accountData.phone }),
      ...(accountData.address && { address: accountData.address }),
      ...(accountData.city && { city: accountData.city }),
      ...(accountData.state && { state: accountData.state }),
      ...(accountData.country && { country: accountData.country }),
      ...(accountData.postalCode && { postal_code: accountData.postalCode }),
      ...(accountData.description && { description: accountData.description }),
      ...(accountData.customFields && Object.keys(accountData.customFields).length > 0 && { 
        custom_fields: JSON.stringify(accountData.customFields) 
      }),
      is_active: true
    };

    return this.create(dbData);
  }

  static async updateAccount(id: string, accountData: Partial<AccountType>): Promise<AccountTable> {
    const dbData: Partial<AccountTable> = {};
    
    if (accountData.name) dbData.name = accountData.name;
    if (accountData.industry) dbData.industry = accountData.industry;
    if (accountData.size) dbData.size = accountData.size;
    if (accountData.website) dbData.website = accountData.website;
    if (accountData.phone) dbData.phone = accountData.phone;
    if (accountData.address) dbData.address = accountData.address;
    if (accountData.city) dbData.city = accountData.city;
    if (accountData.state) dbData.state = accountData.state;
    if (accountData.country) dbData.country = accountData.country;
    if (accountData.postalCode) dbData.postal_code = accountData.postalCode;
    if (accountData.description) dbData.description = accountData.description;
    if (accountData.customFields) {
      dbData.custom_fields = JSON.stringify(accountData.customFields);
    }

    return this.update(id, dbData);
  }

  static transformToAccountType(dbAccount: AccountTable): AccountType {
    return {
      id: dbAccount.id,
      name: dbAccount.name,
      ...(dbAccount.industry && { industry: dbAccount.industry }),
      ...(dbAccount.size && { size: dbAccount.size }),
      ...(dbAccount.website && { website: dbAccount.website }),
      ...(dbAccount.phone && { phone: dbAccount.phone }),
      ...(dbAccount.address && { address: dbAccount.address }),
      ...(dbAccount.city && { city: dbAccount.city }),
      ...(dbAccount.state && { state: dbAccount.state }),
      ...(dbAccount.country && { country: dbAccount.country }),
      ...(dbAccount.postal_code && { postalCode: dbAccount.postal_code }),
      ...(dbAccount.description && { description: dbAccount.description }),
      customFields: dbAccount.custom_fields ? JSON.parse(dbAccount.custom_fields) : {},
      metadata: {
        createdAt: dbAccount.created_at,
        updatedAt: dbAccount.updated_at,
        createdBy: dbAccount.created_by,
        isActive: dbAccount.is_active
      }
    };
  }
}