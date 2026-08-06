import html2canvasPro from 'html2canvas-pro';
import jsPDF from 'jspdf';

export interface ServerPdfExportOptions {
  templateId: string;
  filename?: string;
  content_json?: any;
  userAccessToken?: string;
  onProgress?: (message: string) => void;
}

/**
 * Renders exact screen DOM elements (.quotation-page inside #quotation-full-canvas)
 * directly into a high-definition multi-page A4 PDF document.
 */
export async function exportClientCanvasToPDF(
  elementId: string = 'quotation-full-canvas',
  filename: string = 'Quotation.pdf',
  onProgress?: (message: string) => void
): Promise<void> {
  onProgress?.('Preparing canvas elements...');
  
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Quotation canvas element not found on page.');
  }

  // Find all quotation page sections
  const pageSections = Array.from(element.querySelectorAll<HTMLElement>('.quotation-page'));
  if (pageSections.length === 0) {
    // Fallback: render entire canvas container if no .quotation-page sections found
    pageSections.push(element);
  }

  onProgress?.(`Found ${pageSections.length} page(s) to export...`);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm

  for (let i = 0; i < pageSections.length; i++) {
    onProgress?.(`Rendering Page ${i + 1} of ${pageSections.length}...`);
    const pageEl = pageSections[i];

    // Capture each page section at 2x scale for high resolution text and images
    const canvas = await html2canvasPro(pageEl, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
  }

  onProgress?.('Saving PDF file...');
  const cleanFilename = (filename || 'Quotation.pdf')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^ -~]/g, '-')
    .trim();

  const finalName = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;
  pdf.save(finalName);
  onProgress?.('PDF Downloaded Successfully!');
}

/**
 * Downloads high-definition PDF. Attempts server rendering first, falling back seamlessly
 * to direct client-side canvas rendering to guarantee 100% fidelity.
 */
export async function downloadServerChromiumPdf(options: ServerPdfExportOptions): Promise<void> {
  const { templateId, filename, content_json, userAccessToken, onProgress } = options;

  const cleanFilename = (filename || `${templateId}-Quotation.pdf`)
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^ -~]/g, '-')
    .trim();

  const finalFilename = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

  try {
    onProgress?.('Rendering PDF on Server-Side Engine...');

    const res = await fetch('/api/pdf/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userAccessToken ? { Authorization: `Bearer ${userAccessToken}` } : {})
      },
      body: JSON.stringify({
        templateId,
        filename: finalFilename,
        content_json
      })
    });

    if (!res.ok) {
      throw new Error(`Server endpoint returned status ${res.status}`);
    }

    onProgress?.('Downloading binary PDF...');
    const blob = await res.blob();

    if (blob.size < 1000) {
      throw new Error('Server returned an empty or invalid PDF buffer');
    }

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
    console.warn('[PDF Export Engine] Server rendering notice, switching to direct canvas export:', err?.message);
    onProgress?.('Generating PDF directly from active design canvas...');
    await exportClientCanvasToPDF('quotation-full-canvas', finalFilename, onProgress);
  }
}
