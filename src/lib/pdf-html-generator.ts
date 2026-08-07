import { renderQuotationReactComponentToHTML } from './pdf-server-renderer';

export function getEmbeddedCustomFontsBase64CSS(): string {
  return '';
}

export function renderQuotationToHTML(documentData: any): string {
  return renderQuotationReactComponentToHTML(documentData);
}
