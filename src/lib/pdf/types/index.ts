export type DocumentType =
  | 'quotation'
  | 'invoice'
  | 'contract'
  | 'report'
  | 'album'
  | 'receipt'
  | 'timeline'
  | 'document';

export interface PDFPagePayload {
  html: string;
  width?: number;  // Measured scrollWidth
  height?: number; // Measured scrollHeight
  pageIndex?: number;
  cssStyles?: string;
}

export interface PDFDocumentPayload {
  pages: PDFPagePayload[];
  title?: string;
  filename?: string;
  documentType?: DocumentType;
  baseUrl?: string;
  metadata?: Record<string, any>;
  async?: boolean;
}

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface PDFJob {
  id: string;
  status: JobStatus;
  progress: number; // 0 to 100
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
  stack?: string;
  downloadUrl?: string;
  pdfBuffer?: Uint8Array;
  filename?: string;
}

export interface PDFEngineConfig {
  maxPoolSize: number;
  maxOperationsPerInstance: number;
  instanceTimeoutMs: number;
  renderTimeoutMs: number;
  deviceScaleFactor: number;
  defaultViewportWidth: number;
  defaultViewportHeight: number;
}
