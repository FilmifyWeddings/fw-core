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

    onProgress?.('Preparing Page-by-Page A4 PDF export...');

    const clonedPages = Array.from(iframeDoc.querySelectorAll<HTMLElement>('.quotation-page'));

    const cleanFilename = (filename || 'Quotation.pdf')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-')
      .trim();

    const finalName = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    if (clonedPages.length > 0) {
      onProgress?.(`Processing ${clonedPages.length} pages in standard A4 format...`);

      for (let i = 0; i < clonedPages.length; i++) {
        const pageEl = clonedPages[i];
        onProgress?.(`Rendering page ${i + 1} of ${clonedPages.length}...`);

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const pageCanvas = await html2canvasPro(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          windowWidth: 794,
        });

        const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageImg, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
    } else {
      onProgress?.('Capturing high-resolution document in A4 pages...');
      const captureTarget = iframeDoc.getElementById(elementId) || iframeDoc.body;
      const canvas = await html2canvasPro(captureTarget, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794,
      });

      const canvasWidth = canvas.width;
      const pageCanvasHeight = Math.round(canvasWidth * (297 / 210));
      const totalPages = Math.max(1, Math.ceil(canvas.height / pageCanvasHeight));

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) pdf.addPage('a4', 'portrait');
        const srcY = p * pageCanvasHeight;
        const srcH = Math.min(pageCanvasHeight, canvas.height - srcY);

        const pageCanvas = document.createElement('canvas');
        pageCanvas.width = canvasWidth;
        pageCanvas.height = pageCanvasHeight;
        const ctx = pageCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, pageCanvasHeight);
          ctx.drawImage(canvas, 0, srcY, canvasWidth, srcH, 0, 0, canvasWidth, srcH);
        }
        const pageImg = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageImg, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }
    }

    onProgress?.('Saving Page-by-Page A4 PDF file...');
    pdf.save(finalName);
    onProgress?.('PDF Downloaded Successfully!');
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Fast Discrete Page-by-Page A4 PDF Exporter for Quotation Documents.
 * Works ANYWHERE (inside Leads CRM modals, public view, or background)
 * without requiring the live canvas in the DOM and NEVER opening browser print popups.
 */
export async function exportQuotationDocumentToA4Pdf(options: {
  templateId?: string;
  quotationId?: string;
  filename?: string;
  content_json?: any;
  onProgress?: (message: string) => void;
}): Promise<void> {
  const { templateId, quotationId, filename, onProgress } = options;
  let content_json = options.content_json;
  const targetId = quotationId || templateId;

  onProgress?.('Initializing A4 PDF engine...');

  const cleanFilename = (filename || `${targetId || 'Quotation'}.pdf`)
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^ -~]/g, '-')
    .trim();
  const finalFilename = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

  let htmlMarkup = '';

  // 1. If content_json not passed, fetch it or fetch pre-rendered HTML
  if (!content_json && targetId) {
    onProgress?.('Fetching quotation details...');
    try {
      const docRes = await fetch(`/api/templates/${targetId}`);
      if (docRes.ok) {
        const json = await docRes.json();
        content_json = json.template?.content_json || json.content_json || json;
      }
    } catch (_) {}
  }

  if (content_json) {
    onProgress?.('Composing document layout...');
    const { renderQuotationToHTML } = await import('@/lib/pdf-html-generator');
    htmlMarkup = renderQuotationToHTML(content_json);
  } else if (targetId) {
    onProgress?.('Fetching document layout...');
    const res = await fetch(`/api/quotations/${targetId}/render-html`);
    if (res.ok) {
      htmlMarkup = await res.text();
    }
  }

  if (!htmlMarkup) {
    throw new Error('Unable to generate quotation layout.');
  }

  onProgress?.('Preparing rendering sandbox...');

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-99999px';
  iframe.style.left = '-99999px';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '-99999';
  iframe.style.visibility = 'hidden';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Sandbox document could not be created');
    }

    iframeDoc.open();
    iframeDoc.write(htmlMarkup);
    iframeDoc.close();

    // Ensure fonts and images are ready
    if (iframeDoc.fonts) {
      try {
        await iframeDoc.fonts.ready;
      } catch (_) {}
    }

    const images = Array.from(iframeDoc.querySelectorAll('img'));
    if (images.length > 0) {
      await Promise.all(
        images.map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
            setTimeout(resolve, 2500);
          });
        })
      );
    }

    // Query discrete A4 pages
    let pages = Array.from(
      iframeDoc.querySelectorAll<HTMLElement>('.pdf-page, .quotation-page, .quotation-canvas-page, section')
    );

    // If query returns empty, fallback to container or body
    if (pages.length === 0) {
      const container = iframeDoc.getElementById('quotation-canvas-container') || iframeDoc.body;
      if (container) {
        pages = [container];
      }
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    onProgress?.(`Rendering ${pages.length} pages in standard A4 format...`);

    for (let i = 0; i < pages.length; i++) {
      const pageEl = pages[i];
      onProgress?.(`Rendering page ${i + 1} of ${pages.length}...`);

      if (i > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const canvas = await html2canvasPro(pageEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 794
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    onProgress?.('Saving PDF file...');
    pdf.save(finalFilename);
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
    console.warn('[PDF Export Engine] Server rendering notice, switching to Page-by-Page A4 Sandbox Export:', err?.message);
    const canvasEl = document.getElementById('quotation-full-canvas');
    if (canvasEl) {
      onProgress?.('Generating Page-by-Page A4 PDF via IFrame Sandbox Engine...');
      await exportClientCanvasToPDF('quotation-full-canvas', finalFilename, onProgress);
    } else {
      onProgress?.('Generating Page-by-Page A4 PDF via Sandbox Engine...');
      await exportQuotationDocumentToA4Pdf({
        templateId,
        quotationId,
        filename: finalFilename,
        content_json,
        onProgress
      });
    }
  }
}
