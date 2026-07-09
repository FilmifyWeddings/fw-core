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


