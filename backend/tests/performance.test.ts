import request from 'supertest';
import app from '../src/index';
import { performance } from 'perf_hooks';
import { AuthService } from '../src/services/authService';
import { LeadService } from '../src/services/leadService';
import { SearchService } from '../src/services/searchService';
import { ReportingService } from '../src/services/reportingService';

// Mock services
jest.mock('../src/services/authService');
jest.mock('../src/services/leadService');
jest.mock('../src/services/searchService');
jest.mock('../src/services/reportingService');

const MockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const MockedLeadService = LeadService as jest.Mocked<typeof LeadService>;
const MockedSearchService = SearchService as jest.Mocked<typeof SearchService>;
const MockedReportingService = ReportingService as jest.Mocked<typeof ReportingService>;

describe('Performance Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'sales',
    permissions: ['leads:read', 'leads:write']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockedAuthService.verifyToken.mockResolvedValue(mockUser as any);
  });

  describe('Lead Creation Performance', () => {
    const leadData = {
      company: { name: 'Test Company', industry: 'Technology' },
      contact: { name: 'John Doe', email: 'john@test.com', phone: '+1234567890' },
      source: { channel: 'web_form', campaign: 'Test Campaign' }
    };

    it('should create leads within acceptable time limits', async () => {
      const mockLead = {
        id: 'lead-123',
        accountLeadId: 'AL-24-01-001',
        ...leadData
      };

      MockedLeadService.createLead.mockResolvedValue(mockLead as any);

      const startTime = performance.now();
      
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .send(leadData)
        .expect(201);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Lead creation should complete within 500ms
      expect(responseTime).toBeLessThan(500);
      expect(response.body.data.id).toBe('lead-123');
    });

    it('should handle concurrent lead creation efficiently', async () => {
      MockedLeadService.createLead.mockImplementation(async () => {
        // Simulate database operation delay
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          id: `lead-${Math.random()}`,
          accountLeadId: `AL-24-01-${Math.floor(Math.random() * 1000)}`,
          ...leadData
        } as any;
      });

      const concurrentRequests = 10;
      const startTime = performance.now();

      const promises = Array(concurrentRequests).fill(null).map(() =>
        request(app)
          .post('/api/v1/leads')
          .set('Authorization', 'Bearer valid-token')
          .send(leadData)
      );

      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should complete successfully
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Concurrent requests should not take significantly longer than sequential
      // Allow for some overhead but should be much less than 10 * 500ms
      expect(totalTime).toBeLessThan(2000);
    });

    it('should maintain performance under load', async () => {
      MockedLeadService.createLead.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return {
          id: `lead-${Math.random()}`,
          accountLeadId: `AL-24-01-${Math.floor(Math.random() * 1000)}`,
          ...leadData
        } as any;
      });

      const loadTestRequests = 50;
      const batchSize = 10;
      const responseTimes: number[] = [];

      for (let i = 0; i < loadTestRequests; i += batchSize) {
        const batch = Array(Math.min(batchSize, loadTestRequests - i)).fill(null).map(async () => {
          const startTime = performance.now();
          
          const response = await request(app)
            .post('/api/v1/leads')
            .set('Authorization', 'Bearer valid-token')
            .send(leadData);

          const endTime = performance.now();
          responseTimes.push(endTime - startTime);
          
          return response;
        });

        await Promise.all(batch);
      }

      // Calculate performance metrics
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(200); // Average response time under 200ms
      expect(maxResponseTime).toBeLessThan(1000); // No request takes longer than 1s
      expect(p95ResponseTime).toBeLessThan(500); // 95% of requests under 500ms
    });
  });

  describe('Search Performance', () => {
    const mockSearchResults = {
      leads: Array(20).fill(null).map((_, index) => ({
        id: `lead-${index}`,
        accountLeadId: `AL-24-01-${String(index).padStart(3, '0')}`,
        company: { name: `Company ${index}` },
        contact: { name: `Contact ${index}`, email: `contact${index}@example.com` },
        status: 'new'
      })),
      pagination: {
        total: 1000,
        page: 1,
        limit: 20,
        totalPages: 50
      }
    };

    it('should perform text search efficiently', async () => {
      MockedSearchService.searchLeads.mockResolvedValue(mockSearchResults as any);

      const startTime = performance.now();

      const response = await request(app)
        .get('/api/v1/leads/search')
        .query({ q: 'test company', page: 1, limit: 20 })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Search should complete within 300ms
      expect(responseTime).toBeLessThan(300);
      expect(response.body.data.leads).toHaveLength(20);
    });

    it('should handle complex filter queries efficiently', async () => {
      MockedSearchService.searchLeads.mockResolvedValue(mockSearchResults as any);

      const complexQuery = {
        q: 'technology company',
        status: 'new,contacted',
        industry: 'technology',
        scoreMin: 50,
        scoreMax: 100,
        createdAfter: '2024-01-01',
        createdBefore: '2024-12-31',
        page: 1,
        limit: 20
      };

      const startTime = performance.now();

      const response = await request(app)
        .get('/api/v1/leads/search')
        .query(complexQuery)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Complex search should still complete within 500ms
      expect(responseTime).toBeLessThan(500);
      expect(response.body.data.leads).toHaveLength(20);
    });

    it('should maintain search performance with pagination', async () => {
      MockedSearchService.searchLeads.mockResolvedValue(mockSearchResults as any);

      const pages = [1, 5, 10, 25, 50];
      const responseTimes: number[] = [];

      for (const page of pages) {
        const startTime = performance.now();

        await request(app)
          .get('/api/v1/leads/search')
          .query({ q: 'test', page, limit: 20 })
          .set('Authorization', 'Bearer valid-token')
          .expect(200);

        const endTime = performance.now();
        responseTimes.push(endTime - startTime);
      }

      // All page requests should be consistently fast
      responseTimes.forEach(time => {
        expect(time).toBeLessThan(400);
      });

      // Performance should not degrade significantly with higher page numbers
      const firstPageTime = responseTimes[0];
      const lastPageTime = responseTimes[responseTimes.length - 1];
      expect(lastPageTime).toBeLessThan(firstPageTime * 2);
    });
  });

  describe('Reporting Performance', () => {
    const mockReportData = {
      funnelMetrics: {
        totalLeads: 1000,
        newLeads: 300,
        contactedLeads: 250,
        qualifiedLeads: 150,
        convertedLeads: 50,
        conversionRate: 0.05
      },
      sourceEffectiveness: Array(10).fill(null).map((_, index) => ({
        source: `Source ${index}`,
        leads: Math.floor(Math.random() * 100),
        conversions: Math.floor(Math.random() * 20),
        conversionRate: Math.random()
      })),
      performanceMetrics: Array(30).fill(null).map((_, index) => ({
        date: new Date(2024, 0, index + 1),
        leadsCreated: Math.floor(Math.random() * 50),
        leadsContacted: Math.floor(Math.random() * 40),
        leadsConverted: Math.floor(Math.random() * 10)
      }))
    };

    it('should generate dashboard reports efficiently', async () => {
      MockedReportingService.getDashboardMetrics.mockResolvedValue(mockReportData as any);

      const startTime = performance.now();

      const response = await request(app)
        .get('/api/v1/reporting/dashboard')
        .query({ 
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Dashboard report should complete within 1 second
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.data.funnelMetrics).toBeDefined();
    });

    it('should handle large dataset reports efficiently', async () => {
      const largeDataset = {
        ...mockReportData,
        performanceMetrics: Array(365).fill(null).map((_, index) => ({
          date: new Date(2024, 0, index + 1),
          leadsCreated: Math.floor(Math.random() * 50),
          leadsContacted: Math.floor(Math.random() * 40),
          leadsConverted: Math.floor(Math.random() * 10)
        }))
      };

      MockedReportingService.getDetailedReport.mockResolvedValue(largeDataset as any);

      const startTime = performance.now();

      const response = await request(app)
        .get('/api/v1/reporting/detailed')
        .query({ 
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          granularity: 'daily'
        })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Large dataset report should complete within 2 seconds
      expect(responseTime).toBeLessThan(2000);
      expect(response.body.data.performanceMetrics).toHaveLength(365);
    });

    it('should cache report data for improved performance', async () => {
      MockedReportingService.getDashboardMetrics.mockResolvedValue(mockReportData as any);

      // First request
      const startTime1 = performance.now();
      await request(app)
        .get('/api/v1/reporting/dashboard')
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      const endTime1 = performance.now();
      const firstRequestTime = endTime1 - startTime1;

      // Second identical request (should be cached)
      const startTime2 = performance.now();
      await request(app)
        .get('/api/v1/reporting/dashboard')
        .query({ startDate: '2024-01-01', endDate: '2024-12-31' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      const endTime2 = performance.now();
      const secondRequestTime = endTime2 - startTime2;

      // Cached request should be significantly faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
    });
  });

  describe('Database Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const bulkData = {
        leadIds: Array(100).fill(null).map((_, index) => `lead-${index}`),
        status: 'contacted'
      };

      MockedLeadService.bulkUpdateStatus.mockImplementation(async () => {
        // Simulate bulk database operation
        await new Promise(resolve => setTimeout(resolve, 200));
        return {
          successful: bulkData.leadIds,
          failed: []
        } as any;
      });

      const startTime = performance.now();

      const response = await request(app)
        .post('/api/v1/leads/bulk/update-status')
        .set('Authorization', 'Bearer valid-token')
        .send(bulkData)
        .expect(200);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Bulk operation should complete within 1 second
      expect(responseTime).toBeLessThan(1000);
      expect(response.body.data.successful).toHaveLength(100);
    });

    it('should optimize query performance with proper indexing', async () => {
      // This test would verify that database queries use proper indexes
      // In a real scenario, this would involve database query analysis
      
      MockedLeadService.searchLeads.mockImplementation(async (criteria) => {
        // Simulate indexed vs non-indexed query performance
        const hasOptimalIndexes = criteria.filters?.email || criteria.filters?.accountLeadId;
        const delay = hasOptimalIndexes ? 50 : 500;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return mockSearchResults as any;
      });

      // Test indexed query (should be fast)
      const startTime1 = performance.now();
      await request(app)
        .get('/api/v1/leads/search')
        .query({ email: 'test@example.com' })
        .set('Authorization', 'Bearer valid-token');
      const endTime1 = performance.now();
      const indexedQueryTime = endTime1 - startTime1;

      // Test non-indexed query (should be slower)
      const startTime2 = performance.now();
      await request(app)
        .get('/api/v1/leads/search')
        .query({ customField: 'some value' })
        .set('Authorization', 'Bearer valid-token');
      const endTime2 = performance.now();
      const nonIndexedQueryTime = endTime2 - startTime2;

      // Indexed queries should be significantly faster
      expect(indexedQueryTime).toBeLessThan(200);
      expect(nonIndexedQueryTime).toBeGreaterThan(indexedQueryTime * 2);
    });
  });

  describe('Memory Performance', () => {
    it('should not have memory leaks during sustained operations', async () => {
      MockedLeadService.createLead.mockImplementation(async () => {
        return {
          id: `lead-${Math.random()}`,
          accountLeadId: `AL-24-01-${Math.floor(Math.random() * 1000)}`
        } as any;
      });

      const initialMemory = process.memoryUsage();
      
      // Perform many operations
      const operations = 100;
      for (let i = 0; i < operations; i++) {
        await request(app)
          .post('/api/v1/leads')
          .set('Authorization', 'Bearer valid-token')
          .send({
            company: { name: `Company ${i}` },
            contact: { name: `Contact ${i}`, email: `contact${i}@example.com` },
            source: { channel: 'web_form' }
          });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('API Response Time SLA', () => {
    const slaRequirements = {
      'GET /api/v1/leads/:id': 200,           // Single lead retrieval: 200ms
      'POST /api/v1/leads': 500,              // Lead creation: 500ms
      'PUT /api/v1/leads/:id': 300,           // Lead update: 300ms
      'GET /api/v1/leads/search': 400,        // Search: 400ms
      'GET /api/v1/reporting/dashboard': 1000  // Dashboard: 1000ms
    };

    Object.entries(slaRequirements).forEach(([endpoint, maxTime]) => {
      it(`should meet SLA for ${endpoint} (${maxTime}ms)`, async () => {
        // Mock appropriate service based on endpoint
        if (endpoint.includes('reporting')) {
          MockedReportingService.getDashboardMetrics.mockResolvedValue({} as any);
        } else if (endpoint.includes('search')) {
          MockedSearchService.searchLeads.mockResolvedValue(mockSearchResults as any);
        } else {
          MockedLeadService.getLeadById.mockResolvedValue({} as any);
          MockedLeadService.createLead.mockResolvedValue({} as any);
          MockedLeadService.updateLead.mockResolvedValue({} as any);
        }

        const startTime = performance.now();
        
        // Make appropriate request based on endpoint
        let request_builder = request(app);
        if (endpoint.includes('POST')) {
          request_builder = request_builder.post('/api/v1/leads').send({
            company: { name: 'Test' },
            contact: { name: 'Test', email: 'test@example.com' }
          });
        } else if (endpoint.includes('PUT')) {
          request_builder = request_builder.put('/api/v1/leads/test-id').send({});
        } else if (endpoint.includes('search')) {
          request_builder = request_builder.get('/api/v1/leads/search');
        } else if (endpoint.includes('reporting')) {
          request_builder = request_builder.get('/api/v1/reporting/dashboard');
        } else {
          request_builder = request_builder.get('/api/v1/leads/test-id');
        }

        await request_builder.set('Authorization', 'Bearer valid-token');
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(responseTime).toBeLessThan(maxTime);
      });
    });
  });
});