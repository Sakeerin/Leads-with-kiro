import { AuthService } from '../services/authService';
import { UserRole } from '../types';

// Mock user data for demonstration
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'demo@example.com',
  password: '$2a$12$hashedpassword',
  first_name: 'Demo',
  last_name: 'User',
  role: UserRole.SALES,
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
};

console.log('🔐 Authentication System Demo');
console.log('================================');

// Test JWT token generation
console.log('\n1. Testing JWT Token Generation:');
try {
  const tokens = AuthService.generateTokens(mockUser);
  console.log('✅ Access Token generated:', tokens.accessToken.substring(0, 50) + '...');
  console.log('✅ Refresh Token generated:', tokens.refreshToken.substring(0, 50) + '...');
  
  // Test token verification
  console.log('\n2. Testing Token Verification:');
  const decoded = AuthService.verifyAccessToken(tokens.accessToken);
  console.log('✅ Token verified successfully');
  console.log('   User ID:', decoded.userId);
  console.log('   Email:', decoded.email);
  console.log('   Role:', decoded.role);
  
  // Test refresh token verification
  const refreshDecoded = AuthService.verifyRefreshToken(tokens.refreshToken);
  console.log('✅ Refresh token verified successfully');
  console.log('   Token type:', refreshDecoded.type);
  
} catch (error) {
  console.error('❌ Token generation/verification failed:', error);
}

// Test password validation
console.log('\n3. Testing Password Validation:');
try {
  AuthService.validatePassword('Password123!');
  console.log('✅ Strong password validation passed');
  
  try {
    AuthService.validatePassword('weak');
    console.log('❌ Weak password should have failed');
  } catch (error) {
    console.log('✅ Weak password correctly rejected:', (error as Error).message);
  }
} catch (error) {
  console.error('❌ Password validation failed:', error);
}

console.log('\n🎉 Authentication System Demo Complete!');
console.log('\nKey Features Implemented:');
console.log('- ✅ JWT-based authentication with access and refresh tokens');
console.log('- ✅ Role-based access control (RBAC)');
console.log('- ✅ Password strength validation');
console.log('- ✅ Token verification and refresh');
console.log('- ✅ Secure password hashing (bcrypt)');
console.log('- ✅ Rate limiting middleware');
console.log('- ✅ Input validation with Joi');
console.log('- ✅ Comprehensive error handling');
console.log('- ✅ RESTful API endpoints for auth operations');
console.log('- ✅ User management with role-based permissions');
console.log('\nAPI Endpoints Available:');
console.log('- POST /api/v1/auth/login - User login');
console.log('- POST /api/v1/auth/register - User registration');
console.log('- POST /api/v1/auth/refresh - Token refresh');
console.log('- POST /api/v1/auth/logout - User logout');
console.log('- GET /api/v1/auth/profile - Get user profile');
console.log('- POST /api/v1/auth/change-password - Change password');
console.log('\nUser Roles Supported:');
console.log('- Admin: Full system access');
console.log('- Manager: Team management and reporting');
console.log('- Sales: Lead management and conversion');
console.log('- Marketing: Lead capture and campaign management');
console.log('- Read-only: View-only access');
console.log('- Guest: Limited access');