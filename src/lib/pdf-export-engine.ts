export interface ServerPdfExportOptions {
  templateId: string;
  quotationId?: string;
  filename?: string;
  content_json?: any;
  userAccessToken?: string;
  onProgress?: (message: string) => void;
}

/**
 * 100% Server-Side Puppeteer PDF Download Engine.
 * Completely purged of client-side canvas/html2pdf/jspdf dependencies.
 * Mobile browsers never compute or render PDF layout locally.
 */
export async function downloadServerChromiumPdf(options: ServerPdfExportOptions): Promise<void> {
  const { templateId, quotationId, filename, content_json, userAccessToken, onProgress } = options;
  const targetId = quotationId || templateId;

  onProgress?.('Generating PDF on Server-Side Headless Chromium Engine...');

  const cleanFilename = (filename || `${targetId}-Quotation.pdf`)
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^ -~]/g, '-')
    .trim();

  const finalFilename = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

  // 1. Post to primary dedicated endpoint: POST /api/quotations/pdf
  let res = await fetch('/api/quotations/pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userAccessToken ? { Authorization: `Bearer ${userAccessToken}` } : {})
    },
    body: JSON.stringify({
      quotationId: targetId,
      templateId: targetId,
      filename: finalFilename,
      content_json
    })
  });

  // 2. Secondary fallback endpoint: POST /api/pdf/render
  if (!res.ok) {
    console.warn('[PDF Export Engine] Primary route returned status', res.status, '- Retrying fallback endpoint...');
    res = await fetch('/api/pdf/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userAccessToken ? { Authorization: `Bearer ${userAccessToken}` } : {})
      },
      body: JSON.stringify({
        templateId: targetId,
        filename: finalFilename,
        content_json
      })
    });
  }

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Server PDF rendering failed with status ${res.status}`);
  }

  onProgress?.('Downloading binary PDF...');
  const blob = await res.blob();

  if (blob.size < 1000) {
    throw new Error('Server returned an empty or invalid PDF buffer');
  }

  // 3. Instant browser binary blob download
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  onProgress?.('PDF Downloaded Successfully!');
}
