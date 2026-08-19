import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { renderQuotationToHTML } from '@/lib/pdf-html-generator';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

interface PdfPreviewProps {
  params: Promise<{ id: string }>;
}

export default async function PdfPreviewPage({ params }: PdfPreviewProps) {
  const { id } = await params;

  let documentData: any = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const { data: doc } = await supabaseAdmin
    .from('quotation_documents')
    .select('content_json')
    .eq('template_id', id)
    .maybeSingle();

  const docContent = doc?.content_json;
  if (docContent && typeof docContent === 'object' && Object.keys(docContent).length > 0) {
    documentData = docContent;
  } else {
    let legacyQuery = supabaseAdmin.from('quotations').select('content_json, canvas_data');
    if (isUuid) {
      legacyQuery = legacyQuery.or(`id.eq.${id},quotation_number.eq.${id}`);
    } else {
      legacyQuery = legacyQuery.eq('quotation_number', id);
    }
    const { data: legacy } = await legacyQuery.maybeSingle();
    documentData = legacy?.content_json || legacy?.canvas_data || {};
  }

  const html = renderQuotationToHTML(documentData || { templateId: id });

  return (
    <div 
      id="quotation-pdf-preview-root" 
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}
