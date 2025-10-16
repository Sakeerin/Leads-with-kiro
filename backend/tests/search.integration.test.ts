import request from 'supertest';
import app from '../src/index';
import { SearchService } from '../src/services/searchService';

describe('Search Integration Tests', () => {
  let authToken: string;

  beforeAll(async () => {
    // Create a test user and get auth token
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'searchtest@example.com',
        password: 'password123',
        firstName: 'Search',
        lastName: 'Test',
        role: 'sales'
      });

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'searchtest@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // Initialize search service
    SearchService.initialize();
  });

  describe('Search API Endpoints', () => {
    it('should perform search with fallback when Elasticsearch is not available', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          searchTerm: 'test',
          page: 1,
          size: 10
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('leads');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.leads)).toBe(true);
    });

    it('should get search suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          term: 'test',
          types: 'company,contact'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty suggestions for short terms', async () => {
      const response = await request(app)
        .get('/api/v1/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          term: 'a'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should check search health', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('elasticsearch');
    });
  });

  describe('Saved Search API Endpoints', () => {
    let savedSearchId: string;

    it('should create a saved search', async () => {
      const searchData = {
        name: 'Integration Test Search',
        query: {
          searchTerm: 'test company',
          filters: {
            status: ['new', 'contacted']
          }
        },
        isPublic: false
      };

      const response = await request(app)
        .post('/api/v1/saved-searches')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe('Integration Test Search');
      
      savedSearchId = response.body.data.id;
    });

    it('should get user saved searches', async () => {
      const response = await request(app)
        .get('/api/v1/saved-searches')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get a specific saved search', async () => {
      const response = await request(app)
        .get(`/api/v1/saved-searches/${savedSearchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(savedSearchId);
    });

    it('should update a saved search', async () => {
      const updateData = {
        name: 'Updated Integration Test Search',
        isPublic: true
      };

      const response = await request(app)
        .put(`/api/v1/saved-searches/${savedSearchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Integration Test Search');
      expect(response.body.data.isPublic).toBe(true);
    });

    it('should generate shareable URL', async () => {
      const response = await request(app)
        .get(`/api/v1/saved-searches/${savedSearchId}/share`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data.url).toContain(savedSearchId);
    });

    it('should get public saved searches', async () => {
      const response = await request(app)
        .get('/api/v1/saved-searches/public');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should delete a saved search', async () => {
      const response = await request(app)
        .delete(`/api/v1/saved-searches/${savedSearchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for deleted saved search', async () => {
      const response = await request(app)
        .get(`/api/v1/saved-searches/${savedSearchId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Search Validation', () => {
    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 0, // Invalid page
          size: 200 // Invalid size
        });

      expect(response.status).toBe(500); // Should handle validation error
    });

    it('should require authentication for search endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/search');

      expect(response.status).toBe(401);
    });

    it('should validate saved search creation', async () => {
      const response = await request(app)
        .post('/api/v1/saved-searches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty name should fail
          query: { searchTerm: 'test' }
        });

      expect(response.status).toBe(400);
    });
  });
});