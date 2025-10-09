import { Request, Response } from 'express';
import { ActivityService, ActivityFilter } from '../services/activityService';
import { ActivityType as ActivityTypeEnum } from '../types';
import { ValidationError, NotFoundError } from '../utils/errors';

export class ActivityController {
  /**
   * Create a new activity
   */
  static async createActivity(req: Request, res: Response): Promise<void> {
    try {
      const { leadId, type, subject, details, relatedEntities } = req.body;
      const performedBy = req.user?.id;

      if (!performedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const activity = await ActivityService.createActivity({
        leadId,
        type,
        subject,
        details: details || {},
        performedBy,
        performedAt: new Date(),
        relatedEntities
      });

      res.status(201).json({
        success: true,
        data: activity,
        message: 'Activity created successfully'
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error creating activity:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get activity by ID
   */
  static async getActivity(req: Request, res: Response): Promise<void> {
    try {
      const { activityId } = req.params;
      const activity = await ActivityService.getActivityById(activityId);

      res.status(200).json({
        success: true,
        data: activity
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error getting activity:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Get activities with filtering and pagination
   */
  static async getActivities(req: Request, res: Response): Promise<void> {
    try {
      const {
        leadId,
        performedBy,
        type,
        startDate,
        endDate,
        limit = '50',
        offset = '0'
      } = req.query;

      const filter: ActivityFilter = {
        leadId: leadId as string,
        performedBy: performedBy as string,
        type: type as ActivityTypeEnum,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      };

      const result = await ActivityService.getActivities(filter);

      res.status(200).json({
        success: true,
        data: result.activities,
        pagination: {
          total: result.total,
          limit: filter.limit,
          offset: filter.offset,
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      console.error('Error getting activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get chronological timeline for a lead
   */
  static async getLeadTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { limit = '100' } = req.query;

      const timeline = await ActivityService.getLeadTimeline(
        leadId, 
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: timeline,
        count: timeline.length
      });
    } catch (error) {
      console.error('Error getting lead timeline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get recent activities across all leads
   */
  static async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '50' } = req.query;

      const activities = await ActivityService.getRecentActivities(
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: activities,
        count: activities.length
      });
    } catch (error) {
      console.error('Error getting recent activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get activity statistics
   */
  static async getActivityStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.query;
      const stats = await ActivityService.getActivityStatistics(leadId as string);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting activity statistics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Add a note/comment with @mention support
   */
  static async addNote(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { note } = req.body;
      const performedBy = req.user?.id;

      if (!performedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!note || note.trim().length === 0) {
        res.status(400).json({ error: 'Note content is required' });
        return;
      }

      const activity = await ActivityService.addNote(leadId, note, performedBy);

      res.status(201).json({
        success: true,
        data: activity,
        message: 'Note added successfully'
      });
    } catch (error) {
      console.error('Error adding note:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Log email activity
   */
  static async logEmail(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { type, subject, to, from, templateId } = req.body;
      const performedBy = req.user?.id;

      if (!performedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!type || !subject) {
        res.status(400).json({ error: 'Email type and subject are required' });
        return;
      }

      const activity = await ActivityService.logEmail(leadId, performedBy, {
        type,
        subject,
        to,
        from,
        templateId
      });

      res.status(201).json({
        success: true,
        data: activity,
        message: 'Email activity logged successfully'
      });
    } catch (error) {
      console.error('Error logging email activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Log call activity
   */
  static async logCall(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { type, duration, outcome, notes } = req.body;
      const performedBy = req.user?.id;

      if (!performedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!type) {
        res.status(400).json({ error: 'Call type is required' });
        return;
      }

      const activity = await ActivityService.logCall(leadId, performedBy, {
        type,
        duration,
        outcome,
        notes
      });

      res.status(201).json({
        success: true,
        data: activity,
        message: 'Call activity logged successfully'
      });
    } catch (error) {
      console.error('Error logging call activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Log meeting activity
   */
  static async logMeeting(req: Request, res: Response): Promise<void> {
    try {
      const { leadId } = req.params;
      const { type, title, scheduledAt, duration, attendees, notes } = req.body;
      const performedBy = req.user?.id;

      if (!performedBy) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!type || !title) {
        res.status(400).json({ error: 'Meeting type and title are required' });
        return;
      }

      const activity = await ActivityService.logMeeting(leadId, performedBy, {
        type,
        title,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        duration,
        attendees,
        notes
      });

      res.status(201).json({
        success: true,
        data: activity,
        message: 'Meeting activity logged successfully'
      });
    } catch (error) {
      console.error('Error logging meeting activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get activities by date range
   */
  static async getActivitiesByDateRange(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, leadId } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({ error: 'Start date and end date are required' });
        return;
      }

      const activities = await ActivityService.getActivitiesByDateRange(
        new Date(startDate as string),
        new Date(endDate as string),
        leadId as string
      );

      res.status(200).json({
        success: true,
        data: activities,
        count: activities.length
      });
    } catch (error) {
      console.error('Error getting activities by date range:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Search activities by content
   */
  static async searchActivities(req: Request, res: Response): Promise<void> {
    try {
      const { q: searchTerm, leadId, limit = '50' } = req.query;

      if (!searchTerm || (searchTerm as string).trim().length === 0) {
        res.status(400).json({ error: 'Search term is required' });
        return;
      }

      const activities = await ActivityService.searchActivities(
        searchTerm as string,
        leadId as string,
        parseInt(limit as string)
      );

      res.status(200).json({
        success: true,
        data: activities,
        count: activities.length
      });
    } catch (error) {
      console.error('Error searching activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}