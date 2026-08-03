export interface PDFPagePayload {
  html: string;
  width: number;
  height: number;
  pageIndex?: number;
}

export interface PDFDocumentPayload {
  pages: PDFPagePayload[];
  title?: string;
  filename?: string;
  baseUrl?: string;
  metadata?: {
    author?: string;
    subject?: string;
    creator?: string;
    documentType?: 'quotation' | 'invoice' | 'contract' | 'report' | 'album' | 'document';
  };
}

export interface PDFRenderOptions {
  scale?: number;
  deviceScaleFactor?: number;
  timeoutMs?: number;
}
