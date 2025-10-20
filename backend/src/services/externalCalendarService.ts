import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { loggingService } from './loggingService';

export interface CalendarProvider {
  createEvent(event: CalendarEvent): Promise<CalendarEventResult>;
  updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEventResult>;
  deleteEvent(eventId: string): Promise<boolean>;
  getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  getAvailability(startDate: Date, endDate: Date, attendees: string[]): Promise<AvailabilitySlot[]>;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: CalendarAttendee[];
  location?: string;
  isAllDay?: boolean;
  reminders?: CalendarReminder[];
  recurrence?: CalendarRecurrence;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  required?: boolean;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface CalendarReminder {
  method: 'email' | 'popup';
  minutes: number;
}

export interface CalendarRecurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  endDate?: Date;
  count?: number;
}

export interface CalendarEventResult {
  id: string;
  status: 'created' | 'updated' | 'failed';
  error?: string;
  meetingUrl?: string;
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  status: 'free' | 'busy' | 'tentative' | 'outOfOffice';
  attendee: string;
}

class MicrosoftGraphAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class Microsoft365CalendarService implements CalendarProvider {
  private client: Client;

  constructor(accessToken: string) {
    const authProvider = new MicrosoftGraphAuthProvider(accessToken);
    this.client = Client.initWithMiddleware({ authProvider });
  }

