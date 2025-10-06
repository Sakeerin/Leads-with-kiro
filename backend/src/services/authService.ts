import jwt from 'jsonwebtoken';
// bcrypt is used in User model
import { User } from '../models/User';
import { UserRole, UserTable } from '../types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profile?: {
    phone?: string;
    department?: string;
    territory?: string;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export class AuthService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m';
  private static readonly REFRESH_TOKEN_EXPIRY = '7d';
  private static readonly JWT_SECRET = process.env['JWT_SECRET'] || 'your-secret-key';
  private static readonly JWT_REFRESH_SECRET = process.env['JWT_REFRESH_SECRET'] || 'your-refresh-secret-key';

  static generateTokens(user: UserTable): AuthTokens {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(
      { ...payload, type: 'access' },
      this.JWT_SECRET,
      { expiresIn: this.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { ...payload, type: 'refresh' },
      this.JWT_REFRESH_SECRET,
      { expiresIn: this.REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken };
  }

  static verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired access token');
    }
  }

  static verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as TokenPayload;
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async login(credentials: LoginRequest): Promise<{ user: UserTable; tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate tokens
    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  static async register(userData: RegisterRequest): Promise<{ user: UserTable; tokens: AuthTokens }> {
    const { email, password, firstName, lastName, role, profile } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate password strength
    this.validatePassword(password);

    // Create user
    const user = await User.createUser({
      email,
      password,
      firstName,
      lastName,
      role,
      isActive: true,
      profile: profile || {}
    });

    // Generate tokens
    const tokens = this.generateTokens(user);

    return { user, tokens };
  }

  static async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const decoded = this.verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is still active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Generate new tokens
    return this.generateTokens(user);
  }

  static async logout(userId: string): Promise<void> {
    // In a production system, you might want to blacklist the tokens
    // For now, we'll just update the last login time
    const user = await User.findById(userId);
    if (user) {
      await User.updateLastLogin(user.id);
    }
  }

  static validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      throw new Error('Password must contain at least one special character (@$!%*?&)');
    }
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isValidPassword = await User.verifyPassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Update password
    await User.updateUser(userId, { password: newPassword });
  }
}