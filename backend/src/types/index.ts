// Core type definitions for the Lead Management System

export interface Lead {
  id: string;
  accountLeadId: string; // Auto-generated format: AL-YY-MM-XXX
  company: {
    id?: string;
    name: string;
    industry?: string;
    size?: CompanySize;
  };
  contact: {
    name: string;
    phone?: string;
    mobile?: string;
    email: string;
  };
  source: {
    channel: LeadChannel;
    campaign?: string;
    utmParams?: UTMParameters;
  };
  assignment: {
    assignedTo?: string;
    assignedAt?: Date;
    assignmentReason?: string;
  };
  status: LeadStatus;
  score: {
    value: number;
    band: ScoreBand;
    lastCalculated: Date;
  };
  qualification: {
    interest?: InterestLevel;
    budget?: BudgetStatus;
    timeline?: PurchaseTimeline;
    businessType?: BusinessType;
  };
  followUp: {
    nextDate?: Date;
    notes?: string;
  };
  product: {
    type?: ProductType;
    adType?: AdType;
  };
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    isActive: boolean;
  };
  customFields: Record<string, any>;
}

export interface Task {
  id: string;
  leadId: string;
  subject: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  assignedTo: string;
  dueDate: Date;
  status: TaskStatus;
  reminders: Reminder[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  createdBy: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  subject: string;
  details: Record<string, any>;
  performedBy: string;
  performedAt: Date;
  relatedEntities?: RelatedEntity[];
}

export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    phone?: string;
    department?: string;
    territory?: string;
    workingHours?: WorkingHours;
  };
}

export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  workingHours?: WorkingHours;
  territories?: Territory[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Blacklist {
  id: string;
  type: BlacklistType;
  value: string;
  reason: BlacklistReason;
  notes?: string;
  addedBy: string;
  removedBy?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  removedAt?: Date;
}

// Enums and supporting types
export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise'
}

export enum LeadChannel {
  WEB_FORM = 'web_form',
  EMAIL = 'email',
  PHONE = 'phone',
  CHAT = 'chat',
  EVENT = 'event',
  REFERRAL = 'referral',
  VENDOR_LIST = 'vendor_list',
  SOCIAL_MEDIA = 'social_media',
  PAID_ADS = 'paid_ads',
  ORGANIC_SEARCH = 'organic_search'
}

export enum LeadStatus {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
  DISQUALIFIED = 'disqualified',
  NURTURE = 'nurture'
}

export enum ScoreBand {
  HOT = 'hot',
  WARM = 'warm',
  COLD = 'cold'
}

export enum InterestLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum BudgetStatus {
  CONFIRMED = 'confirmed',
  ESTIMATED = 'estimated',
  UNKNOWN = 'unknown'
}

export enum PurchaseTimeline {
  IMMEDIATE = 'immediate',
  WITHIN_MONTH = 'within_month',
  WITHIN_QUARTER = 'within_quarter',
  WITHIN_YEAR = 'within_year',
  UNKNOWN = 'unknown'
}

export enum BusinessType {
  B2B = 'b2b',
  B2C = 'b2c'
}

export enum ProductType {
  SOFTWARE = 'software',
  HARDWARE = 'hardware',
  SERVICE = 'service',
  CONSULTING = 'consulting'
}

export enum AdType {
  GOOGLE_ADS = 'google_ads',
  FACEBOOK_ADS = 'facebook_ads',
  LINKEDIN_ADS = 'linkedin_ads',
  DISPLAY = 'display',
  VIDEO = 'video'
}

