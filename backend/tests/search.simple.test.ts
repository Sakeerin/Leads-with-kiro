import { SearchService } from '../src/services/searchService';
import { SavedSearchService } from '../src/services/savedSearchService';

describe('Search Service - Simple Tests', () => {
  beforeAll(() => {
    // Initialize search service
    SearchService.initialize();
  });

  describe('Search Service Initialization', () => {
    it('should initialize without throwing errors', () => {
      expect(() => SearchService.initialize()).not.toThrow();
    });

    it('should check Elasticsearch availability', async () => {
      const isAvailable = await SearchService.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
  });

  describe('Search Functionality', () => {
    it('should perform fallback search', async () => {
      const searchQuery = {
        searchTerm: 'test',
        page: 1,
        size: 10
      };

      const result = await SearchService.search(searchQuery);
      
      expect(result).toHaveProperty('leads');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.leads)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should handle empty search term', async () => {
      const searchQuery = {
        page: 1,
        size: 10
      };

      const result = await SearchService.search(searchQuery);
      
      expect(result).toHaveProperty('leads');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.leads)).toBe(true);
    });

    it('should return empty suggestions for short terms', async () => {
      const suggestions = await SearchService.getSuggestions('a');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0);
    });

    it('should return empty suggestions for empty term', async () => {
      const suggestions = await SearchService.getSuggestions('');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Lead Indexing', () => {
    it('should index lead without error', async () => {
      const mockLead = {
        id: 'test-lead-id',
        accountLeadId: 'AL-25-10-001',
        company: {
          name: 'Test Company',
          industry: 'Technology'
        },
        contact: {
          name: 'John Doe',
          email: 'john@testcompany.com',
          phone: '+1234567890'
        },
        source: {
          channel: 'web_form' as any,
          campaign: 'Test Campaign'
        },
        assignment: {},
        status: 'new' as any,
        score: {
          value: 75,
          band: 'warm' as any,
          lastCalculated: new Date()
        },
        qualification: {},
        followUp: {},
        product: {},
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'test-user',
          isActive: true
        },
        customFields: {}
      };

      // This should not throw an error even if Elasticsearch is not available
      await expect(SearchService.indexLead(mockLead)).resolves.not.toThrow();
    });

    it('should remove lead from index without error', async () => {
      await expect(SearchService.removeLead('test-lead-id')).resolves.not.toThrow();
    });
  });

  describe('Saved Search Service Validation', () => {
    it('should validate search name requirement', async () => {
      const searchData = {
        name: '',
        query: { searchTerm: 'test' },
        userId: 'test-user-id'
      };

      await expect(
        SavedSearchService.createSavedSearch(searchData)
      ).rejects.toThrow('Search name is required');
    });

    it('should validate search name length', async () => {
      const longName = 'a'.repeat(256);
      const searchData = {
        name: longName,
        query: { searchTerm: 'test' },
        userId: 'test-user-id'
      };

      await expect(
        SavedSearchService.createSavedSearch(searchData)
      ).rejects.toThrow('Search name must be less than 255 characters');
    });

    it('should generate shareable URL correctly', () => {
      const searchId = 'test-search-id';
      const baseUrl = 'http://localhost:3000';
      
      const url = SavedSearchService.generateShareableUrl(searchId, baseUrl);
      
      expect(url).toBe(`${baseUrl}/leads?search=${searchId}`);
    });

    it('should parse shareable URL correctly', () => {
      const url = 'http://localhost:3000/leads?search=test-search-id';
      
      const searchId = SavedSearchService.parseShareableUrl(url);
      
      expect(searchId).toBe('test-search-id');
    });

    it('should handle invalid URL parsing', () => {
      const invalidUrl = 'not-a-valid-url';
      
      const searchId = SavedSearchService.parseShareableUrl(invalidUrl);
      
      expect(searchId).toBeNull();
    });
  });
});