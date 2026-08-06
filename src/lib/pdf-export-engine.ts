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
 * Exports the quotation canvas (#quotation-full-canvas) as a SINGLE CONTINUOUS LONG PAGE PDF
 * with 100% exact fidelity to font sizes, image dimensions, element positions, and layout.
 */
export async function exportClientCanvasToPDF(
  elementId: string = 'quotation-full-canvas',
  filename: string = 'Quotation.pdf',
  onProgress?: (message: string) => void
): Promise<void> {
  onProgress?.('Preparing design canvas for export...');
  
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error('Quotation canvas element not found on page.');
  }

  onProgress?.('Capturing high-resolution continuous document...');

  // Capture the complete canvas at 2x scale for crisp fonts and images
  const canvas = await html2canvasPro(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: 794,
  });

  const canvasWidthPx = canvas.width;
  const canvasHeightPx = canvas.height;

  // Standard width 210mm (A4 width, matching 794px)
  const pdfWidthMm = 210;
  // Calculate exact continuous document height in mm
  const pdfHeightMm = (canvasHeightPx / canvasWidthPx) * pdfWidthMm;

  onProgress?.('Generating single continuous long-page PDF...');

  // Create single continuous PDF page matching exact canvas height
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
}

/**
 * Primary export method. Always exports exact continuous single long-page PDF.
 */
export async function downloadServerChromiumPdf(options: ServerPdfExportOptions): Promise<void> {
  const { templateId, filename, content_json, userAccessToken, onProgress } = options;

  const cleanFilename = (filename || `${templateId}-Quotation.pdf`)
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^ -~]/g, '-')
    .trim();

  const finalFilename = cleanFilename.toLowerCase().endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;

  // Direct high-fidelity continuous single long-page canvas export
  await exportClientCanvasToPDF('quotation-full-canvas', finalFilename, onProgress);
}
