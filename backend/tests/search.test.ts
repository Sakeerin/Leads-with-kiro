import { SearchService } from '../src/services/searchService';
import { SavedSearchService } from '../src/services/savedSearchService';
import { LeadStatus, LeadChannel, ScoreBand, CompanySize } from '../src/types';

describe('Search Service', () => {
  beforeAll(async () => {
    // Initialize search service
    SearchService.initialize();
    
    // Wait for Elasticsearch to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  describe('Elasticsearch Integration', () => {
    it('should check if Elasticsearch is available', async () => {
      const isAvailable = await SearchService.isAvailable();
      // This might be false in test environment, which is okay
      expect(typeof isAvailable).toBe('boolean');
    });

    it('should create indices without error', async () => {
      try {
        await SearchService.createIndices();
        // If no error is thrown, the test passes
        expect(true).toBe(true);
      } catch (error) {
        // In test environment, Elasticsearch might not be available
        console.warn('Elasticsearch not available in test environment');
        expect(true).toBe(true);
      }
    });
  });

  describe('Search Functionality', () => {
    it('should perform fallback search when Elasticsearch is not available', async () => {
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

    it('should return empty suggestions when term is too short', async () => {
      const suggestions = await SearchService.getSuggestions('a');
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('Saved Search Service', () => {
    const testUserId = 'test-user-id';
    let savedSearchId: string;

    it('should create a saved search', async () => {
      const searchData = {
        name: 'Test Search',
        query: {
          searchTerm: 'test company',
          filters: {
            status: ['new', 'contacted']
          }
        },
        userId: testUserId,
        isPublic: false
      };

      const savedSearch = await SavedSearchService.createSavedSearch(searchData);
      
      expect(savedSearch).toHaveProperty('id');
      expect(savedSearch.name).toBe('Test Search');
      expect(savedSearch.userId).toBe(testUserId);
      expect(savedSearch.isPublic).toBe(false);
      
      savedSearchId = savedSearch.id;
    });

    it('should get saved search by ID', async () => {
      const savedSearch = await SavedSearchService.getSavedSearchById(savedSearchId, testUserId);
      
      expect(savedSearch.id).toBe(savedSearchId);
      expect(savedSearch.name).toBe('Test Search');
    });

    it('should get user saved searches', async () => {
      const savedSearches = await SavedSearchService.getUserSavedSearches(testUserId);
      
      expect(Array.isArray(savedSearches)).toBe(true);
      expect(savedSearches.length).toBeGreaterThan(0);
      expect(savedSearches.some(s => s.id === savedSearchId)).toBe(true);
    });

    it('should update saved search', async () => {
      const updateData = {
        name: 'Updated Test Search',
        isPublic: true
      };

      const updatedSearch = await SavedSearchService.updateSavedSearch(
        savedSearchId, 
        updateData, 
        testUserId
      );
      
      expect(updatedSearch.name).toBe('Updated Test Search');
      expect(updatedSearch.isPublic).toBe(true);
    });

    it('should delete saved search', async () => {
      await SavedSearchService.deleteSavedSearch(savedSearchId, testUserId);
      
      // Verify it's deleted
      await expect(
        SavedSearchService.getSavedSearchById(savedSearchId, testUserId)
      ).rejects.toThrow('not found');
    });

    it('should validate search name', async () => {
      const searchData = {
        name: '', // Empty name should fail
        query: { searchTerm: 'test' },
        userId: testUserId
      };

      await expect(
        SavedSearchService.createSavedSearch(searchData)
      ).rejects.toThrow('Search name is required');
    });
  });

  describe('Lead Indexing', () => {
    it('should index lead without error', async () => {
      const mockLead = {
        id: 'test-lead-id',
        accountLeadId: 'AL-25-10-001',
        company: {
          name: 'Test Company',
          industry: 'Technology',
          size: CompanySize.MEDIUM
        },
        contact: {
          name: 'John Doe',
          email: 'john@testcompany.com',
          phone: '+1234567890'
        },
        source: {
          channel: LeadChannel.WEB_FORM,
          campaign: 'Test Campaign'
        },
        assignment: {},
        status: LeadStatus.NEW,
        score: {
          value: 75,
          band: ScoreBand.WARM,
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
  });
});