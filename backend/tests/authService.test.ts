import { AuthService } from '../src/services/authService';
import { User } from '../src/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ValidationError, UnauthorizedError } from '../src/utils/errors';

// Mock dependencies
jest.mock('../src/models/User');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

const MockedUser = User as jest.Mocked<typeof User>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      role: 'sales' as const
    };

    it('should register a new user successfully', async () => {
      MockedUser.findByEmail.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      MockedUser.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'sales',
        isActive: true,
        createdAt: new Date()
      } as any);

      const result = await AuthService.register(validUserData);

      expect(MockedUser.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(MockedUser.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedPassword',
        firstName: 'John',
        lastName: 'Doe',
        role: 'sales'
      });
      expect(result.id).toBe('user-123');
    });

    it('should throw ValidationError for existing email', async () => {
      MockedUser.findByEmail.mockResolvedValue({ id: 'existing-user' } as any);

      await expect(AuthService.register(validUserData)).rejects.toThrow(ValidationError);
      expect(MockedUser.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw ValidationError for invalid email format', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      await expect(AuthService.register(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for weak password', async () => {
      const invalidData = { ...validUserData, password: 'weak' };

      await expect(AuthService.register(invalidData)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidData = { ...validUserData, firstName: '' };

      await expect(AuthService.register(invalidData)).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      password: 'hashedPassword',
      firstName: 'John',
      lastName: 'Doe',
      role: 'sales',
      isActive: true,
      lastLoginAt: null
    } as any;

    it('should login successfully with valid credentials', async () => {
      MockedUser.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      MockedUser.updateLastLogin.mockResolvedValue(undefined);

      const result = await AuthService.login('test@example.com', 'Password123!');

      expect(MockedUser.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashedPassword');
      expect(MockedUser.updateLastLogin).toHaveBeenCalledWith('user-123');
      expect(result.user.id).toBe('user-123');
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      MockedUser.findByEmail.mockResolvedValue(null);

      await expect(AuthService.login('test@example.com', 'password')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for incorrect password', async () => {
      MockedUser.findByEmail.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.login('test@example.com', 'wrongpassword')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      MockedUser.findByEmail.mockResolvedValue(inactiveUser);

      await expect(AuthService.login('test@example.com', 'Password123!')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockPayload = { userId: 'user-123', type: 'refresh' };
      mockedJwt.verify.mockReturnValue(mockPayload as any);
      MockedUser.findById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        isActive: true
      } as any);
      mockedJwt.sign.mockReturnValue('new-access-token');

      const result = await AuthService.refreshToken('valid-refresh-token');

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-refresh-token', process.env.JWT_REFRESH_SECRET);
      expect(MockedUser.findById).toHaveBeenCalledWith('user-123');
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedError for invalid refresh token', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedError);
    });

    it('should throw UnauthorizedError for non-existent user', async () => {
      const mockPayload = { userId: 'user-123', type: 'refresh' };
      mockedJwt.verify.mockReturnValue(mockPayload as any);
      MockedUser.findById.mockResolvedValue(null);

      await expect(AuthService.refreshToken('valid-refresh-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('validatePassword', () => {
    it('should accept strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'C0mplex#Password',
        'Secure$Pass1'
      ];

      strongPasswords.forEach(password => {
        expect(() => AuthService.validatePassword(password)).not.toThrow();
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password',      // no uppercase, no numbers, no special chars
        'PASSWORD',      // no lowercase, no numbers, no special chars
        'Password',      // no numbers, no special chars
        'Password123',   // no special chars
        'Pass123!',      // too short
        '12345678',      // no letters, no special chars
        '!@#$%^&*'       // no letters, no numbers
      ];

      weakPasswords.forEach(password => {
        expect(() => AuthService.validatePassword(password)).toThrow(ValidationError);
      });
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com'
      ];

      validEmails.forEach(email => {
        expect(() => AuthService.validateEmail(email)).not.toThrow();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user.domain.com',
        'user@domain.',
        ''
      ];

      invalidEmails.forEach(email => {
        expect(() => AuthService.validateEmail(email)).toThrow(ValidationError);
      });
    });
  });

  describe('verifyToken', () => {
    it('should verify valid access token', async () => {
      const mockPayload = { userId: 'user-123', type: 'access' };
      mockedJwt.verify.mockReturnValue(mockPayload as any);
      MockedUser.findById.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        isActive: true
      } as any);

      const result = await AuthService.verifyToken('valid-access-token');

      expect(mockedJwt.verify).toHaveBeenCalledWith('valid-access-token', process.env.JWT_SECRET);
      expect(MockedUser.findById).toHaveBeenCalledWith('user-123');
      expect(result.id).toBe('user-123');
    });

    it('should throw UnauthorizedError for invalid token', async () => {
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.verifyToken('invalid-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user-123',
        password: 'oldHashedPassword'
      } as any;

      MockedUser.findById.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(true);
      mockedBcrypt.hash.mockResolvedValue('newHashedPassword');
      MockedUser.updatePassword.mockResolvedValue(undefined);

      await AuthService.changePassword('user-123', 'oldPassword', 'NewPassword123!');

      expect(MockedUser.findById).toHaveBeenCalledWith('user-123');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('oldPassword', 'oldHashedPassword');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
      expect(MockedUser.updatePassword).toHaveBeenCalledWith('user-123', 'newHashedPassword');
    });

    it('should throw UnauthorizedError for incorrect old password', async () => {
      const mockUser = {
        id: 'user-123',
        password: 'oldHashedPassword'
      } as any;

      MockedUser.findById.mockResolvedValue(mockUser);
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(AuthService.changePassword('user-123', 'wrongOldPassword', 'NewPassword123!'))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});