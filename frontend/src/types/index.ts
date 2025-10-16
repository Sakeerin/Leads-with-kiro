// Core type definitions for the Lead Management System (copied from backend)

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

// Enums
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

// Frontend-specific types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchFilters {
  status?: string[];
  assignedTo?: string[];
  source?: string[];
  scoreBand?: string[];
  dateRange?: {
    field: 'created_at' | 'updated_at' | 'follow_up_date';
    from?: Date;
    to?: Date;
  };
  customFields?: Record<string, any>;
}

export interface SearchQuery {
  searchTerm?: string;
  filters?: SearchFilters;
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  page?: number;
  size?: number;
}

export interface SearchResult {
  leads: Lead[];
  total: number;
  aggregations?: {
    status: Array<{ key: string; doc_count: number }>;
    source: Array<{ key: string; doc_count: number }>;
    assignedTo: Array<{ key: string; doc_count: number }>;
    scoreBand: Array<{ key: string; doc_count: number }>;
  };
}

export interface SearchSuggestion {
  text: string;
  type: 'company' | 'contact' | 'email' | 'phone';
  score: number;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: SearchQuery;
  userId: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkOperation {
  type: 'assign' | 'status_change' | 'add_label' | 'delete';
  leadIds: string[];
  parameters: Record<string, any>;
}

export interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  leads: Lead[];
  color?: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'date' | 'textarea';
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: any;
}

export interface TableColumn {
  id: string;
  label: string;
  sortable?: boolean;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId: string;
}