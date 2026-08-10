import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    process.env[match[1]] = value.trim();
  }
});

async function inspectBrounTemplate() {
  console.log('=== INSPECTING TEMPLATE DATA FOR BROUN & USER TEMPLATES ===\n');

  const { createClient } = await import('@supabase/supabase-js');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: { persistSession: false }
  });

  // Query quotation_templates
  const { data: tmpls } = await supabaseAdmin
    .from('quotation_templates')
    .select('id, title, user_id, is_system_template')
    .order('updated_at', { ascending: false });

  console.log(`Found ${tmpls?.length || 0} templates in quotation_templates table.`);

  if (tmpls) {
    for (const t of tmpls) {
      console.log(`\n--- Template ID: ${t.id} ("${t.title}") ---`);

      // 1. quotation_documents
      const { data: doc } = await supabaseAdmin
        .from('quotation_documents')
        .select('*')
        .eq('template_id', t.id)
        .maybeSingle();

      // 2. quotations
      const { data: quoteRec } = await supabaseAdmin
        .from('quotations')
        .select('*')
        .or(`id.eq.${t.id},quotation_number.eq.${t.id}`)
        .maybeSingle();

      const docJson = doc?.content_json || doc?.document_json || quoteRec?.canvas_data || quoteRec?.content_json;

      console.log('Document Snapshot In DB:', {
        hasQuotationDoc: !!doc,
        hasQuotationRecord: !!quoteRec,
        hasContentJson: !!docJson,
        coverObj: docJson?.cover || null,
        coverPhotoUrl: docJson?.cover?.photoUrl || docJson?.cover?.photo || docJson?.cover?.imageUrl || 'NONE',
        frameShape: docJson?.cover?.frameShape || 'NONE'
      });
    }
  }
}

inspectBrounTemplate().catch(console.error);
