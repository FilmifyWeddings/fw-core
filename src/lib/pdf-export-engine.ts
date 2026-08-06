import html2canvasPro from 'html2canvas-pro';
import jsPDF from 'jspdf';

export interface ServerPdfExportOptions {
  templateId: string;
  quotationId?: string;
  filename?: string;
  content_json?: any;
  userAccessToken?: string;
  onProgress?: (message: string) => void;
}

/**
 * Canva-grade IFrame Sandbox Client-Side Canvas PDF Exporter.
 * Creates an isolated 794px desktop viewport inside a hidden iframe
 * so that mobile browsers render 100% pixel-identical layouts to Desktop PCs.
 */
export async function exportClientCanvasToPDF(
  elementId: string = 'quotation-full-canvas',
  filename: string = 'Quotation.pdf',
  onProgress?: (message: string) => void
): Promise<void> {
  onProgress?.('Preparing design canvas for export...');

  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    throw new Error('Quotation canvas element not found on page.');
  }

  if (document.fonts) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  onProgress?.('Initializing isolated 794px rendering sandbox...');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-99999px';
  iframe.style.left = '-99999px';
  iframe.style.width = '794px';
  iframe.style.height = `${originalElement.scrollHeight || 6000}px`;
  iframe.style.border = 'none';
  iframe.style.zIndex = '-99999';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    if (document.body.contains(iframe)) document.body.removeChild(iframe);
    throw new Error('Failed to create rendering sandbox iframe');
  }

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=794, initial-scale=1" />
      </head>
      <body style="margin:0;padding:0;width:794px;background:#ffffff;"></body>
    </html>
  `);
  iframeDoc.close();

  const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'));
  headStyles.forEach((styleEl) => {
    try {
      iframeDoc.head.appendChild(styleEl.cloneNode(true));
    } catch {}
  });

  const fixStyle = iframeDoc.createElement('style');
  fixStyle.innerHTML = `
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      word-spacing: normal !important;
      font-variant-ligatures: none !important;
      text-rendering: geometryPrecision !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 794px !important;
      min-width: 794px !important;
      max-width: 794px !important;
      background: #ffffff !important;
      overflow: visible !important;
    }
    #quotation-full-canvas {
      width: 794px !important;
      min-width: 794px !important;
      max-width: 794px !important;
      margin: 0 !important;
      padding: 0 !important;
      transform: none !important;
    }
    .quotation-page {
      width: 794px !important;
      min-width: 794px !important;
      max-width: 794px !important;
      box-sizing: border-box !important;
      transform: none !important;
    }
  `;
  iframeDoc.head.appendChild(fixStyle);

  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';

  const clonedPages = clone.querySelectorAll<HTMLElement>('.quotation-page');
  clonedPages.forEach((p) => {
    p.style.width = '794px';
    p.style.minWidth = '794px';
    p.style.maxWidth = '794px';
    p.style.boxSizing = 'border-box';
    p.style.transform = 'none';
  });

  iframeDoc.body.appendChild(clone);

  try {
    if (iframeDoc.fonts) {
      try {
        await iframeDoc.fonts.ready;
      } catch {}
    }

    const images = Array.from(iframeDoc.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    onProgress?.('Capturing high-resolution continuous document...');

    const captureTarget = iframeDoc.getElementById(elementId) || iframeDoc.body;

    const canvas = await html2canvasPro(captureTarget, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });

    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;
    const pdfWidthMm = 210;
    const pdfHeightMm = (canvasHeightPx / canvasWidthPx) * pdfWidthMm;

    onProgress?.('Generating continuous single long-page PDF...');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidthMm, pdfHeightMm],
      compress: true
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, pdfHeightMm, undefined, 'FAST');

    onProgress?.('Saving continuous PDF file...');
    const cleanFilename = (filename || 'Quotation.pdf')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-')
      .trim();

    const finalName = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;
    pdf.save(finalName);
    onProgress?.('PDF Downloaded Successfully!');
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * 100% Server-First PDF Engine with Zero-Downtime Fallback.
 * Tries server rendering via Headless Chromium. If server API returns an error
 * or non-binary response, automatically falls back to Canva-grade IFrame Sandbox.
 */
export async function downloadServerChromiumPdf(options: ServerPdfExportOptions): Promise<void> {
  const { templateId, quotationId, filename, content_json, userAccessToken, onProgress } = options;
  const targetId = quotationId || templateId;

  onProgress?.('Generating PDF via Server-Side Headless Chromium Engine...');

  const cleanFilename = (filename || `${targetId}-Quotation.pdf`)
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^ -~]/g, '-')
    .trim();

  const finalFilename = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

  try {
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

    // 2. Retry secondary route /api/pdf/render if primary route fails
    if (!res.ok) {
      console.warn('[PDF Export Engine] Primary route status', res.status, '- Retrying secondary endpoint...');
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
      throw new Error(`Server rendering returned HTTP status ${res.status}`);
    }

    onProgress?.('Downloading binary PDF...');
    const blob = await res.blob();

    if (blob.size < 1000) {
      throw new Error('Server returned empty or invalid PDF binary buffer');
    }

    // Instant browser binary blob download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    onProgress?.('PDF Downloaded Successfully!');
  } catch (err: any) {
    console.warn('[PDF Export Engine] Server rendering notice, switching to Canva-grade IFrame Sandbox Export:', err?.message);
    onProgress?.('Generating PDF via IFrame Sandbox Engine...');
    await exportClientCanvasToPDF('quotation-full-canvas', finalFilename, onProgress);
  }
}