  async createEvent(event: CalendarEvent): Promise<CalendarEventResult> {
    try {
      const graphEvent = {
        subject: event.title,
        body: {
          contentType: 'HTML',
          content: event.description || ''
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'UTC'
        },
        location: event.location ? {
          displayName: event.location
        } : undefined,
        attendees: event.attendees.map(attendee => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name
          },
          type: attendee.required ? 'required' : 'optional'
        })),
        isAllDay: event.isAllDay || false,
        reminderMinutesBeforeStart: event.reminders?.[0]?.minutes || 15,
        recurrence: event.recurrence ? this.buildMicrosoftRecurrence(event.recurrence) : undefined
      };

      const response = await this.client.api('/me/events').post(graphEvent);

      loggingService.info('Calendar event created via Microsoft 365', { eventId: response.id, title: event.title });
      return {
        id: response.id,
        status: 'created',
        meetingUrl: response.onlineMeeting?.joinUrl
      };
    } catch (error) {
      loggingService.error('Failed to create calendar event via Microsoft 365', error instanceof Error ? error : new Error('Unknown error'), { title: event.title });
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEventResult> {
    try {
      const updateData: any = {};

      if (event.title) updateData.subject = event.title;
      if (event.description) updateData.body = { contentType: 'HTML', content: event.description };
      if (event.startTime) updateData.start = { dateTime: event.startTime.toISOString(), timeZone: 'UTC' };
      if (event.endTime) updateData.end = { dateTime: event.endTime.toISOString(), timeZone: 'UTC' };
      if (event.location) updateData.location = { displayName: event.location };
      if (event.attendees) {
        updateData.attendees = event.attendees.map(attendee => ({
          emailAddress: { address: attendee.email, name: attendee.name },
          type: attendee.required ? 'required' : 'optional'
        }));
      }

      await this.client.api(`/me/events/${eventId}`).patch(updateData);

      loggingService.info('Calendar event updated via Microsoft 365', { eventId });
      return {
        id: eventId,
        status: 'updated'
      };
    } catch (error) {
      loggingService.error('Failed to update calendar event via Microsoft 365', error instanceof Error ? error : new Error('Unknown error'), { eventId });
      return {
        id: eventId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      await this.client.api(`/me/events/${eventId}`).delete();
      loggingService.info('Calendar event deleted via Microsoft 365', { eventId });
      return true;
    } catch (error) {
      loggingService.error('Failed to delete calendar event via Microsoft 365', error instanceof Error ? error : new Error('Unknown error'), { eventId });
      return false;
    }
  }

  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const response = await this.client
        .api('/me/events')
        .filter(`start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`)
        .select('id,subject,body,start,end,location,attendees,isAllDay,recurrence')
        .get();

      return response.value.map((event: any) => ({
        id: event.id,
        title: event.subject,
        description: event.body?.content || '',
        startTime: new Date(event.start.dateTime),
        endTime: new Date(event.end.dateTime),
        attendees: event.attendees?.map((att: any) => ({
          email: att.emailAddress.address,
          name: att.emailAddress.name,
          required: att.type === 'required',
          responseStatus: att.status?.response
        })) || [],
        location: event.location?.displayName,
        isAllDay: event.isAllDay
      }));
    } catch (error) {
      loggingService.error('Failed to get calendar events from Microsoft 365', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  async getAvailability(startDate: Date, endDate: Date, attendees: string[]): Promise<AvailabilitySlot[]> {
    try {
      const response = await this.client.api('/me/calendar/getSchedule').post({
        schedules: attendees,
        startTime: {
          dateTime: startDate.toISOString(),
          timeZone: 'UTC'
        },
        endTime: {
          dateTime: endDate.toISOString(),
          timeZone: 'UTC'
        },
        availabilityViewInterval: 60
      });

      const slots: AvailabilitySlot[] = [];
      response.value.forEach((schedule: any, index: number) => {
        schedule.freeBusyViewType.forEach((status: string, slotIndex: number) => {
          const slotStart = new Date(startDate.getTime() + slotIndex * 60 * 60 * 1000);
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

          slots.push({
            start: slotStart,
            end: slotEnd,
            status: this.mapMicrosoftAvailabilityStatus(status),
            attendee: attendees[index]
          });
        });
      });

      return slots;
    } catch (error) {
      loggingService.error('Failed to get availability from Microsoft 365', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  private buildMicrosoftRecurrence(recurrence: CalendarRecurrence): any {
    return {
      pattern: {
        type: recurrence.frequency,
        interval: recurrence.interval
      },
      range: {
        type: recurrence.endDate ? 'endDate' : recurrence.count ? 'numbered' : 'noEnd',
        startDate: new Date().toISOString().split('T')[0],
        endDate: recurrence.endDate?.toISOString().split('T')[0],
        numberOfOccurrences: recurrence.count
      }
    };
  }

  private mapMicrosoftAvailabilityStatus(status: string): 'free' | 'busy' | 'tentative' | 'outOfOffice' {
    switch (status) {
      case '0': return 'free';
      case '1': return 'tentative';
      case '2': return 'busy';
      case '3': return 'outOfOffice';
      default: return 'free';
    }
  }
}

export class GoogleCalendarService implements CalendarProvider {
  private calendar: any;

  constructor(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async createEvent(event: CalendarEvent): Promise<CalendarEventResult> {
    try {
      const googleEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'UTC'
        },
        location: event.location,
        attendees: event.attendees.map(attendee => ({
          email: attendee.email,
          displayName: attendee.name,
          optional: !attendee.required
        })),
        reminders: {
          useDefault: false,
          overrides: event.reminders?.map(reminder => ({
            method: reminder.method,
            minutes: reminder.minutes
          })) || [{ method: 'popup', minutes: 15 }]
        },
        recurrence: event.recurrence ? this.buildGoogleRecurrence(event.recurrence) : undefined
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: googleEvent
      });

      loggingService.info('Calendar event created via Google Calendar', { eventId: response.data.id, title: event.title });
      return {
        id: response.data.id,
        status: 'created',
        meetingUrl: response.data.hangoutLink
      };
    } catch (error) {
      loggingService.error('Failed to create calendar event via Google Calendar', error instanceof Error ? error : new Error('Unknown error'), { title: event.title });
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEventResult> {
    try {
      const updateData: any = {};

      if (event.title) updateData.summary = event.title;
      if (event.description) updateData.description = event.description;
      if (event.startTime) updateData.start = { dateTime: event.startTime.toISOString(), timeZone: 'UTC' };
      if (event.endTime) updateData.end = { dateTime: event.endTime.toISOString(), timeZone: 'UTC' };
      if (event.location) updateData.location = event.location;
      if (event.attendees) {
        updateData.attendees = event.attendees.map(attendee => ({
          email: attendee.email,
          displayName: attendee.name,
          optional: !attendee.required
        }));
      }

      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId,
        resource: updateData
      });

      loggingService.info('Calendar event updated via Google Calendar', { eventId });
      return {
        id: eventId,
        status: 'updated'
      };
    } catch (error) {
      loggingService.error('Failed to update calendar event via Google Calendar', error instanceof Error ? error : new Error('Unknown error'), { eventId });
      return {
        id: eventId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId
      });
      loggingService.info('Calendar event deleted via Google Calendar', { eventId });
      return true;
    } catch (error) {
      loggingService.error('Failed to delete calendar event via Google Calendar', error instanceof Error ? error : new Error('Unknown error'), { eventId });
      return false;
    }
  }

  async getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items.map((event: any) => ({
        id: event.id,
        title: event.summary,
        description: event.description || '',
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        attendees: event.attendees?.map((att: any) => ({
          email: att.email,
          name: att.displayName,
          required: !att.optional,
          responseStatus: att.responseStatus
        })) || [],
        location: event.location,
        isAllDay: !!event.start.date
      }));
    } catch (error) {
      loggingService.error('Failed to get calendar events from Google Calendar', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  async getAvailability(startDate: Date, endDate: Date, attendees: string[]): Promise<AvailabilitySlot[]> {
    try {
      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: attendees.map(email => ({ id: email }))
        }
      });

      const slots: AvailabilitySlot[] = [];
      Object.entries(response.data.calendars).forEach(([email, calendar]: [string, any]) => {
        calendar.busy.forEach((busySlot: any) => {
          slots.push({
            start: new Date(busySlot.start),
            end: new Date(busySlot.end),
            status: 'busy',
            attendee: email
          });
        });
      });

      return slots;
    } catch (error) {
      loggingService.error('Failed to get availability from Google Calendar', error instanceof Error ? error : new Error('Unknown error'));
      throw error;
    }
  }

  private buildGoogleRecurrence(recurrence: CalendarRecurrence): string[] {
    let rrule = `FREQ=${recurrence.frequency.toUpperCase()}`;
    
    if (recurrence.interval > 1) {
      rrule += `;INTERVAL=${recurrence.interval}`;
    }
    
    if (recurrence.endDate) {
      rrule += `;UNTIL=${recurrence.endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
    } else if (recurrence.count) {
      rrule += `;COUNT=${recurrence.count}`;
    }

    return [`RRULE:${rrule}`];
  }
}

export class ExternalCalendarService {
  private providers: Map<string, CalendarProvider> = new Map();

  registerProvider(name: string, provider: CalendarProvider): void {
    this.providers.set(name, provider);
  }

  async createEvent(providerName: string, event: CalendarEvent): Promise<CalendarEventResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Calendar provider '${providerName}' not found`);
    }

    return provider.createEvent(event);
  }

  async updateEvent(providerName: string, eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEventResult> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Calendar provider '${providerName}' not found`);
    }

    return provider.updateEvent(eventId, event);
  }

  async deleteEvent(providerName: string, eventId: string): Promise<boolean> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Calendar provider '${providerName}' not found`);
    }

    return provider.deleteEvent(eventId);
  }

  async getEvents(providerName: string, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Calendar provider '${providerName}' not found`);
    }

    return provider.getEvents(startDate, endDate);
  }

  async getAvailability(providerName: string, startDate: Date, endDate: Date, attendees: string[]): Promise<AvailabilitySlot[]> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Calendar provider '${providerName}' not found`);
    }

    return provider.getAvailability(startDate, endDate, attendees);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}