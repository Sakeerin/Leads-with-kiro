import request from 'supertest';
import app from '../src/index';
import { AuthService } from '../src/services/authService';
import { MfaService } from '../src/services/mfaService';
import { AuditService } from '../src/services/auditService';

// Mock services
jest.mock('../src/services/authService');
jest.mock('../src/services/mfaService');
jest.mock('../src/services/auditService');

const MockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const MockedMfaService = MfaService as jest.Mocked<typeof MfaService>;
const MockedAuditService = AuditService as jest.Mocked<typeof AuditService>;

describe('Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Security', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should prevent brute force attacks with rate limiting', async () => {
        const loginData = {
          email: 'test@example.com',
          password: 'wrongpassword'
        };

        MockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

        // Make multiple failed login attempts
        const promises = Array(6).fill(null).map(() =>
          request(app)
            .post('/api/v1/auth/login')
            .send(loginData)
        );

        const responses = await Promise.all(promises);
        
        // Should get rate limited after 5 attempts
        const rateLimitedResponse = responses[5];
        expect(rateLimitedResponse.status).toBe(429);
        expect(rateLimitedResponse.body.error.message).toContain('rate limit');
      });

      it('should sanitize input to prevent injection attacks', async () => {
        const maliciousData = {
          email: "'; DROP TABLE users; --",
          password: '<script>alert("xss")</script>'
        };

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send(maliciousData);

        // Should validate and reject malicious input
        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('validation');
      });

      it('should log failed authentication attempts', async () => {
        MockedAuthService.login.mockRejectedValue(new Error('Invalid credentials'));
        MockedAuditService.logSecurityEvent.mockResolvedValue(undefined);

        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'test@example.com',
            password: 'wrongpassword'
          });

        expect(MockedAuditService.logSecurityEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'FAILED_LOGIN',
            email: 'test@example.com'
          })
        );
      });
    });

    describe('JWT Token Security', () => {
      it('should reject expired tokens', async () => {
        const expiredToken = 'expired.jwt.token';
        MockedAuthService.verifyToken.mockRejectedValue(new Error('Token expired'));

        const response = await request(app)
          .get('/api/v1/leads')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
        expect(response.body.error.message).toContain('unauthorized');
      });

      it('should reject malformed tokens', async () => {
        const malformedToken = 'malformed-token';

        const response = await request(app)
          .get('/api/v1/leads')
          .set('Authorization', `Bearer ${malformedToken}`);

        expect(response.status).toBe(401);
      });

      it('should validate token signature', async () => {
        const tamperedToken = 'header.tampered-payload.signature';
        MockedAuthService.verifyToken.mockRejectedValue(new Error('Invalid signature'));

        const response = await request(app)
          .get('/api/v1/leads')
          .set('Authorization', `Bearer ${tamperedToken}`);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Authorization Security', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'sales',
      permissions: ['leads:read', 'leads:write']
    };

    beforeEach(() => {
      MockedAuthService.verifyToken.mockResolvedValue(mockUser as any);
    });

    it('should enforce role-based access control', async () => {
      // Mock user with limited permissions
      const limitedUser = { ...mockUser, role: 'read-only', permissions: ['leads:read'] };
      MockedAuthService.verifyToken.mockResolvedValue(limitedUser as any);

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .send({
          company: { name: 'Test Company' },
          contact: { name: 'John Doe', email: 'john@test.com' }
        });

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('permission');
    });

    it('should prevent privilege escalation', async () => {
      // Regular user trying to access admin endpoints
      const response = await request(app)
        .post('/api/v1/admin/users')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'newuser@example.com',
          role: 'admin'
        });

      expect(response.status).toBe(403);
    });

    it('should validate resource ownership', async () => {
      // User trying to access another user's data
      const response = await request(app)
        .get('/api/v1/users/other-user-id')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(403);
    });
  });

  describe('Input Validation Security', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'sales',
      permissions: ['leads:write']
    };

    beforeEach(() => {
      MockedAuthService.verifyToken.mockResolvedValue(mockUser as any);
    });

    it('should prevent XSS attacks in lead creation', async () => {
      const xssPayload = {
        company: { name: '<script>alert("xss")</script>' },
        contact: {
          name: '<img src=x onerror=alert("xss")>',
          email: 'test@example.com'
        }
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .send(xssPayload);

      // Should sanitize or reject malicious input
      expect(response.status).toBe(400);
    });

    it('should prevent SQL injection in search queries', async () => {
      const sqlInjectionPayload = "'; DROP TABLE leads; --";

      const response = await request(app)
        .get('/api/v1/leads/search')
        .query({ q: sqlInjectionPayload })
        .set('Authorization', 'Bearer valid-token');

      // Should handle malicious query safely
      expect(response.status).not.toBe(500);
    });

    it('should validate file upload security', async () => {
      const response = await request(app)
        .post('/api/v1/leads/lead-123/attachments')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', Buffer.from('malicious content'), 'malware.exe');

      // Should reject dangerous file types
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain('file type');
    });

    it('should enforce file size limits', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB file

      const response = await request(app)
        .post('/api/v1/leads/lead-123/attachments')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', largeBuffer, 'large-file.pdf');

      expect(response.status).toBe(413);
      expect(response.body.error.message).toContain('file size');
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should require MFA for sensitive operations', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'admin',
        mfaEnabled: true
      };

      MockedAuthService.verifyToken.mockResolvedValue(mockUser as any);
      MockedMfaService.verifyToken.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/v1/leads/lead-123')
        .set('Authorization', 'Bearer valid-token')
        .set('X-MFA-Token', 'invalid-mfa-token');

      expect(response.status).toBe(403);
      expect(response.body.error.message).toContain('MFA');
    });

    it('should validate TOTP codes correctly', async () => {
      MockedMfaService.verifyToken.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/v1/auth/verify-mfa')
        .send({
          userId: 'user-123',
          token: '123456'
        });

      expect(MockedMfaService.verifyToken).toHaveBeenCalledWith('user-123', '123456');
      expect(response.status).toBe(200);
    });
  });

  describe('Session Security', () => {
    it('should invalidate sessions on logout', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      
      // Subsequent requests with the same token should fail
      const protectedResponse = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token');

      expect(protectedResponse.status).toBe(401);
    });

    it('should handle concurrent sessions properly', async () => {
      // Test multiple active sessions for the same user
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'sales'
      };

      MockedAuthService.verifyToken.mockResolvedValue(mockUser as any);

      const responses = await Promise.all([
        request(app).get('/api/v1/leads').set('Authorization', 'Bearer token1'),
        request(app).get('/api/v1/leads').set('Authorization', 'Bearer token2'),
        request(app).get('/api/v1/leads').set('Authorization', 'Bearer token3')
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Audit Logging', () => {
    it('should log all security-relevant events', async () => {
      MockedAuditService.logSecurityEvent.mockResolvedValue(undefined);

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      expect(MockedAuditService.logSecurityEvent).toHaveBeenCalled();
    });

    it('should include relevant context in audit logs', async () => {
      MockedAuditService.logSecurityEvent.mockResolvedValue(undefined);

      await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password'
        });

      expect(MockedAuditService.logSecurityEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.any(String),
          userId: expect.any(String),
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('GDPR Compliance', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      role: 'admin',
      permissions: ['gdpr:export', 'gdpr:delete']
    };

    beforeEach(() => {
      MockedAuthService.verifyToken.mockResolvedValue(mockUser as any);
    });

    it('should allow data export requests', async () => {
      const response = await request(app)
        .post('/api/v1/gdpr/export')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'user@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('exportId');
    });

    it('should allow data deletion requests', async () => {
      const response = await request(app)
        .post('/api/v1/gdpr/delete')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'user@example.com',
          reason: 'User requested deletion'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('deletionId');
    });

    it('should require proper authorization for GDPR operations', async () => {
      const limitedUser = { ...mockUser, permissions: ['leads:read'] };
      MockedAuthService.verifyToken.mockResolvedValue(limitedUser as any);

      const response = await request(app)
        .post('/api/v1/gdpr/export')
        .set('Authorization', 'Bearer valid-token')
        .send({
          email: 'user@example.com'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('API Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/v1')
        .expect(200);

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });

    it('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .options('/api/v1/leads')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
      expect(response.headers).toHaveProperty('access-control-allow-headers');
    });
  });
});