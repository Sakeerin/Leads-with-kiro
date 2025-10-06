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
  STATUS_CHANGED = 'status_changed',
  SCORE_UPDATED = 'score_updated',
  EMAIL_SENT = 'email_sent',
  EMAIL_RECEIVED = 'email_received',
  CALL_MADE = 'call_made',
  MEETING_SCHEDULED = 'meeting_scheduled',
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed',
  NOTE_ADDED = 'note_added',
  FILE_UPLOADED = 'file_uploaded'
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SALES = 'sales',
  MARKETING = 'marketing',
  READ_ONLY = 'read_only',
  GUEST = 'guest'
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
  company_id?: string;
  company_industry?: string;
  company_size?: CompanySize;
  contact_name: string;
  contact_phone?: string;
  contact_mobile?: string;
  contact_email: string;
  source_channel: LeadChannel;
  source_campaign?: string;
  source_utm_params?: string; // JSON string
  assigned_to?: string;
  assigned_at?: Date;
  assignment_reason?: string;
  status: LeadStatus;
  score_value: number;
  score_band: ScoreBand;
  score_last_calculated: Date;
  qualification_interest?: InterestLevel;
  qualification_budget?: BudgetStatus;
  qualification_timeline?: PurchaseTimeline;
  qualification_business_type?: BusinessType;
  follow_up_next_date?: Date;
  follow_up_notes?: string;
  product_type?: ProductType;
  product_ad_type?: AdType;
  custom_fields?: string; // JSON string
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
  related_entities?: string; // JSON string
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