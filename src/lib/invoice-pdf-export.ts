import html2canvasPro from 'html2canvas-pro';
import jsPDF from 'jspdf';

export interface InvoicePdfExportOptions {
  elementId?: string;
  filename?: string;
  onProgress?: (msg: string) => void;
}

/**
 * Canva-grade IFrame Sandbox Universal High-Resolution PDF Exporter for Invoices.
 * Creates an isolated 794px viewport inside a hidden iframe so that mobile browsers
 * (iOS Safari, Android Chrome) and Desktop PCs render 100% pixel-identical A4 layouts.
 */
export async function exportInvoiceToPDF({
  elementId = 'invoice-printable-document',
  filename = 'Invoice.pdf',
  onProgress,
}: InvoicePdfExportOptions = {}): Promise<void> {
  onProgress?.('Preparing invoice document...');

  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    throw new Error('Invoice document element not found');
  }

  // Ensure fonts are ready
  if (typeof document !== 'undefined' && document.fonts) {
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
  iframe.style.height = `${originalElement.scrollHeight || 1200}px`;
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

  // Clone all head styles and external fonts into iframe
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
      box-sizing: border-box !important;
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
    #invoice-printable-document {
      width: 794px !important;
      min-width: 794px !important;
      max-width: 794px !important;
      margin: 0 !important;
      padding: 36px 40px !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
  `;
  iframeDoc.head.appendChild(fixStyle);

  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.transform = 'none';
  clone.style.margin = '0';

  iframeDoc.body.appendChild(clone);

  try {
    if (iframeDoc.fonts) {
      try {
        await iframeDoc.fonts.ready;
      } catch {}
    }

    // Wait for all images in iframe (logos, QR codes) to complete loading
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

    onProgress?.('Capturing high-resolution document...');

    const captureTarget = iframeDoc.getElementById(elementId) || iframeDoc.body;

    const canvas = await html2canvasPro(captureTarget, {
      scale: 2.5, // 2.5x retina vector clarity
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });

    onProgress?.('Building standard A4 PDF document...');

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const pdfWidthMm = 210; // A4 standard width
    const pageHeightMm = 297; // A4 standard height
    const canvasHeightPx = canvas.height;
    const canvasWidthPx = canvas.width;
    const totalPdfHeightMm = (canvasHeightPx / canvasWidthPx) * pdfWidthMm;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // If fits within 1 page (or slight margin), add as single A4 page
    if (totalPdfHeightMm <= pageHeightMm) {
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidthMm, totalPdfHeightMm, undefined, 'FAST');
    } else {
      let heightLeft = totalPdfHeightMm;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidthMm, totalPdfHeightMm, undefined, 'FAST');
      heightLeft -= pageHeightMm;

      while (heightLeft > 0) {
        position = heightLeft - totalPdfHeightMm;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidthMm, totalPdfHeightMm, undefined, 'FAST');
        heightLeft -= pageHeightMm;
      }
    }

    onProgress?.('Downloading invoice PDF...');
    const cleanFilename = (filename || 'Invoice.pdf')
      .replace(/–/g, '-')
      .replace(/—/g, '-')
      .replace(/[^ -~]/g, '-')
      .trim();

    const finalName = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;
    pdf.save(finalName);
    onProgress?.('Downloaded successfully!');
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}
