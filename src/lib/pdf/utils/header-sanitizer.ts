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

/**
 * Strict RFC 5987 percent-encoding for HTTP headers.
 */
export function encodeRFC5987(str: string): string {
  return encodeURIComponent(str)
    .replace(/['()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/\*/g, '%2A');
}

/**
 * Constructs RFC 5987 compliant Content-Disposition header.
 * Ensures zero raw non-ASCII bytes enter HTTP Response headers.
 */
export function formatContentDispositionHeader(rawFilename?: string): string {
  const filename = rawFilename || 'Document.pdf';
  
  // Strict ASCII-only fallback filename for legacy clients
  const asciiFallback = filename
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/"/g, "'");

  const rfc5987Encoded = encodeRFC5987(filename);

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${rfc5987Encoded}`;
}