export enum TaskType {
  CALL = 'call',
  EMAIL = 'email',
  MEETING = 'meeting',
  FOLLOW_UP = 'follow_up',
  RESEARCH = 'research',
  PROPOSAL = 'proposal'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ActivityType {
  LEAD_CREATED = 'lead_created',
  LEAD_UPDATED = 'lead_updated',
  LEAD_ASSIGNED = 'lead_assigned',
  LEAD_REASSIGNED = 'lead_reassigned',
  LEAD_CONVERTED = 'lead_converted',
  LEAD_CLOSED = 'lead_closed',
  STATUS_CHANGED = 'status_changed',
  SCORE_UPDATED = 'score_updated',
  EMAIL_SENT = 'email_sent',
  EMAIL_RECEIVED = 'email_received',
  EMAIL_OPENED = 'email_opened',
  EMAIL_REPLIED = 'email_replied',
  CALL_MADE = 'call_made',
  CALL_ANSWERED = 'call_answered',
  MEETING_SCHEDULED = 'meeting_scheduled',
  MEETING_ATTENDED = 'meeting_attended',
  WEBSITE_VISIT = 'website_visit',
  FORM_COMPLETED = 'form_completed',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  TASK_CANCELLED = 'task_cancelled',
  NOTE_ADDED = 'note_added',
  FILE_UPLOADED = 'file_uploaded',
  ACCOUNT_CREATED = 'account_created',
  CONTACT_CREATED = 'contact_created',
  OPPORTUNITY_CREATED = 'opportunity_created'
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  MARKETING = 'marketing',
  READ_ONLY = 'read_only',
  GUEST = 'guest'
}

export enum BlacklistType {
  EMAIL = 'email',
  PHONE = 'phone',
  DOMAIN = 'domain',
  COMPANY = 'company'
}

export enum BlacklistReason {
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsubscribed',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  INVALID = 'invalid',
  COMPETITOR = 'competitor',
  DO_NOT_CONTACT = 'do_not_contact',
  GDPR_REQUEST = 'gdpr_request',
  MANUAL = 'manual'
}

// Supporting interfaces
export interface UTMParameters {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

export interface Reminder {
  id: string;
  type: 'email' | 'notification';
  scheduledAt: Date;
  sent: boolean;
  sentAt?: Date;
}

export interface RelatedEntity {
  type: string;
  id: string;
  name?: string;
}

export interface WorkingHours {
  timezone: string;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isWorkingDay: boolean;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
}

export interface Territory {
  id: string;
  name: string;
  regions: string[];
  countries: string[];
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface RuleAction {
  type: 'assign_to_user' | 'assign_to_team' | 'set_priority' | 'add_tag' | 'send_notification';
  parameters: Record<string, any>;
}

// Database-specific interfaces (for migrations and models)
export interface LeadTable {
  id: string;
  account_lead_id: string;
  company_name: string;
  company_id?: string | undefined;
  company_industry?: string | undefined;
  company_size?: CompanySize | undefined;
  contact_name: string;
  contact_phone?: string | undefined;
  contact_mobile?: string | undefined;
  contact_email: string;
  source_channel: LeadChannel;
  source_campaign?: string | undefined;
  source_utm_params?: string | null | undefined; // JSON string
  assigned_to?: string | undefined;
  assigned_at?: Date | undefined;
  assignment_reason?: string | undefined;
  status: LeadStatus;
  score_value: number;
  score_band: ScoreBand;
  score_last_calculated: Date;
  qualification_interest?: InterestLevel | undefined;
  qualification_budget?: BudgetStatus | undefined;
  qualification_timeline?: PurchaseTimeline | undefined;
  qualification_business_type?: BusinessType | undefined;
  follow_up_next_date?: Date | undefined;
  follow_up_notes?: string | undefined;
  product_type?: ProductType | undefined;
  product_ad_type?: AdType | undefined;
  custom_fields?: string | null | undefined; // JSON string
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface TaskTable {
  id: string;
  lead_id: string;
  subject: string;
  description?: string;
  type: TaskType;
  priority: Priority;
  assigned_to: string;
  due_date: Date;
  status: TaskStatus;
  reminders?: string; // JSON string
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface ActivityTable {
  id: string;
  lead_id: string;
  type: ActivityType;
  subject: string;
  details: string; // JSON string
  performed_by: string;
  performed_at: Date;
  related_entities?: string | null; // JSON string
}

export interface UserTable {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  last_login_at?: Date;
  profile_phone?: string;
  profile_department?: string;
  profile_territory?: string;
  profile_working_hours?: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentRuleTable {
  id: string;
  name: string;
  priority: number;
  conditions: string; // JSON string
  actions: string; // JSON string
  is_active: boolean;
  working_hours?: string; // JSON string
  territories?: string; // JSON string
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface BlacklistTable {
  id: string;
  type: BlacklistType;
  value: string;
  reason: BlacklistReason;
  notes?: string;
  added_by: string;
  removed_by?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  removed_at?: Date;
}

// Communication and Email Integration Types
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  variables: string[]; // Array of variable names used in template
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EmailLog {
  id: string;
  leadId: string;
  templateId?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  status: EmailStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  bouncedAt?: Date;
  errorMessage?: string;
  messageId?: string; // External email service message ID
  createdAt: Date;
  sentBy: string;
}

export interface InboundEmail {
  id: string;
  leadId?: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string;
  receivedAt: Date;
  processed: boolean;
  processedAt?: Date;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  url?: string;
  content?: Buffer;
}

export interface CalendarEvent {
  id: string;
  leadId: string;
  taskId?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees: string[];
  organizer: string;
  status: CalendarEventStatus;
  externalEventId?: string; // ID from external calendar service
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunicationHistory {
  id: string;
  leadId: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  content: string;
  metadata: Record<string, any>;
  performedBy: string;
  performedAt: Date;
  relatedEmailId?: string;
  relatedTaskId?: string;
}

// Enums for communication types
export enum EmailTemplateType {
  WELCOME = 'welcome',
  FOLLOW_UP = 'follow_up',
  PROPOSAL = 'proposal',
  MEETING_INVITATION = 'meeting_invitation',
  THANK_YOU = 'thank_you',
  NURTURE = 'nurture',
  REMINDER = 'reminder',
  CUSTOM = 'custom'
}

export enum EmailStatus {
  DRAFT = 'draft',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  REPLIED = 'replied',
  BOUNCED = 'bounced',
  FAILED = 'failed'
}

export enum CalendarEventStatus {
  TENTATIVE = 'tentative',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled'
}

export enum CommunicationType {
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms',
  WHATSAPP = 'whatsapp',
  LINE = 'line',
  MEETING = 'meeting',
  NOTE = 'note'
}

export enum CommunicationDirection {
  INBOUND = 'inbound',
  OUTBOUND = 'outbound'
}

// Lead Conversion Types
export interface Account {
  id: string;
  name: string;
  industry?: string;
  size?: CompanySize;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  description?: string;
  customFields: Record<string, any>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    isActive: boolean;
  };
}

export interface Contact {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  isPrimary: boolean;
  isDecisionMaker: boolean;
  customFields: Record<string, any>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    isActive: boolean;
  };
}

export interface Opportunity {
  id: string;
  name: string;
  accountId: string;
  primaryContactId?: string;
  ownerId: string;
  stage: OpportunityStage;
  amount?: number;
  currency: string;
  probability: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  closeReason?: CloseReason;
  closeNotes?: string;
  leadSource?: LeadChannel;
  campaign?: string;
  description?: string;
  customFields: Record<string, any>;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy: string;
    isActive: boolean;
  };
}

export interface LeadConversion {
  id: string;
  leadId: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  conversionType: ConversionType;
  leadDataSnapshot: Lead;
  conversionMapping?: Record<string, any>;
  notes?: string;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    convertedBy: string;
  };
}

export enum OpportunityStage {
  PROSPECTING = 'prospecting',
  QUALIFICATION = 'qualification',
  NEEDS_ANALYSIS = 'needs_analysis',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost'
}

export enum CloseReason {
  WON_NEW_BUSINESS = 'won_new_business',
  WON_EXPANSION = 'won_expansion',
  WON_RENEWAL = 'won_renewal',
  LOST_COMPETITOR = 'lost_competitor',
  LOST_BUDGET = 'lost_budget',
  LOST_TIMING = 'lost_timing',
  LOST_NO_DECISION = 'lost_no_decision',
  DISQUALIFIED_NOT_FIT = 'disqualified_not_fit',
  DISQUALIFIED_BUDGET = 'disqualified_budget',
  DISQUALIFIED_AUTHORITY = 'disqualified_authority'
}

export enum ConversionType {
  FULL = 'full',
  ACCOUNT_ONLY = 'account_only',
  CONTACT_ONLY = 'contact_only'
}

// Database table interfaces for communication
export interface EmailTemplateTable {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: EmailTemplateType;
  variables: string; // JSON string array
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface EmailLogTable {
  id: string;
  lead_id: string;
  template_id?: string;
  to_email: string;
  cc_email?: string;
  bcc_email?: string;
  subject: string;
  body: string;
  status: EmailStatus;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  replied_at?: Date;
  bounced_at?: Date;
  error_message?: string;
  message_id?: string;
  created_at: Date;
  sent_by: string;
}

export interface InboundEmailTable {
  id: string;
  lead_id?: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  html_body?: string;
  message_id: string;
  in_reply_to?: string;
  references?: string;
  received_at: Date;
  processed: boolean;
  processed_at?: Date;
  attachments?: string; // JSON string
}

export interface CalendarEventTable {
  id: string;
  lead_id: string;
  task_id?: string;
  title: string;
  description?: string;
  start_time: Date;
  end_time: Date;
  location?: string;
  attendees: string; // JSON string array
  organizer: string;
  status: CalendarEventStatus;
  external_event_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CommunicationHistoryTable {
  id: string;
  lead_id: string;
  type: CommunicationType;
  direction: CommunicationDirection;
  subject?: string;
  content: string;
  metadata: string; // JSON string
  performed_by: string;
  performed_at: Date;
  related_email_id?: string;
  related_task_id?: string;
}

// Database table interfaces for conversion entities
export interface AccountTable {
  id: string;
  name: string;
  industry?: string;
  size?: CompanySize;
  website?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  description?: string;
  custom_fields?: string; // JSON string
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface ContactTable {
  id: string;
  account_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  is_primary: boolean;
  is_decision_maker: boolean;
  custom_fields?: string; // JSON string
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface OpportunityTable {
  id: string;
  name: string;
  account_id: string;
  primary_contact_id?: string;
  owner_id: string;
  stage: OpportunityStage;
  amount?: number;
  currency: string;
  probability: number;
  expected_close_date?: Date;
  actual_close_date?: Date;
  close_reason?: CloseReason;
  close_notes?: string;
  lead_source?: LeadChannel;
  campaign?: string;
  description?: string;
  custom_fields?: string; // JSON string
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface LeadConversionTable {
  id: string;
  lead_id: string;
  account_id?: string;
  contact_id?: string;
  opportunity_id?: string;
  conversion_type: ConversionType;
  lead_data_snapshot: string; // JSON string
  conversion_mapping?: string; // JSON string
  notes?: string;
  created_at: Date;
  updated_at: Date;
  converted_by: string;
}