import html2canvasPro from 'html2canvas-pro';
import jsPDF from 'jspdf';

export interface InvoicePdfExportOptions {
  elementId?: string;
  filename?: string;
  onProgress?: (msg: string) => void;
}

/**
 * Universal Mobile + Desktop High-Resolution PDF Exporter for Invoices.
 * Uses html2canvas-pro and jsPDF to ensure pixel-perfect rendering across iOS, Android, and Desktop.
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

  // Ensure fonts are loaded
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {}
  }

  onProgress?.('Generating high-resolution snapshot...');

  const canvas = await html2canvasPro(originalElement, {
    scale: 2, // 2x high resolution
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#FFFFFF',
    logging: false,
  });

  onProgress?.('Building PDF document...');

  const imgData = canvas.toDataURL('image/png', 1.0);
  
  // A4 Standard Dimensions: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 210;
  const pageHeight = 297;
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // First page
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  // Multi-page handling if invoice overflows A4
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  onProgress?.('Downloading invoice...');
  pdf.save(filename);
}
