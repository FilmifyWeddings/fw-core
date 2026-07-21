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
  stage_position?: number;
  whatsapp_group_id?: string | null;
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
  name: string;
  primary_role: string;
  country_code?: string;
  phone_number: string;
  email?: string;
  active_status?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
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

export type SubAppSlug = 'team-manager' | 'quotations' | 'leads';

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
  ],
};


