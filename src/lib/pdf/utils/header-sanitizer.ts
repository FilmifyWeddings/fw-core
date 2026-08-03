export function sanitizeUnicodeText(input?: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/\u2013/g, '-')       // EN DASH – -> -
    .replace(/\u2014/g, '-')       // EM DASH — -> -
    .replace(/[\u2018\u2019]/g, "'") // SMART SINGLE QUOTES ‘’ -> '
    .replace(/[\u201C\u201D]/g, '"') // SMART DOUBLE QUOTES “” -> "
    .replace(/\u2026/g, '...')     // ELLIPSIS … -> ...
    .replace(/\u00A0/g, ' ');      // NON-BREAKING SPACE -> ' '
}

export function formatContentDispositionHeader(rawFilename?: string): string {
  const filename = rawFilename || 'Document.pdf';
  
  const safeAsciiFilename = filename
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, '-')
    .replace(/[^\x20-\x7E]/g, '-')
    .replace(/"/g, "'");

  const encodedFilename = encodeURIComponent(filename);

  return `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodedFilename}`;
}
