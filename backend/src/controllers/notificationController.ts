import { Request, Response } from 'express';
import { NotificationService } from '../services/notificationService';
import { ValidationError, NotFoundError } from '../utils/errors';

export class NotificationController {
  /**
   * Get notifications for current user
   */
  static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const { limit = '50', offset = '0' } = req.query;

      const result = await NotificationService.getUserNotifications(
        userId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.status(200).json({
        success: true,
        data: result.notifications,
        pagination: {
          total: result.total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          unreadCount: result.unreadCount
        }
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await NotificationService.getUserNotifications(userId, 1, 0);

      res.status(200).json({
        success: true,
        data: {
          unreadCount: result.unreadCount
        }
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      await NotificationService.markNotificationAsRead(notificationId, userId);

      res.status(200).json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      await NotificationService.markAllNotificationsAsRead(userId);

      res.status(200).json({
        success: true,
        message: 'All notifications marked as read'
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notificationId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      await NotificationService.deleteNotification(notificationId, userId);

      res.status(200).json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * Test mention extraction
   */
  static async testMentionExtraction(req: Request, res: Response): Promise<void> {
    try {
      const { text } = req.body;

      if (!text) {
        res.status(400).json({ error: 'Text is required' });
        return;
      }

      const mentions = NotificationService.extractMentions(text);

      res.status(200).json({
        success: true,
        data: {
          text,
          mentions,
          mentionCount: mentions.length
        }
      });
    } catch (error) {
      console.error('Error testing mention extraction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}