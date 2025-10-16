import { BaseModel } from '../models/BaseModel';
import { SearchQuery } from './searchService';
import { ValidationError, NotFoundError } from '../utils/errors';

export interface SavedSearchData {
  id: string;
  name: string;
  query: SearchQuery;
  userId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSavedSearchRequest {
  name: string;
  query: SearchQuery;
  userId: string;
  isPublic?: boolean;
}

export interface UpdateSavedSearchRequest {
  name?: string;
  query?: SearchQuery;
  isPublic?: boolean;
}

export class SavedSearchModel extends BaseModel {
  static override tableName = 'saved_searches';

  id!: string;
  name!: string;
  query!: string; // JSON string
  user_id!: string;
  is_public!: boolean;
  created_at!: Date;
  updated_at!: Date;

  /**
   * Transform database record to SavedSearchData
   */
  static transformToSavedSearchData(dbRecord: SavedSearchModel): SavedSearchData {
    return {
      id: dbRecord.id,
      name: dbRecord.name,
      query: JSON.parse(dbRecord.query),
      userId: dbRecord.user_id,
      isPublic: dbRecord.is_public,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at
    };
  }

  /**
   * Create a new saved search
   */
  static async createSavedSearch(data: CreateSavedSearchRequest): Promise<SavedSearchData> {
    const savedSearchData = {
      name: data.name,
      query: JSON.stringify(data.query),
      user_id: data.userId,
      is_public: data.isPublic || false
    };

    const dbRecord = await this.create(savedSearchData);
    return this.transformToSavedSearchData(dbRecord);
  }

  /**
   * Get saved search by ID
   */
  static override async findById(id: string): Promise<SavedSearchModel | undefined> {
    return super.findById(id);
  }

  /**
   * Update saved search
   */
  static async updateSavedSearch(id: string, data: UpdateSavedSearchRequest): Promise<SavedSearchData> {
    const updateData: any = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.query !== undefined) {
      updateData.query = JSON.stringify(data.query);
    }

    if (data.isPublic !== undefined) {
      updateData.is_public = data.isPublic;
    }

    const dbRecord = await this.update(id, updateData);

    if (!dbRecord) {
      throw new NotFoundError(`Saved search with ID ${id} not found`);
    }

    return this.transformToSavedSearchData(dbRecord);
  }

  /**
   * Delete saved search
   */
  static async deleteSavedSearch(id: string): Promise<void> {
    const deleted = await this.delete(id);
    if (deleted === 0) {
      throw new NotFoundError(`Saved search with ID ${id} not found`);
    }
  }

  /**
   * Get saved searches for a user
   */
  static async getUserSavedSearches(userId: string): Promise<SavedSearchData[]> {
    const dbRecords = await this.query
      .where('user_id', userId)
      .orWhere('is_public', true)
      .orderBy('created_at', 'desc');

    return dbRecords.map((record: any) => this.transformToSavedSearchData(record));
  }

  /**
   * Get public saved searches
   */
  static async getPublicSavedSearches(): Promise<SavedSearchData[]> {
    const dbRecords = await this.query
      .where('is_public', true)
      .orderBy('created_at', 'desc');

    return dbRecords.map((record: any) => this.transformToSavedSearchData(record));
  }
}

export class SavedSearchService {
  /**
   * Create a new saved search
   */
  static async createSavedSearch(data: CreateSavedSearchRequest): Promise<SavedSearchData> {
    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Search name is required');
    }

    if (data.name.length > 255) {
      throw new ValidationError('Search name must be less than 255 characters');
    }

    // Check for duplicate names for the same user
    const existingSearch = await SavedSearchModel.query
      .where('user_id', data.userId)
      .where('name', data.name.trim())
      .first();

    if (existingSearch) {
      throw new ValidationError('A saved search with this name already exists');
    }

    return SavedSearchModel.createSavedSearch({
      ...data,
      name: data.name.trim()
    });
  }

  /**
   * Get saved search by ID
   */
  static async getSavedSearchById(id: string, userId: string): Promise<SavedSearchData> {
    const dbRecord = await SavedSearchModel.findById(id);
    
    if (!dbRecord) {
      throw new NotFoundError(`Saved search with ID ${id} not found`);
    }

    // Check access permissions
    if (dbRecord.user_id !== userId && !dbRecord.is_public) {
      throw new NotFoundError(`Saved search with ID ${id} not found`);
    }

    return SavedSearchModel.transformToSavedSearchData(dbRecord);
  }

  /**
   * Update saved search
   */
  static async updateSavedSearch(
    id: string, 
    data: UpdateSavedSearchRequest, 
    userId: string
  ): Promise<SavedSearchData> {
    const existingSearch = await SavedSearchModel.findById(id);
    
    if (!existingSearch) {
      throw new NotFoundError(`Saved search with ID ${id} not found`);
    }

    // Only the owner can update the search
    if (existingSearch.user_id !== userId) {
      throw new ValidationError('You can only update your own saved searches');
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new ValidationError('Search name is required');
      }

      if (data.name.length > 255) {
        throw new ValidationError('Search name must be less than 255 characters');
      }

      // Check for duplicate names (excluding current search)
      const duplicateSearch = await SavedSearchModel.query
        .where('user_id', userId)
        .where('name', data.name.trim())
        .whereNot('id', id)
        .first();

      if (duplicateSearch) {
        throw new ValidationError('A saved search with this name already exists');
      }

      data.name = data.name.trim();
    }

    return SavedSearchModel.updateSavedSearch(id, data);
  }

  /**
   * Delete saved search
   */
  static async deleteSavedSearch(id: string, userId: string): Promise<void> {
    const existingSearch = await SavedSearchModel.findById(id);
    
    if (!existingSearch) {
      throw new NotFoundError(`Saved search with ID ${id} not found`);
    }

    // Only the owner can delete the search
    if (existingSearch.user_id !== userId) {
      throw new ValidationError('You can only delete your own saved searches');
    }

    await SavedSearchModel.deleteSavedSearch(id);
  }

  /**
   * Get saved searches for a user
   */
  static async getUserSavedSearches(userId: string): Promise<SavedSearchData[]> {
    return SavedSearchModel.getUserSavedSearches(userId);
  }

  /**
   * Get public saved searches
   */
  static async getPublicSavedSearches(): Promise<SavedSearchData[]> {
    return SavedSearchModel.getPublicSavedSearches();
  }

  /**
   * Generate shareable URL for a saved search
   */
  static generateShareableUrl(searchId: string, baseUrl: string): string {
    return `${baseUrl}/leads?search=${searchId}`;
  }

  /**
   * Parse shareable URL to extract search ID
   */
  static parseShareableUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get('search');
    } catch (error) {
      return null;
    }
  }
}