import request from 'supertest';
import app from '../src/index';

describe('Lead API Endpoints', () => {
  describe('GET /api/v1/leads', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/leads/search')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/leads', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .send({
          company: { name: 'Test Company' },
          contact: { name: 'John Doe', email: 'john@test.com' },
          source: { channel: 'web_form' }
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/leads/statistics', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/leads/statistics')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/leads/detect-duplicates', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/leads/detect-duplicates')
        .send({
          email: 'test@example.com'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });
});