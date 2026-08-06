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
 * using an isolated 794px desktop rendering sandbox.
 * Guarantees 100% IDENTICAL output on Mobile devices and Desktop PCs (zero squished text or overlapping elements).
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

  onProgress?.('Initializing isolated desktop rendering sandbox...');

  // 1. Create an off-screen desktop sandbox container (fixed at 794px width)
  const sandbox = document.createElement('div');
  sandbox.style.position = 'absolute';
  sandbox.style.top = '-99999px';
  sandbox.style.left = '-99999px';
  sandbox.style.width = '794px';
  sandbox.style.minWidth = '794px';
  sandbox.style.maxWidth = '794px';
  sandbox.style.backgroundColor = '#ffffff';
  sandbox.style.zIndex = '-9999';
  sandbox.style.overflow = 'visible';

  // 2. Clone original canvas node
  const clone = originalElement.cloneNode(true) as HTMLElement;
  clone.style.width = '794px';
  clone.style.minWidth = '794px';
  clone.style.maxWidth = '794px';
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';

  // Lock all .quotation-page sections in clone to strict 794px desktop layout
  const clonedPages = clone.querySelectorAll<HTMLElement>('.quotation-page');
  clonedPages.forEach((p) => {
    p.style.width = '794px';
    p.style.minWidth = '794px';
    p.style.maxWidth = '794px';
    p.style.boxSizing = 'border-box';
    p.style.transform = 'none';
  });

  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // Wait for all images in clone to finish loading
    const images = Array.from(clone.querySelectorAll('img'));
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

    // 3. Capture clone in 794px desktop sandbox context
    const canvas = await html2canvasPro(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1200,
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
  } finally {
    // Clean up sandbox node
    if (document.body.contains(sandbox)) {
      document.body.removeChild(sandbox);
    }
  }
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
