import { BaseModel } from './BaseModel';
import { Contact as ContactType, ContactTable } from '../types';

export class Contact extends BaseModel {
  protected static override tableName = 'contacts';

  static async findByAccountId(accountId: string): Promise<ContactTable[]> {
    return this.query.where('account_id', accountId).where('is_active', true);
  }

  static async findByEmail(email: string): Promise<ContactTable[]> {
    return this.query.where('email', 'ilike', email).where('is_active', true);
  }

  static async findPrimaryContact(accountId: string): Promise<ContactTable | undefined> {
    return this.query
      .where('account_id', accountId)
      .where('is_primary', true)
      .where('is_active', true)
      .first();
  }

  static async searchContacts(searchTerm: string, accountId?: string, limit: number = 10): Promise<ContactTable[]> {
    let query = this.query.where('is_active', true);

    if (accountId) {
      query = query.where('account_id', accountId);
    }

    return query
      .where(function() {
        this.where('first_name', 'ilike', `%${searchTerm}%`)
          .orWhere('last_name', 'ilike', `%${searchTerm}%`)
          .orWhere('email', 'ilike', `%${searchTerm}%`);
      })
      .orderBy('first_name')
      .orderBy('last_name')
      .limit(limit);
  }

  static async createContact(contactData: Omit<ContactType, 'id' | 'metadata'>): Promise<ContactTable> {
    const dbData: Partial<ContactTable> = {
      account_id: contactData.accountId,
      first_name: contactData.firstName,
      last_name: contactData.lastName,
      email: contactData.email,
      ...(contactData.phone && { phone: contactData.phone }),
      ...(contactData.mobile && { mobile: contactData.mobile }),
      ...(contactData.title && { title: contactData.title }),
      ...(contactData.department && { department: contactData.department }),
      is_primary: contactData.isPrimary,
      is_decision_maker: contactData.isDecisionMaker,
      ...(contactData.customFields && Object.keys(contactData.customFields).length > 0 && { 
        custom_fields: JSON.stringify(contactData.customFields) 
      }),
      is_active: true
    };

    return this.create(dbData);
  }

  static async updateContact(id: string, contactData: Partial<ContactType>): Promise<ContactTable> {
    const dbData: Partial<ContactTable> = {};
    
    if (contactData.accountId) dbData.account_id = contactData.accountId;
    if (contactData.firstName) dbData.first_name = contactData.firstName;
    if (contactData.lastName) dbData.last_name = contactData.lastName;
    if (contactData.email) dbData.email = contactData.email;
    if (contactData.phone) dbData.phone = contactData.phone;
    if (contactData.mobile) dbData.mobile = contactData.mobile;
    if (contactData.title) dbData.title = contactData.title;
    if (contactData.department) dbData.department = contactData.department;
    if (contactData.isPrimary !== undefined) dbData.is_primary = contactData.isPrimary;
    if (contactData.isDecisionMaker !== undefined) dbData.is_decision_maker = contactData.isDecisionMaker;
    if (contactData.customFields) {
      dbData.custom_fields = JSON.stringify(contactData.customFields);
    }

    return this.update(id, dbData);
  }

  static async setPrimaryContact(accountId: string, contactId: string): Promise<void> {
    // First, unset all primary contacts for this account
    await this.query
      .where('account_id', accountId)
      .update({ is_primary: false });

    // Then set the specified contact as primary
    await this.query
      .where('id', contactId)
      .where('account_id', accountId)
      .update({ is_primary: true });
  }

  static transformToContactType(dbContact: ContactTable): ContactType {
    return {
      id: dbContact.id,
      accountId: dbContact.account_id,
      firstName: dbContact.first_name,
      lastName: dbContact.last_name,
      email: dbContact.email,
      ...(dbContact.phone && { phone: dbContact.phone }),
      ...(dbContact.mobile && { mobile: dbContact.mobile }),
      ...(dbContact.title && { title: dbContact.title }),
      ...(dbContact.department && { department: dbContact.department }),
      isPrimary: dbContact.is_primary,
      isDecisionMaker: dbContact.is_decision_maker,
      customFields: dbContact.custom_fields ? JSON.parse(dbContact.custom_fields) : {},
      metadata: {
        createdAt: dbContact.created_at,
        updatedAt: dbContact.updated_at,
        createdBy: dbContact.created_by,
        isActive: dbContact.is_active
      }
    };
  }
}