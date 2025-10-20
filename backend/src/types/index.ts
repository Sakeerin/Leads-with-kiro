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

// File Attachment Types
export interface Attachment {
  id: string;
  leadId: string;
  filename: string;
  originalFilename: string;
  contentType: string;
  size: number;
  storagePath: string;
  storageProvider: string;
  bucketName?: string;
  fileHash: string;
  virusScanned: boolean;
  virusClean?: boolean;
  scanResult?: string;
  metadata?: Record<string, any>;
  uploadedBy: string;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface AttachmentUploadRequest {
  leadId: string;
  file: Express.Multer.File;
  metadata?: Record<string, any>;
}

export interface AttachmentDownloadRequest {
  attachmentId: string;
  inline?: boolean; // For preview vs download
}

export interface VirusScanResult {
  isClean: boolean;
  scanResult?: string;
  scanDate: Date;
  scanEngine?: string;
}

export enum AttachmentStorageProvider {
  S3 = 's3',
  LOCAL = 'local',
  AZURE = 'azure',
  GCS = 'gcs'
}

export enum AttachmentAccessLevel {
  OWNER = 'owner',
  ASSIGNED = 'assigned',
  TEAM = 'team',
  ADMIN = 'admin'
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

// Database table interface for attachments
export interface AttachmentTable {
  id: string;
  lead_id: string;
  filename: string;
  original_filename: string;
  content_type: string;
  size: number;
  storage_path: string;
  storage_provider: string;
  bucket_name?: string;
  file_hash: string;
  virus_scanned: boolean;
  virus_clean?: boolean;
  scan_result?: string;
  metadata?: string; // JSON string
  uploaded_by: string;
  uploaded_at: Date;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

// Import/Export Types
export interface ImportHistory {
  id: string;
  filename: string;
  originalFilename: string;
  fileType: ImportFileType;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  status: ImportStatus;
  validationErrors?: ValidationError[];
  duplicateReport?: DuplicateReport;
  fieldMapping?: FieldMapping;
  importedBy: string;
  rolledBackBy?: string;
  startedAt: Date;
  completedAt?: Date;
  rolledBackAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportRecord {
  id: string;
  importId: string;
  rowNumber: number;
  leadId?: string;
  status: ImportRecordStatus;
  originalData: Record<string, any>;
  processedData?: Record<string, any>;
  validationErrors?: string[];
  duplicateMatches?: DuplicateMatch[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportHistory {
  id: string;
  filename: string;
  exportType: ExportType;
  fileFormat: ExportFileFormat;
  recordCount: number;
  filtersApplied?: Record<string, any>;
  columnsExported?: string[];
  filePath?: string;
  fileSize?: number;
  status: ExportStatus;
  errorMessage?: string;
  exportedBy: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledReport {
  id: string;
  name: string;
  description?: string;
  reportType: ReportType;
  fileFormat: ExportFileFormat;
  filters?: Record<string, any>;
  columns?: string[];
  cronSchedule: string;
  emailRecipients: string[];
  emailSubject?: string;
  emailBody?: string;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledReportExecution {
  id: string;
  scheduledReportId: string;
  status: ExecutionStatus;
  filePath?: string;
  recordCount?: number;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ImportRequest {
  file: Express.Multer.File;
  fieldMapping?: FieldMapping;
  skipDuplicates?: boolean;
  updateExisting?: boolean;
  validateOnly?: boolean;
}

export interface ImportResult {
  importId: string;
  status: ImportStatus;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  validationErrors: ValidationError[];
  duplicateReport: DuplicateReport;
  processedRecords: ImportRecord[];
}

export interface ExportRequest {
  exportType: ExportType;
  fileFormat: ExportFileFormat;
  filters?: Record<string, any>;
  columns?: string[];
  includeHeaders?: boolean;
}

export interface ExportResult {
  exportId: string;
  filename: string;
  filePath: string;
  fileSize: number;
  recordCount: number;
  downloadUrl: string;
}

export interface FieldMapping {
  [csvColumn: string]: string; // Maps CSV column to Lead field
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  code: string;
}

export interface DuplicateMatch {
  leadId: string;
  matchType: 'email' | 'phone' | 'company';
  matchScore: number;
  matchedFields: string[];
}

export interface DuplicateReport {
  totalDuplicates: number;
  duplicatesByType: Record<string, number>;
  duplicateDetails: Array<{
    row: number;
    matches: DuplicateMatch[];
  }>;
}

// Enums for import/export
export enum ImportFileType {
  CSV = 'csv',
  XLSX = 'xlsx'
}

export enum ImportStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

export enum ImportRecordStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  DUPLICATE = 'duplicate',
  SKIPPED = 'skipped'
}

export enum ExportType {
  LEADS = 'leads',
  REPORTS = 'reports',
  ANALYTICS = 'analytics'
}

export enum ExportFileFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
  PDF = 'pdf'
}

export enum ExportStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum ReportType {
  LEADS = 'leads',
  ANALYTICS = 'analytics',
  PERFORMANCE = 'performance'
}

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Database table interfaces for import/export
export interface ImportHistoryTable {
  id: string;
  filename: string;
  original_filename: string;
  file_type: ImportFileType;
  total_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  status: ImportStatus;
  validation_errors?: string; // JSON string
  duplicate_report?: string; // JSON string
  field_mapping?: string; // JSON string
  imported_by: string;
  rolled_back_by?: string;
  started_at: Date;
  completed_at?: Date;
  rolled_back_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ImportRecordTable {
  id: string;
  import_id: string;
  row_number: number;
  lead_id?: string;
  status: ImportRecordStatus;
  original_data: string; // JSON string
  processed_data?: string; // JSON string
  validation_errors?: string; // JSON string
  duplicate_matches?: string; // JSON string
  created_at: Date;
  updated_at: Date;
}

export interface ExportHistoryTable {
  id: string;
  filename: string;
  export_type: ExportType;
  file_format: ExportFileFormat;
  record_count: number;
  filters_applied?: string; // JSON string
  columns_exported?: string; // JSON string
  file_path?: string;
  file_size?: number;
  status: ExportStatus;
  error_message?: string;
  exported_by: string;
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduledReportTable {
  id: string;
  name: string;
  description?: string;
  report_type: ReportType;
  file_format: ExportFileFormat;
  filters?: string; // JSON string
  columns?: string; // JSON string
  cron_schedule: string;
  email_recipients: string; // JSON string
  email_subject?: string;
  email_body?: string;
  is_active: boolean;
  last_run_at?: Date;
  next_run_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduledReportExecutionTable {
  id: string;
  scheduled_report_id: string;
  status: ExecutionStatus;
  file_path?: string;
  record_count?: number;
  error_message?: string;
  started_at: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// Configuration System Types
export interface CustomField {
  id: string;
  entityType: CustomFieldEntityType;
  fieldName: string;
  fieldLabel: string;
  fieldLabelTh?: string;
  fieldType: CustomFieldType;
  description?: string;
  descriptionTh?: string;
  isRequired: boolean;
  isActive: boolean;
  displayOrder: number;
  validationRules?: ValidationRule[];
  picklistValues?: PicklistOption[];
  defaultValue?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PicklistValue {
  id: string;
  picklistType: PicklistType;
  value: string;
  label: string;
  labelTh?: string;
  description?: string;
  descriptionTh?: string;
  colorCode?: string;
  icon?: string;
  isActive: boolean;
  isDefault: boolean;
  displayOrder: number;
  metadata?: Record<string, any>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusWorkflow {
  id: string;
  entityType: WorkflowEntityType;
  name: string;
  nameTh?: string;
  description?: string;
  descriptionTh?: string;
  statusTransitions: StatusTransition[];
  transitionRules?: TransitionRule[];
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingHoursConfig {
  id: string;
  name: string;
  timezone: string;
  schedule: WeeklySchedule;
  holidays?: Holiday[];
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Holiday {
  id: string;
  name: string;
  nameTh?: string;
  date: Date;
  type: HolidayType;
  description?: string;
  descriptionTh?: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemConfig {
  id: string;
  configKey: string;
  configValue?: string;
  configJson?: Record<string, any>;
  dataType: ConfigDataType;
  description?: string;
  descriptionTh?: string;
  category: ConfigCategory;
  isSensitive: boolean;
  requiresRestart: boolean;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Supporting interfaces for configuration
export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message?: string;
  messageTh?: string;
}

export interface PicklistOption {
  value: string;
  label: string;
  labelTh?: string;
  isActive?: boolean;
}

export interface StatusTransition {
  fromStatus: string;
  toStatus: string;
  isAllowed: boolean;
  requiresApproval?: boolean;
  approvalRoles?: UserRole[];
  conditions?: TransitionCondition[];
}

export interface TransitionRule {
  id: string;
  name: string;
  conditions: TransitionCondition[];
  actions: TransitionAction[];
  isActive: boolean;
}

export interface TransitionCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export interface TransitionAction {
  type: TransitionActionType;
  parameters: Record<string, any>;
}

export interface WeeklySchedule {
  monday: DayScheduleConfig;
  tuesday: DayScheduleConfig;
  wednesday: DayScheduleConfig;
  thursday: DayScheduleConfig;
  friday: DayScheduleConfig;
  saturday: DayScheduleConfig;
  sunday: DayScheduleConfig;
}

export interface DayScheduleConfig {
  isWorkingDay: boolean;
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  breaks?: TimeBreak[];
}

export interface TimeBreak {
  startTime: string;
  endTime: string;
  name?: string;
}

// Enums for configuration system
export enum CustomFieldEntityType {
  LEAD = 'lead',
  ACCOUNT = 'account',
  CONTACT = 'contact',
  OPPORTUNITY = 'opportunity',
  TASK = 'task',
  ACTIVITY = 'activity'
}

export enum CustomFieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DECIMAL = 'decimal',
  DATE = 'date',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  PICKLIST = 'picklist',
  MULTI_PICKLIST = 'multi_picklist',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  CURRENCY = 'currency'
}

export enum PicklistType {
  STATUS = 'status',
  SOURCE = 'source',
  PRODUCT_TYPE = 'product_type',
  AD_TYPE = 'ad_type',
  INDUSTRY = 'industry',
  COMPANY_SIZE = 'company_size',
  INTEREST_LEVEL = 'interest_level',
  BUDGET_STATUS = 'budget_status',
  PURCHASE_TIMELINE = 'purchase_timeline',
  BUSINESS_TYPE = 'business_type',
  TASK_TYPE = 'task_type',
  PRIORITY = 'priority',
  OPPORTUNITY_STAGE = 'opportunity_stage',
  CLOSE_REASON = 'close_reason'
}

export enum WorkflowEntityType {
  LEAD = 'lead',
  OPPORTUNITY = 'opportunity',
  TASK = 'task'
}

export enum HolidayType {
  NATIONAL = 'national',
  COMPANY = 'company',
  REGIONAL = 'regional'
}

export enum ConfigDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  JSON = 'json'
}

export enum ConfigCategory {
  GENERAL = 'general',
  EMAIL = 'email',
  SCORING = 'scoring',
  ROUTING = 'routing',
  WORKFLOW = 'workflow',
  SECURITY = 'security',
  INTEGRATION = 'integration',
  NOTIFICATION = 'notification'
}

export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  MIN_VALUE = 'min_value',
  MAX_VALUE = 'max_value',
  REGEX = 'regex',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  DATE_RANGE = 'date_range'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null'
}

export enum TransitionActionType {
  SET_FIELD = 'set_field',
  SEND_EMAIL = 'send_email',
  CREATE_TASK = 'create_task',
  ASSIGN_USER = 'assign_user',
  SEND_NOTIFICATION = 'send_notification',
  TRIGGER_WORKFLOW = 'trigger_workflow'
}

// Database table interfaces for configuration
export interface CustomFieldTable {
  id: string;
  entity_type: CustomFieldEntityType;
  field_name: string;
  field_label: string;
  field_label_th?: string;
  field_type: CustomFieldType;
  description?: string;
  description_th?: string;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  validation_rules?: string; // JSON string
  picklist_values?: string; // JSON string
  default_value?: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface PicklistValueTable {
  id: string;
  picklist_type: PicklistType;
  value: string;
  label: string;
  label_th?: string;
  description?: string;
  description_th?: string;
  color_code?: string;
  icon?: string;
  is_active: boolean;
  is_default: boolean;
  display_order: number;
  metadata?: string; // JSON string
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface StatusWorkflowTable {
  id: string;
  entity_type: WorkflowEntityType;
  name: string;
  name_th?: string;
  description?: string;
  description_th?: string;
  status_transitions: string; // JSON string
  transition_rules?: string; // JSON string
  is_active: boolean;
  is_default: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkingHoursConfigTable {
  id: string;
  name: string;
  timezone: string;
  schedule: string; // JSON string
  holidays?: string; // JSON string
  description?: string;
  is_active: boolean;
  is_default: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface HolidayTable {
  id: string;
  name: string;
  name_th?: string;
  date: Date;
  type: HolidayType;
  description?: string;
  description_th?: string;
  is_recurring: boolean;
  recurrence_pattern?: string;
  is_active: boolean;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface SystemConfigTable {
  id: string;
  config_key: string;
  config_value?: string;
  config_json?: string; // JSON string
  data_type: ConfigDataType;
  description?: string;
  description_th?: string;
  category: ConfigCategory;
  is_sensitive: boolean;
  requires_restart: boolean;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}