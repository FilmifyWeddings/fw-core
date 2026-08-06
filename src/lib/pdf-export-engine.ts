

export interface ServerPdfExportOptions {
  templateId: string;
  filename?: string;
  content_json?: any;
  userAccessToken?: string;
  onProgress?: (message: string) => void;
}

/**
 * Downloads high-definition PDF generated directly by Server-Side Headless Chromium.
 */
export async function downloadServerChromiumPdf(options: ServerPdfExportOptions): Promise<void> {
  const { templateId, filename, content_json, userAccessToken, onProgress } = options;

  onProgress?.('Rendering PDF on Server-Side Headless Chromium...');

  const cleanFilename = (filename || `${templateId}-Quotation.pdf`)
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/[^ -~]/g, '-');

  const res = await fetch('/api/pdf/render', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(userAccessToken ? { Authorization: `Bearer ${userAccessToken}` } : {})
    },
    body: JSON.stringify({
      templateId,
      filename: cleanFilename,
      content_json
    })
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || `Server rendering failed with status ${res.status}`);
  }

  onProgress?.('Downloading binary PDF...');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename.endsWith('.pdf') ? cleanFilename : `${cleanFilename}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);

  onProgress?.('PDF Downloaded Successfully!');
}
