import request from 'supertest';
import app from '../index';
import { User } from '../models/User';
import { UserRole } from '../types';

// Mock the User model
jest.mock('../models/User');
const MockedUser = User as jest.Mocked<typeof User>;

describe('Authentication Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: '$2a$12$hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.SALES,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      MockedUser.findByEmail.mockResolvedValue(undefined);
      MockedUser.createUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SALES
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 409 if user already exists', async () => {
      const existingUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: '$2a$12$hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.SALES,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      MockedUser.findByEmail.mockResolvedValue(existingUser);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SALES
        });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });

    it('should return 400 for invalid password', async () => {
      MockedUser.findByEmail.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.SALES
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: '$2a$12$hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.SALES,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      MockedUser.findByEmail.mockResolvedValue(mockUser);
      MockedUser.verifyPassword.mockResolvedValue(true);
      MockedUser.updateLastLogin.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should return 401 for invalid credentials', async () => {
      MockedUser.findByEmail.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });

    it('should return 401 for inactive user', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: '$2a$12$hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.SALES,
        is_active: false,
        created_at: new Date(),
        updated_at: new Date()
      };

      MockedUser.findByEmail.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('AUTHENTICATION_FAILED');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: '$2a$12$hashedpassword',
        first_name: 'John',
        last_name: 'Doe',
        role: UserRole.SALES,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      // First login to get token
      MockedUser.findByEmail.mockResolvedValue(mockUser);
      MockedUser.verifyPassword.mockResolvedValue(true);
      MockedUser.updateLastLogin.mockResolvedValue(undefined);

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      const token = loginResponse.body.data.tokens.accessToken;

      // Mock for profile request
      MockedUser.findById.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});