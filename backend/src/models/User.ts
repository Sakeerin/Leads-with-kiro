import { BaseModel } from './BaseModel';
import { User as UserType, UserTable, UserRole } from '../types';
import bcrypt from 'bcryptjs';

export class User extends BaseModel {
  protected static override tableName = 'users';

  static async findByEmail(email: string): Promise<UserTable | undefined> {
    return this.query.where('email', email).first();
  }

  static async findActiveUsers(): Promise<UserTable[]> {
    return this.query.where('is_active', true);
  }

  static async findByRole(role: UserRole): Promise<UserTable[]> {
    return this.query.where('role', role).where('is_active', true);
  }

  static async createUser(userData: Omit<UserType, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>): Promise<UserTable> {
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const dbData: Partial<UserTable> = {
      email: userData.email,
      password: hashedPassword,
      first_name: userData.firstName,
      last_name: userData.lastName,
      role: userData.role,
      is_active: userData.isActive
    };

    if (userData.profile.phone) dbData.profile_phone = userData.profile.phone;
    if (userData.profile.department) dbData.profile_department = userData.profile.department;
    if (userData.profile.territory) dbData.profile_territory = userData.profile.territory;
    if (userData.profile.workingHours) {
      dbData.profile_working_hours = JSON.stringify(userData.profile.workingHours);
    }

    return this.create(dbData);
  }

  static async updateUser(id: string, userData: Partial<UserType>): Promise<UserTable> {
    const dbData: Partial<UserTable> = {};
    
    if (userData.email) dbData.email = userData.email;
    if (userData.password) dbData.password = await bcrypt.hash(userData.password, 12);
    if (userData.firstName) dbData.first_name = userData.firstName;
    if (userData.lastName) dbData.last_name = userData.lastName;
    if (userData.role) dbData.role = userData.role;
    if (userData.isActive !== undefined) dbData.is_active = userData.isActive;
    
    if (userData.profile) {
      if (userData.profile.phone) dbData.profile_phone = userData.profile.phone;
      if (userData.profile.department) dbData.profile_department = userData.profile.department;
      if (userData.profile.territory) dbData.profile_territory = userData.profile.territory;
      if (userData.profile.workingHours) {
        dbData.profile_working_hours = JSON.stringify(userData.profile.workingHours);
      }
    }

    return this.update(id, dbData);
  }

  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static async updateLastLogin(id: string): Promise<void> {
    await this.update(id, { last_login_at: new Date() });
  }

  static transformToUserType(dbUser: UserTable): UserType {
    const user: UserType = {
      id: dbUser.id,
      email: dbUser.email,
      password: dbUser.password,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      role: dbUser.role,
      isActive: dbUser.is_active,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      profile: {
        ...(dbUser.profile_phone && { phone: dbUser.profile_phone }),
        ...(dbUser.profile_department && { department: dbUser.profile_department }),
        ...(dbUser.profile_territory && { territory: dbUser.profile_territory }),
        ...(dbUser.profile_working_hours && { workingHours: JSON.parse(dbUser.profile_working_hours) })
      }
    };

    if (dbUser.last_login_at) {
      user.lastLoginAt = dbUser.last_login_at;
    }

    return user;
  }
}