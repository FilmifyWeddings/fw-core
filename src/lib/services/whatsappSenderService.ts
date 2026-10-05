import { uploadWhatsAppFileAndGetSignedUrl, getDirectB2FetchUrl } from './whatsappStorageService';
import { supabaseAdmin } from '@/lib/supabase';

export interface DispatchMediaDocumentParams {
  workspaceId: string;
  to: string;
  buffer: Buffer;
  fileName: string;
  caption?: string;
  mediaCategory?: 'quotation' | 'invoice' | 'flyer' | 'document' | string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface DispatchMediaImageParams {
  workspaceId: string;
  to: string;
  buffer: Buffer;
  fileName: string;
  caption?: string;
  mediaCategory?: 'flyer' | 'image' | string;
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface DispatchQuotationPdfParams {
  workspaceId: string;
  to: string;
  pdfBuffer: Buffer;
  quotationTitle: string;
  clientName?: string;
  totalAmount?: string | number;
  quotationId?: string;
  customCaption?: string;
}

export interface DispatchInvoicePdfParams {
  workspaceId: string;
  to: string;
  pdfBuffer: Buffer;
  invoiceNumber: string;
  clientName?: string;
  totalAmount?: string | number;
  invoiceId?: string;
  customCaption?: string;
}

/**
 * Normalizes phone numbers to WhatsApp JID format (e.g. 919876543210@s.whatsapp.net)
 */
export function normalizeWhatsAppJid(phone: string): string {
  if (!phone) return '';
  if (phone.includes('@s.whatsapp.net') || phone.includes('@g.us')) {
    return phone;
  }
  const clean = phone.replace(/[^0-9]/g, '');
  return `${clean}@s.whatsapp.net`;
}

/**
 * Uploads a document (e.g. Quotation/Invoice PDF) to Backblaze B2,
 * gets a 7-day Pre-signed URL, and dispatches it via Baileys action queue.
 *
 * NOTE: Never passes huge base64 strings or memory buffers into the queue.
 * Pass `{ document: { url: signedUrl }, fileName: ... }` so Baileys streams directly from B2.
 */
export async function dispatchWhatsAppMediaDocument({
  workspaceId,
  to,
  buffer,
  fileName,
  caption,
  mediaCategory = 'document',
  priority = 1,
  metadata = {},
}: DispatchMediaDocumentParams) {
  // 1. Upload to Backblaze B2 & get 7-day Pre-signed URL
  const uploadResult = await uploadWhatsAppFileAndGetSignedUrl({
    workspaceId,
    buffer,
    fileName: fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`,
    mimeType: 'application/pdf',
    mediaCategory,
    metadata,
  });

  const jid = normalizeWhatsAppJid(to);
  const pdfFileName = uploadResult.fileName.endsWith('.pdf') 
    ? uploadResult.fileName 
    : `${uploadResult.fileName}.pdf`;

  // 2. Enqueue in baileys_action_queue with direct Backblaze S3 pre-signed URL
  const directDispatchUrl = uploadResult.signedUrl || (await getDirectB2FetchUrl(uploadResult.fileKey));
  const { data, error } = await supabaseAdmin
    .from('baileys_action_queue')
    .insert({
      workspace_id: workspaceId,
      action_type: 'send_media',
      priority,
      status: 'pending',
      payload: {
        to: jid,
        mediaUrl: directDispatchUrl,
        document: {
          url: directDispatchUrl,
        },
        permanentUrl: uploadResult.permanentUrl,
        presignedUrl: directDispatchUrl,
        fileName: pdfFileName,
        mimetype: 'application/pdf',
        mimeType: 'application/pdf',
        caption: caption || undefined,
        fileKey: uploadResult.fileKey,
        fileSizeBytes: uploadResult.fileSizeBytes,
      },
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`[WhatsAppSender] Failed to enqueue document action: ${error.message}`);
  }

  return {
    success: true,
    actionId: data?.id,
    permanentUrl: uploadResult.permanentUrl,
    signedUrl: uploadResult.signedUrl,
    fileKey: uploadResult.fileKey,
    fileSizeBytes: uploadResult.fileSizeBytes,
  };
}

/**
 * Uploads an image to Backblaze B2 (compressed via sharp to WebP),
 * gets a 7-day Pre-signed URL, and dispatches via Baileys action queue.
 */
export async function dispatchWhatsAppMediaImage({
  workspaceId,
  to,
  buffer,
  fileName,
  caption,
  mediaCategory = 'image',
  priority = 1,
  metadata = {},
}: DispatchMediaImageParams) {
  // 1. Upload to Backblaze B2 & get 7-day Pre-signed URL
  const uploadResult = await uploadWhatsAppFileAndGetSignedUrl({
    workspaceId,
    buffer,
    fileName,
    mimeType: 'image/jpeg',
    mediaCategory,
    metadata,
  });

  const jid = normalizeWhatsAppJid(to);

  // 2. Enqueue in baileys_action_queue with direct Backblaze S3 pre-signed URL
  const directDispatchUrl = uploadResult.signedUrl || (await getDirectB2FetchUrl(uploadResult.fileKey));
  const { data, error } = await supabaseAdmin
    .from('baileys_action_queue')
    .insert({
      workspace_id: workspaceId,
      action_type: 'send_media',
      priority,
      status: 'pending',
      payload: {
        to: jid,
        mediaUrl: directDispatchUrl,
        image: {
          url: directDispatchUrl,
        },
        permanentUrl: uploadResult.permanentUrl,
        presignedUrl: directDispatchUrl,
        fileName: uploadResult.fileName,
        mimetype: uploadResult.mimeType,
        mimeType: uploadResult.mimeType,
        caption: caption || undefined,
        fileKey: uploadResult.fileKey,
        fileSizeBytes: uploadResult.fileSizeBytes,
      },
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`[WhatsAppSender] Failed to enqueue image action: ${error.message}`);
  }

  return {
    success: true,
    actionId: data?.id,
    permanentUrl: uploadResult.permanentUrl,
    signedUrl: uploadResult.signedUrl,
    fileKey: uploadResult.fileKey,
    fileSizeBytes: uploadResult.fileSizeBytes,
  };
}

/**
 * Specialized dispatcher for Quotation PDFs.
 * Uploads to Backblaze B2 and enqueues high-priority delivery via Baileys.
 */
export async function dispatchQuotationPdfWhatsApp({
  workspaceId,
  to,
  pdfBuffer,
  quotationTitle,
  clientName,
  totalAmount,
  quotationId,
  customCaption,
}: DispatchQuotationPdfParams) {
  const amountStr = totalAmount ? `₹${totalAmount.toLocaleString?.('en-IN') || totalAmount}` : '';
  const defaultCaption = [
    `📄 *Quotation: ${quotationTitle}*`,
    clientName ? `👤 Client: ${clientName}` : '',
    amountStr ? `💰 Estimated Total: ${amountStr}` : '',
  ].filter(Boolean).join('\n');

  const fileName = `Quotation_${quotationTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  return await dispatchWhatsAppMediaDocument({
    workspaceId,
    to,
    buffer: pdfBuffer,
    fileName,
    caption: customCaption || defaultCaption,
    mediaCategory: 'quotation',
    priority: 1, // Highest priority
    metadata: {
      quotation_id: quotationId,
      quotation_title: quotationTitle,
      client_name: clientName,
      total_amount: totalAmount,
    },
  });
}

/**
 * Specialized dispatcher for Invoice PDFs.
 * Uploads to Backblaze B2 and enqueues high-priority delivery via Baileys.
 */
export async function dispatchInvoicePdfWhatsApp({
  workspaceId,
  to,
  pdfBuffer,
  invoiceNumber,
  clientName,
  totalAmount,
  invoiceId,
  customCaption,
}: DispatchInvoicePdfParams) {
  const amountStr = totalAmount ? `₹${totalAmount.toLocaleString?.('en-IN') || totalAmount}` : '';
  const defaultCaption = [
    `🧾 *Invoice: #${invoiceNumber}*`,
    clientName ? `👤 Client: ${clientName}` : '',
    amountStr ? `💰 Total Amount: ${amountStr}` : '',
  ].filter(Boolean).join('\n');

  const fileName = `Invoice_${invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

  return await dispatchWhatsAppMediaDocument({
    workspaceId,
    to,
    buffer: pdfBuffer,
    fileName,
    caption: customCaption || defaultCaption,
    mediaCategory: 'invoice',
    priority: 1, // Highest priority
    metadata: {
      invoice_id: invoiceId,
      invoice_number: invoiceNumber,
      client_name: clientName,
      total_amount: totalAmount,
    },
  });
}
