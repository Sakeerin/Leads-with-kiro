import request from 'supertest';
import app from '../src/index';

describe('Health Check', () => {
  it('should return 200 for health endpoint', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'lead-management-backend');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return API info for /api/v1', async () => {
    const response = await request(app)
      .get('/api/v1')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'Lead Management System API v1');
    expect(response.body).toHaveProperty('version', '1.0.0');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('message', 'Route not found');
  });
});