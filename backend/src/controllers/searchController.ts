import { Request, Response } from 'express';
import { SearchService, SearchQuery } from '../services/searchService';
import { SavedSearchService, CreateSavedSearchRequest, UpdateSavedSearchRequest } from '../services/savedSearchService';
import { ValidationError } from '../utils/errors';

export class SearchController {
  /**
   * Perform advanced search with filters and aggregations
   */
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const query: SearchQuery = {
        searchTerm: req.query.searchTerm as string,
        filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
        sort: req.query.sort ? JSON.parse(req.query.sort as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        size: req.query.size ? parseInt(req.query.size as string) : 20
      };

      // Validate pagination parameters
      if (query.page && query.page < 1) {
        throw new ValidationError('Page must be greater than 0');
      }

      if (query.size && (query.size < 1 || query.size > 100)) {
        throw new ValidationError('Size must be between 1 and 100');
      }

      const result = await SearchService.search(query);

      res.json({
        success: true,
        data: result,
        pagination: {
          page: query.page || 1,
          size: query.size || 20,
          total: result.total,
          totalPages: Math.ceil(result.total / (query.size || 20))
        }
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const term = req.query.term as string;
      const types = req.query.types ? (req.query.types as string).split(',') : ['company', 'contact', 'email'];

      if (!term || term.length < 2) {
        res.json({
          success: true,
          data: []
        });
        return;
      }

      const suggestions = await SearchService.getSuggestions(term, types);

      res.json({
        success: true,
        data: suggestions
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get suggestions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reindex all leads
   */
  static async reindex(req: Request, res: Response): Promise<void> {
    try {
      await SearchService.reindexAllLeads();

      res.json({
        success: true,
        message: 'Reindexing completed successfully'
      });
    } catch (error) {
      console.error('Reindex error:', error);
      res.status(500).json({
        success: false,
        error: 'Reindexing failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check Elasticsearch health
   */
  static async health(req: Request, res: Response): Promise<void> {
    try {
      const isAvailable = await SearchService.isAvailable();

      res.json({
        success: true,
        data: {
          elasticsearch: {
            available: isAvailable,
            status: isAvailable ? 'healthy' : 'unavailable'
          }
        }
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a saved search
   */
  static async createSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const data: CreateSavedSearchRequest = {
        name: req.body.name,
        query: req.body.query,
        userId,
        isPublic: req.body.isPublic || false
      };

      const savedSearch = await SavedSearchService.createSavedSearch(data);

      res.status(201).json({
        success: true,
        data: savedSearch
      });
    } catch (error) {
      console.error('Create saved search error:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create saved search',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Get saved searches for the current user
   */
  static async getSavedSearches(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const savedSearches = await SavedSearchService.getUserSavedSearches(userId);

      res.json({
        success: true,
        data: savedSearches
      });
    } catch (error) {
      console.error('Get saved searches error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get saved searches',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific saved search by ID
   */
  static async getSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const searchId = req.params.id;
      const savedSearch = await SavedSearchService.getSavedSearchById(searchId, userId);

      res.json({
        success: true,
        data: savedSearch
      });
    } catch (error) {
      console.error('Get saved search error:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Saved search not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to get saved search',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const searchId = req.params.id;
      const data: UpdateSavedSearchRequest = {
        name: req.body.name,
        query: req.body.query,
        isPublic: req.body.isPublic
      };

      const savedSearch = await SavedSearchService.updateSavedSearch(searchId, data, userId);

      res.json({
        success: true,
        data: savedSearch
      });
    } catch (error) {
      console.error('Update saved search error:', error);
      
      if (error instanceof ValidationError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: error.message
        });
      } else if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Saved search not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update saved search',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const searchId = req.params.id;
      await SavedSearchService.deleteSavedSearch(searchId, userId);

      res.json({
        success: true,
        message: 'Saved search deleted successfully'
      });
    } catch (error) {
      console.error('Delete saved search error:', error);
      
      if (error instanceof ValidationError) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: error.message
        });
      } else if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Saved search not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete saved search',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Get public saved searches
   */
  static async getPublicSavedSearches(req: Request, res: Response): Promise<void> {
    try {
      const savedSearches = await SavedSearchService.getPublicSavedSearches();

      res.json({
        success: true,
        data: savedSearches
      });
    } catch (error) {
      console.error('Get public saved searches error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get public saved searches',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate shareable URL for a saved search
   */
  static async generateShareableUrl(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const searchId = req.params.id;
      
      // Verify the user has access to this search
      await SavedSearchService.getSavedSearchById(searchId, userId);

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const shareableUrl = SavedSearchService.generateShareableUrl(searchId, baseUrl);

      res.json({
        success: true,
        data: {
          url: shareableUrl
        }
      });
    } catch (error) {
      console.error('Generate shareable URL error:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: 'Saved search not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to generate shareable URL',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}