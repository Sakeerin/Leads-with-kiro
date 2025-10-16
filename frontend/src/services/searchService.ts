import { apiService } from './api';
import { SearchQuery, SearchResult, SearchSuggestion, SavedSearch, ApiResponse } from '../types';

export class SearchService {
  /**
   * Perform advanced search with filters and aggregations
   */
  static async search(query: SearchQuery): Promise<ApiResponse<SearchResult>> {
    const params = new URLSearchParams();
    
    if (query.searchTerm) {
      params.append('searchTerm', query.searchTerm);
    }
    
    if (query.filters) {
      params.append('filters', JSON.stringify(query.filters));
    }
    
    if (query.sort) {
      params.append('sort', JSON.stringify(query.sort));
    }
    
    if (query.page) {
      params.append('page', query.page.toString());
    }
    
    if (query.size) {
      params.append('size', query.size.toString());
    }

    return apiService.get<SearchResult>(`/search?${params.toString()}`);
  }

  /**
   * Get search suggestions for autocomplete
   */
  static async getSuggestions(
    term: string, 
    types: string[] = ['company', 'contact', 'email']
  ): Promise<ApiResponse<SearchSuggestion[]>> {
    const params = new URLSearchParams();
    params.append('term', term);
    params.append('types', types.join(','));

    return apiService.get<SearchSuggestion[]>(`/suggestions?${params.toString()}`);
  }

  /**
   * Check search service health
   */
  static async getHealth(): Promise<ApiResponse<any>> {
    return apiService.get<any>('/health');
  }

  /**
   * Trigger reindexing of all leads
   */
  static async reindex(): Promise<ApiResponse<any>> {
    return apiService.post<any>('/reindex');
  }

  /**
   * Create a saved search
   */
  static async createSavedSearch(data: {
    name: string;
    query: SearchQuery;
    isPublic?: boolean;
  }): Promise<ApiResponse<SavedSearch>> {
    return apiService.post<SavedSearch>('/saved-searches', data);
  }

  /**
   * Get saved searches for the current user
   */
  static async getSavedSearches(): Promise<ApiResponse<SavedSearch[]>> {
    return apiService.get<SavedSearch[]>('/saved-searches');
  }

  /**
   * Get public saved searches
   */
  static async getPublicSavedSearches(): Promise<ApiResponse<SavedSearch[]>> {
    return apiService.get<SavedSearch[]>('/saved-searches/public');
  }

  /**
   * Get a specific saved search by ID
   */
  static async getSavedSearch(id: string): Promise<ApiResponse<SavedSearch>> {
    return apiService.get<SavedSearch>(`/saved-searches/${id}`);
  }

  /**
   * Update a saved search
   */
  static async updateSavedSearch(
    id: string, 
    data: {
      name?: string;
      query?: SearchQuery;
      isPublic?: boolean;
    }
  ): Promise<ApiResponse<SavedSearch>> {
    return apiService.put<SavedSearch>(`/saved-searches/${id}`, data);
  }

  /**
   * Delete a saved search
   */
  static async deleteSavedSearch(id: string): Promise<ApiResponse<void>> {
    return apiService.delete<void>(`/saved-searches/${id}`);
  }

  /**
   * Generate shareable URL for a saved search
   */
  static async generateShareableUrl(id: string): Promise<ApiResponse<{ url: string }>> {
    return apiService.get<{ url: string }>(`/saved-searches/${id}/share`);
  }

  /**
   * Build search query from URL parameters
   */
  static buildQueryFromUrl(searchParams: URLSearchParams): SearchQuery {
    const query: SearchQuery = {};

    const searchTerm = searchParams.get('q');
    if (searchTerm) {
      query.searchTerm = searchTerm;
    }

    const status = searchParams.getAll('status');
    const assignedTo = searchParams.getAll('assignedTo');
    const source = searchParams.getAll('source');
    const scoreBand = searchParams.getAll('scoreBand');

    if (status.length > 0 || assignedTo.length > 0 || source.length > 0 || scoreBand.length > 0) {
      query.filters = {};
      
      if (status.length > 0) query.filters.status = status;
      if (assignedTo.length > 0) query.filters.assignedTo = assignedTo;
      if (source.length > 0) query.filters.source = source;
      if (scoreBand.length > 0) query.filters.scoreBand = scoreBand;
    }

    const sortField = searchParams.get('sortField');
    const sortOrder = searchParams.get('sortOrder');
    if (sortField && sortOrder) {
      query.sort = {
        field: sortField,
        order: sortOrder as 'asc' | 'desc'
      };
    }

    const page = searchParams.get('page');
    if (page) {
      query.page = parseInt(page);
    }

    const size = searchParams.get('size');
    if (size) {
      query.size = parseInt(size);
    }

    return query;
  }

  /**
   * Build URL parameters from search query
   */
  static buildUrlFromQuery(query: SearchQuery): URLSearchParams {
    const params = new URLSearchParams();

    if (query.searchTerm) {
      params.set('q', query.searchTerm);
    }

    if (query.filters) {
      if (query.filters.status) {
        query.filters.status.forEach(status => params.append('status', status));
      }
      if (query.filters.assignedTo) {
        query.filters.assignedTo.forEach(assignee => params.append('assignedTo', assignee));
      }
      if (query.filters.source) {
        query.filters.source.forEach(source => params.append('source', source));
      }
      if (query.filters.scoreBand) {
        query.filters.scoreBand.forEach(band => params.append('scoreBand', band));
      }
    }

    if (query.sort) {
      params.set('sortField', query.sort.field);
      params.set('sortOrder', query.sort.order);
    }

    if (query.page) {
      params.set('page', query.page.toString());
    }

    if (query.size) {
      params.set('size', query.size.toString());
    }

    return params;
  }
}