// Types for FW Core platform

export interface Profile {
  id: string;
  workspace_name: string;
  meta_verify_token?: string;
  meta_access_token?: string;
  google_access_token?: string;
  google_refresh_token?: string;
  whastboost_api_url: string;
  whastboost_token?: string;
  whastboost_status: 'connected' | 'disconnected';
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'contacted' | 'warm' | 'hot' | 'closed' | 'lost';
export type LeadScore = 'High-Value 🔥' | 'Warm 👍' | 'Cold ❄️';

export interface Lead {
  id: string;
  workspace_id: string;
  tenant_id?: string | null;
  client_id?: string | null;
  created_by_user_id?: string | null;
  assigned_to_user_id?: string | null;
  name: string | null;
  email: string | null;
  phone: string;
  source: string;
  status: LeadStatus;
  score: LeadScore;
  score_reason: string | null;
  raw_payload: Record<string, any>;
  custom_color?: string | null;
  comments?: Array<{ text: string; timestamp: string }> | null;
  wa_welcome_sent?: boolean;
  google_synced?: boolean;
  wgl_dispatched?: boolean;
  followup_timeline?: any;
  stage_id?: string | null;
  stage?: string;
  stage_position?: number;
  whatsapp_group_id?: string | null;
  final_quotation_id?: string | null;
  client_name?: string | null;
  location?: string | null;
  city?: string | null;
  event_date?: string | null;
  event_type?: string | null;
  user_id?: string;
  // Meta Facebook Ads fields
  source_form_id?: string | null;
  form_tag?: string | null;
  raw_meta_payload?: Record<string, any> | null;
  meta_lead_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldMapping {
  id: string;
  workspace_id: string;
  meta_field_key: string;
  system_field_key: 'name' | 'email' | 'phone' | 'budget' | 'venue' | 'event_date' | 'functions';
  created_at: string;
}

// ─────────────────────────────────────────────────────────────
// Facebook Ads Types
// ─────────────────────────────────────────────────────────────

/** A Facebook Page connected to a workspace */
export interface FbPageConfig {
  id: string;
  workspace_id: string;
  page_id: string;
  page_name: string | null;
  page_category: string | null;
  page_access_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A Lead Form from Meta Graph API (not stored — fetched live) */
export interface FbLeadForm {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DELETED';
  leads_count?: number;
  created_time?: string;
  /** Fields that this form collects */
  questions?: Array<{ key: string; type: string; label?: string }>;
}

/** Mapping + tagging config for a single form */
export interface FbFormMapping {
  id: string;
  workspace_id: string;
  page_id: string;
  form_id: string;
  form_name: string | null;
  is_active: boolean;
  is_tagging_enabled: boolean;
  /** { "full_name": "name", "phone_number": "phone", ... } */
  mapping_config: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/** System field keys that a Meta field can be mapped to */
export type SystemFieldKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'budget'
  | 'venue'
  | 'event_date'
  | 'functions'
  | 'custom';

export const SYSTEM_FIELDS: Array<{ key: SystemFieldKey; label: string }> = [
  { key: 'name',       label: 'Lead Name' },
  { key: 'email',      label: 'Email Address' },
  { key: 'phone',      label: 'Phone Number' },
  { key: 'budget',     label: 'Budget' },
  { key: 'venue',      label: 'Venue / Location' },
  { key: 'event_date', label: 'Event Date' },
  { key: 'functions',  label: 'No. of Functions' },
  { key: 'custom',     label: 'Custom / Raw Payload' },
];

// ─────────────────────────────────────────────────────────────
// Existing Types (unchanged)
// ─────────────────────────────────────────────────────────────

export interface Sequence {
  id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_number: number;
  delay_days: number;
  message_template: string;
  created_at: string;
}

export type QueueMessageStatus = 'pending' | 'processing' | 'sent' | 'failed';

export interface QueueMessage {
  id: string;
  workspace_id: string;
  lead_id: string;
  sequence_step_id: string | null;
  scheduled_for: string;
  message_body: string;
  status: QueueMessageStatus;
  retry_count: number;
  last_error: string | null;
  created_at: string;
}

export interface LiveLog {
  id: string;
  workspace_id: string;
  lead_id: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  totalLeads: number;
  highValueLeads: number;
  warmLeads: number;
  coldLeads: number;
  deliveryRate: number;
  totalMessagesSent: number;
  totalMessagesPending: number;
  totalMessagesFailed: number;
}

// ─────────────────────────────────────────────────────────────
// Canva-like Quotation Maker Types
// ─────────────────────────────────────────────────────────────

export type CanvasElementType = 'text' | 'image' | 'shape';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  content: string;
  x: number; // percentage or absolute pixels
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right';
  rotation?: number;
  skewX?: number;
  skewY?: number;
  zIndex?: number;
  // Additional flex or grid layout flags for nested grids
  isGridContainer?: boolean;
  gridItems?: Array<{ id: string; content: string; label?: string }>;
}

export interface CanvasPage {
  pageIndex: number;
  elements: CanvasElement[];
  backgroundImage?: string;
  pageType?: 'cover' | 'about' | 'functions' | 'pricing';
  paginatedFuncs?: any[];
  paginatedDelivs?: string[];
  showDeliverables?: boolean;
}

export interface PricingSummary {
  regular_price: number;
  offer_price: number;
  savings: number;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  thumbnail_url: string | null;
  default_config: CanvasPage[];
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  user_id: string;
  client_name: string;
  couple_names: string | null;
  current_page_index: number;
  canvas_data: CanvasPage[];
  pricing_summary: PricingSummary;
  created_at: string;
  updated_at: string;
  folder_id?: string | null;
}

export interface QuotationPreset {
  id: string;
  user_id: string;
  package_name: string;
  data_payload: {
    functions?: Array<{ date: string; title: string; items: string[] }>;
    deliverables?: string[];
    pricing?: { regular_price: number; offer_price: number };
  };
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Operations Team Manager Types (Granular Relational Model)
// ─────────────────────────────────────────────────────────────

export interface FWProject {
  id: string;
  user_id?: string | null;
  client_name: string;
  status?: string;
  shipping_hdd_status?: string;
  shipping_hdd_state?: string;
  main_date?: string;
  main_venue?: string;
  quotation_files?: string[];
  itinerary_doc_id?: string;
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
  fw_sub_events?: FWSubEvent[];
}

export interface FWSubEvent {
  id: string;
  user_id?: string | null;
  project_id: string;
  event_title: string;
  event_date: string;
  venue_name?: string;
  venue_map_link?: string;
  roll_call_time?: string;
  dismissal_estimate_time?: string;
  shift_hours_slot?: string;
  operational_notes?: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
  fw_assignments?: FWAssignment[];
}

export interface FWTeamMember {
  id: string;
  user_id?: string | null;
  workspace_id?: string | null;
  name: string;
  primary_role: string;
  role_id?: string | null;
  country_code?: string;
  phone_number: string;
  whatsapp_number?: string | null;
  email?: string;
  avatar_url?: string;
  latitude?: number | null;
  longitude?: number | null;
  radius_meters?: number | null;
  location_name?: string | null;
  shift_start?: string | null; // e.g. '10:00:00' or '10:00'
  shift_end?: string | null; // e.g. '19:00:00' or '19:00'
  weekly_offs?: string[] | null; // e.g. ['Sun']
  daily_rate?: number | null;
  monthly_salary?: number | null;
  payout_type?: 'monthly' | 'daily' | string | null;
  is_geofence_exempt?: boolean | null;
  geofence_required?: boolean | null;
  notes?: string | null;
  active_status?: boolean;
  is_active?: boolean;
  custom_data?: Record<string, any> | null;
  created_at?: string;
  updated_at?: string;
}

export interface StaffRole {
  id: string;
  user_id?: string | null;
  workspace_id: string;
  role_name: string;
  created_at?: string;
}

export interface CompanyHoliday {
  id: string;
  user_id?: string | null;
  workspace_id: string;
  holiday_date: string; // YYYY-MM-DD
  name: string;
  note?: string | null;
  is_optional?: boolean;
  created_at?: string;
}

export interface FWAssignment {
  id: string;
  user_id?: string | null;
  project_id: string;
  sub_event_id?: string | null;
  sub_event_name?: string;
  sub_event_date?: string;
  start_time?: string;
  end_time?: string;
  required_role: string;
  assigned_member_id?: string | null;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  fw_team_members?: FWTeamMember | null;
}

export interface FWWhatsAppLog {
  id: string;
  user_id: string;
  assignment_id: string;
  recipient_phone: string;
  message_payload: Record<string, any>;
  status: string;
  response_payload?: Record<string, any>;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────
// SaaS Suite Registry Types
// ─────────────────────────────────────────────────────────────

export type SubAppSlug = 'team-manager' | 'quotations' | 'leads' | 'integrations' | 'clients' | 'post-production' | 'finance' | 'attendance';

export interface SuiteAppNavItem {
  label: string;
  icon: string;
  href: string;
}

export interface SuiteAppConfig {
  slug: SubAppSlug;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accentColor: string;
  accentGradient: string;
  href: string;
  sidebarNavItems: SuiteAppNavItem[];
}

export interface SuiteRegistry {
  apps: SuiteAppConfig[];
}

export const SUITE_REGISTRY: SuiteRegistry = {
  apps: [
    {
      slug: 'team-manager',
      title: 'Team Manager',
      subtitle: 'Crew & Operations',
      description: 'Manage crew standings, ledger, calendar, and project assignments for wedding operations.',
      icon: 'Users',
      accentColor: '#8B5CF6',
      accentGradient: 'from-violet-500 to-purple-600',
      href: '/team-manager',
      sidebarNavItems: [
        { label: 'Crew Standings', icon: 'Users', href: '/team-manager' },
        { label: 'Projects Ledger', icon: 'FolderOpen', href: '/team-manager' },
        { label: 'Event Calendar', icon: 'Calendar', href: '/team-manager' },
        { label: 'Assignments', icon: 'ClipboardList', href: '/team-manager' },
      ],
    },
    {
      slug: 'quotations',
      title: 'Quotation Maker',
      subtitle: 'Canvas & Templates',
      description: 'Design premium digital canvas quotation documents with Canva-style inline editing.',
      icon: 'FileText',
      accentColor: '#D4AF37',
      accentGradient: 'from-amber-500 to-yellow-600',
      href: '/quotations',
      sidebarNavItems: [
        { label: 'Canvas Folders', icon: 'FolderOpen', href: '/quotations' },
        { label: 'Template Selector', icon: 'Layout', href: '/quotations' },
        { label: 'Design Templates', icon: 'Sparkles', href: '/quotations' },
        { label: 'Saved Quotations', icon: 'Database', href: '/quotations' },
      ],
    },
    {
      slug: 'leads',
      title: 'Leads Integration',
      subtitle: 'CRM & Webhooks',
      description: 'Webhook capture statistics, Facebook Meta sync state, and automated outbox queue routers.',
      icon: 'Database',
      accentColor: '#10B981',
      accentGradient: 'from-emerald-500 to-green-600',
      href: '/leads',
      sidebarNavItems: [
        { label: 'Webhook Capture', icon: 'Globe', href: '/leads' },
        { label: 'Meta Ads Sync', icon: 'Webhook', href: '/leads' },
        { label: 'Outbox Queue', icon: 'Send', href: '/leads' },
        { label: 'Lead Pipeline', icon: 'BarChart3', href: '/leads' },
      ],
    },
    {
      slug: 'integrations',
      title: 'Integrations',
      subtitle: 'APIs & WhatsApp',
      description: 'Connect Baileys WhatsApp Web, Facebook Meta Ads, Google Contacts, and Webhook APIs.',
      icon: 'Plug',
      accentColor: '#3B82F6',
      accentGradient: 'from-blue-500 to-indigo-600',
      href: '/workspace/integrations',
      sidebarNavItems: [
        { label: 'WhatsApp Web', icon: 'MessageSquare', href: '/workspace/integrations' },
        { label: 'Meta Ads', icon: 'Globe', href: '/workspace/integrations' },
        { label: 'Google Sync', icon: 'RefreshCw', href: '/workspace/integrations' },
        { label: 'Webhooks API', icon: 'Key', href: '/workspace/integrations' },
      ],
    },
    {
      slug: 'clients',
      title: 'Clients Management',
      subtitle: 'Client Roster & Billing',
      description: 'Track converted wedding clients, total package billing, paid deposits, and balance receivables.',
      icon: 'Users',
      accentColor: '#6366F1',
      accentGradient: 'from-indigo-500 to-purple-600',
      href: '/workspace/clients',
      sidebarNavItems: [
        { label: 'Client Directory', icon: 'Users', href: '/workspace/clients' },
        { label: 'Post-Production', icon: 'Film', href: '/workspace/post-production' },
      ],
    },
    {
      slug: 'post-production',
      title: 'Post-Production',
      subtitle: 'Deliverables & Tracking',
      description: 'Interactive dark cinematic board for tracking teaser films, full films, reels, photos, albums, and editor deadlines.',
      icon: 'Film',
      accentColor: '#EC4899',
      accentGradient: 'from-pink-500 to-rose-600',
      href: '/workspace/post-production',
      sidebarNavItems: [
        { label: 'Deliverable Board', icon: 'Film', href: '/workspace/post-production' },
        { label: 'Client Roster', icon: 'Users', href: '/workspace/clients' },
      ],
    },
    {
      slug: 'finance',
      title: 'Finance & Payments',
      subtitle: 'Invoicing & P&L',
      description: 'Comprehensive studio finance tracking with quotation sync, milestone schedules, team payouts, and profit margins.',
      icon: 'DollarSign',
      accentColor: '#D97706',
      accentGradient: 'from-amber-500 to-yellow-600',
      href: '/workspace/finance',
      sidebarNavItems: [
        { label: 'Finance & Milestones', icon: 'DollarSign', href: '/workspace/finance' },
        { label: 'Client Directory', icon: 'Users', href: '/workspace/clients' },
        { label: 'Post-Production', icon: 'Film', href: '/workspace/post-production' },
      ],
    },
    {
      slug: 'attendance',
      title: 'Workforce Attendance',
      subtitle: 'Selfie & GPS Clock-In',
      description: 'Mobile-first workforce attendance with live selfie verification, GPS geofencing, event shoot logs, and automatic overtime tracking.',
      icon: 'Clock',
      accentColor: '#10B981',
      accentGradient: 'from-emerald-500 to-teal-600',
      href: '/workspace/attendance',
      sidebarNavItems: [
        { label: 'Daily Roster', icon: 'Clock', href: '/workspace/attendance' },
        { label: 'Live Crew Activity', icon: 'Users', href: '/workspace/attendance' },
        { label: 'Leave Management', icon: 'Calendar', href: '/workspace/attendance' },
        { label: 'Geofence & Shifts', icon: 'Globe', href: '/workspace/attendance' },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────
// Workforce Attendance & Time Tracking Types
// ─────────────────────────────────────────────────────────────

export interface AttendanceSettings {
  id: string;
  user_id: string;
  workspace_id: string;
  require_selfie: boolean;
  require_geofence: boolean;
  grace_period_minutes: number;
  default_shift_start: string;
  default_shift_end: string;
  half_day_threshold_hours: number;
  full_day_threshold_hours: number;
  overtime_threshold_hours: number;
  photo_retention_days: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceLocation {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  address?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceShift {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  start_time: string;
  end_time: string;
  is_overnight: boolean;
  grace_period_minutes: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceMemberLink {
  id: string;
  user_id: string;
  workspace_id: string;
  member_id: string;
  member?: FWTeamMember | null;
  secure_token: string;
  is_active: boolean;
  last_accessed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: string;
  user_id: string;
  workspace_id: string;
  member_id: string;
  member?: FWTeamMember | null;
  project_id?: string | null;
  project?: FWProject | null;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent' | 'late' | 'half_day' | 'leave' | 'holiday' | 'week_off';
  check_in_time?: string | null;
  check_in_lat?: number | null;
  check_in_lng?: number | null;
  check_in_accuracy?: number | null;
  check_in_photo_path?: string | null;
  check_in_selfie?: string | null;
  check_in_location_id?: string | null;
  check_in_location?: AttendanceLocation | null;
  check_in_verified: boolean;
  check_in_geofence_status: 'verified' | 'outside_geofence' | 'overridden' | 'no_geofence';
  check_out_time?: string | null;
  check_out_lat?: number | null;
  check_out_lng?: number | null;
  check_out_photo_path?: string | null;
  check_out_selfie?: string | null;
  check_out_verified: boolean;
  work_duration_minutes: number;
  break_duration_minutes: number;
  total_work_minutes?: number;
  total_pause_minutes?: number;
  overtime_minutes: number;
  late_minutes: number;
  early_checkout_minutes: number;
  auto_checkout?: boolean;
  shift_id?: string | null;
  device_info?: Record<string, any>;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendancePauseLog {
  id: string;
  user_id?: string | null;
  workspace_id: string;
  attendance_record_id: string;
  member_id: string;
  paused_at: string;
  resumed_at?: string | null;
  duration_minutes: number;
  reason?: string | null;
  created_at?: string;
}

export interface AttendanceBreak {
  id: string;
  attendance_record_id: string;
  user_id: string;
  workspace_id: string;
  member_id: string;
  break_start: string;
  break_end?: string | null;
  duration_minutes: number;
  break_type: 'lunch' | 'tea' | 'custom' | string;
  created_at?: string;
}

export interface AttendanceLeaveRequest {
  id: string;
  user_id: string;
  workspace_id: string;
  member_id: string;
  member?: FWTeamMember | null;
  leave_type: 'casual' | 'sick' | 'paid' | 'unpaid' | 'half_day' | 'emergency';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  review_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceCorrection {
  id: string;
  user_id: string;
  workspace_id: string;
  member_id: string;
  member?: FWTeamMember | null;
  attendance_record_id?: string | null;
  requested_check_in?: string | null;
  requested_check_out?: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string | null;
  created_at?: string;
}

export interface AttendanceHoliday {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  date: string;
  is_optional: boolean;
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────
// Workspace Clients, Post-Production & Finance Types
// ─────────────────────────────────────────────────────────────

export interface FinanceMilestoneItem {
  id: string;
  step_name?: string; // e.g. "Token Booking Amount", "Advance Amount (Pre-Event)", "On Wedding Day", "Final Delivery Amount"
  title?: string; // alias for step_name
  due_date?: string | null; // e.g. "2026-02-10"
  amount: number; // e.g. 25000
  status: 'pending' | 'completed' | 'partial' | 'paid' | string;
  paid_date?: string | null;
  payment_mode?: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | 'Cheque' | string;
  reference_id?: string | null;
  notes?: string | null;
}

export interface FinanceAuditLog {
  id: string;
  workspace_id: string;
  user_id?: string;
  client_id?: string | null;
  client_name?: string | null;
  log_type: 'INCOME' | 'EXPENSE' | 'ADJUSTMENT' | 'SECURITY';
  amount: number;
  actor_name: string;
  description: string;
  payment_mode?: string | null;
  reference_id?: string | null;
  created_at: string;
}

export interface FinanceSecuritySettings {
  id?: string;
  workspace_id: string;
  user_id?: string;
  is_locked: boolean;
  pin_hash?: string | null;
  admin_email?: string | null;
  master_password_hash?: string | null;
  session_timeout_minutes?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EventTypeItem {
  id: string;
  workspace_id: string;
  name: string;
  color?: string;
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClientFinanceRecord {
  id: string;
  user_id?: string;
  workspace_id: string;
  client_id: string;
  client?: WorkspaceClient | null;
  base_package_price: number;
  discount_amount: number;
  accommodation_charges: number;
  travel_charges: number;
  additional_charges: number;
  subtotal_amount: number;
  gst_rate: number;
  gst_amount: number;
  final_total_amount: number;
  received_amount: number;
  pending_amount: number;
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'overdue' | string;
  milestones: FinanceMilestoneItem[];
  notes?: string | null;
  has_final_quotation?: boolean;
  final_quotation_version?: number;
  final_quotation_id?: string;
  available_quotations?: Array<{
    template_id: string;
    version: number;
    title: string;
    is_final?: boolean;
    created_at: string;
    financials: any;
  }>;
  created_at: string;
  updated_at: string;
}

export interface FinanceExpenseItem {
  id: string;
  user_id?: string;
  workspace_id: string;
  client_id?: string | null;
  client?: WorkspaceClient | null;
  expense_type: 'team_payout' | 'project_expense' | 'other_expense';
  category: string; // e.g. "Photographer", "Travel", "Equipment Rental", "Custom"
  title: string;
  amount: number;
  payment_date: string;
  paid_to?: string | null;
  payment_mode: 'UPI' | 'Bank Transfer' | 'Cash' | 'Card' | string;
  status: 'paid' | 'pending';
  receipt_url?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceClient {
  id: string;
  workspace_id: string;
  lead_id?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  event_type: string;
  event_date?: string | null;
  total_package_amount: number;
  paid_amount: number;
  status: 'active' | 'completed' | 'archived';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliverableCategory = 'photos' | 'videos' | 'albums' | 'teaser' | 'film' | 'reels' | 'album';
export type DeliverableStatus = 'pending' | 'upcoming' | 'in_progress' | 'under_review' | 'completed' | 'done';

export interface DeliverableComment {
  id: string;
  text: string;
  authorName?: string;
  createdAt: string;
  alert_flag?: boolean;
  followup_at?: string | null;
}

export interface DeliverableItem {
  id: string;
  title: string;
  category: DeliverableCategory;
  count?: string | number | null; // e.g. '500 Photos', '25 Pages', '3 Reels'
  assigned_to?: string | null;
  deadline?: string | null;
  status: DeliverableStatus;
  drive_link?: string | null;
  revision_notes?: string | null;
  comments?: DeliverableComment[];
}

export interface PostProductionProject {
  id: string;
  user_id?: string;
  workspace_id: string;
  client_id: string;
  client?: WorkspaceClient | null;
  project_manager_id?: string | null;
  project_manager_name: string;
  overall_status: 'active' | 'delayed' | 'completed';
  deliverables: DeliverableItem[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// Dynamic Proposal Designer & Quotation Builder Types
// ─────────────────────────────────────────────────────────────

export interface QuotationThemeConfig {
  accent_color: string;
  primary_font: string;
  cover_style: 'cinematic_dark' | 'royal_gold' | 'minimal_white' | 'modern_dark';
  background_style?: string;
  logo_url?: string | null;
}

export interface QuotationSectionConfig {
  id: string;
  title: string;
  enabled: boolean;
}

export interface QuotationEvent {
  id: string;
  title: string;
  days: number;
  venue?: string | null;
  crew?: string | null;
  deliverables?: string[];
  rate: number;
}

export interface QuotationAddOnItem {
  id: string;
  title: string;
  rate: number;
  selected: boolean;
}

export interface QuotationFinancials {
  subtotal: number;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  gst_rate: number;
  total_amount: number;
}

export interface QuotationPaymentMilestone {
  label: string;
  percentage: number;
  amount: number;
  due_description?: string;
}

export interface QuotationTemplateDoc {
  id: string;
  workspace_id: string;
  title: string;
  theme_config: QuotationThemeConfig;
  sections_config: QuotationSectionConfig[];
  default_terms: string;
  created_at: string;
  updated_at: string;
}

export interface QuotationProposal {
  id: string;
  workspace_id: string;
  client_id?: string | null;
  client?: WorkspaceClient | null;
  template_id?: string | null;
  quotation_number: string;
  title: string;
  client_name: string;
  client_phone?: string | null;
  client_email?: string | null;
  event_date?: string | null;
  theme_config: QuotationThemeConfig;
  sections_config: QuotationSectionConfig[];
  events: QuotationEvent[];
  add_ons: QuotationAddOnItem[];
  financials: QuotationFinancials;
  payment_milestones: QuotationPaymentMilestone[];
  terms: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined';
  client_notes?: string | null;
  public_token: string;
  created_at: string;
  updated_at: string;
}

export * from './landing';



