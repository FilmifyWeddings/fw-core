import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: List all WhatsApp templates for a workspace
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    const { data: templates, error } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      results: templates || []
    });
  } catch (err: any) {
    console.error('Fetch templates error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// POST: Create a WhatsApp template and sync with WhatsBoost
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json({ error: 'Missing workspace_id parameter' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, category, language, type, payload, buttons, meta_approval_required } = body;

    if (!name || !category || !language || !type) {
      return NextResponse.json({ error: 'Missing required template fields' }, { status: 400 });
    }

    const api_url = process.env.WHASTBOOST_API_URL || 'https://whatsboost.in/api/v1';
    const app_key = process.env.WHASTBOOST_APP_KEY;
    const auth_key = process.env.WHASTBOOST_AUTH_KEY;
    const isLive = !!(app_key && auth_key);

    let templateStatus = 'approved';

    // 1. Sync with WhatsBoost if credentials are live
    if (isLive) {
      const syncUrl = `${api_url}/templates?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
      console.log(`Syncing template "${name}" to WhatsBoost: ${syncUrl}`);
      
      // Construct WhatsBoost specific payload structure
      const whatsboostPayload: any = {
        name: name.trim().toLowerCase().replace(/\s+/g, '_'), // WhatsBoost names are typically snake_case
        category: category.toLowerCase(),
        language: language,
        type: type.toLowerCase(),
        body: payload.body || payload.question || ""
      };

      // 1. Footer (if present)
      if (payload.footer) {
        whatsboostPayload.footer = payload.footer;
      }

      // 2. Media parameters (if type is media)
      if (type.toLowerCase() === 'media') {
        whatsboostPayload.media = {
          url: payload.mediaUrl || payload.default_send_media_url || "",
          mime: payload.mediaMime || payload.default_send_media_mime || ""
        };
      }

      // 3. List parameters (if type is list)
      if (type.toLowerCase() === 'list') {
        whatsboostPayload.list = {
          buttonText: payload.buttonText || "",
          sections: (payload.sections || []).map((sec: any) => ({
            title: sec.title,
            rows: (sec.rows || []).map((row: any) => ({
              id: row.id || String(Math.random()),
              title: row.title,
              description: row.desc || row.description || ""
            }))
          }))
        };
      }

      // 4. Poll parameters (if type is poll)
      if (type.toLowerCase() === 'poll') {
        whatsboostPayload.poll = {
          question: payload.question || payload.body || "",
          multipleAnswers: typeof payload.allowMultiple === 'boolean' ? payload.allowMultiple : (payload.multipleAnswers || false),
          options: (payload.options || []).map((opt: any) => ({
            text: opt.text
          }))
        };
      }

      // 5. Buttons formatting (exclude id, replace value with url/phoneNumber)
      if (buttons && buttons.length > 0) {
        whatsboostPayload.buttons = buttons.map((btn: any) => {
          const mappedBtn: any = {
            type: btn.type,
            text: btn.text
          };
          if (btn.type === 'url') {
            mappedBtn.url = btn.value || btn.url || "";
          } else if (btn.type === 'phone') {
            mappedBtn.phoneNumber = btn.value || btn.phoneNumber || "";
          }
          return mappedBtn;
        });
      }

      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': auth_key,
          'appkey': app_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsboostPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('WhatsBoost template creation failed:', errText);
        throw new Error(`WhatsBoost API returned ${response.status}: ${errText}`);
      }

      const syncResult = await response.json();
      console.log('WhatsBoost sync success:', syncResult);
      
      // Mirror status from sync result if returned, else default to approved or pending
      templateStatus = syncResult.status || (meta_approval_required ? 'pending' : 'approved');
    } else {
      // Mock fallback: if Meta approval is checked, mark as pending, else approved
      templateStatus = meta_approval_required ? 'pending' : 'approved';
    }

    // 2. Write to local database in Supabase
    const { data: template, error: dbErr } = await supabaseAdmin
      .from('whatsapp_templates')
      .insert({
        workspace_id: workspaceId,
        name: name,
        category: category,
        language: language,
        type: type,
        status: templateStatus,
        payload: payload || {},
        buttons: buttons || [],
        meta_approval_required: !!meta_approval_required,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (dbErr) {
      console.error('Database template insert error:', dbErr);
      throw dbErr;
    }

    // 3. Log event to live_logs
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'sync_templates_success',
      message: `WhatsApp template "${name}" created and synced successfully (${templateStatus}).`,
      metadata: { templateId: template.id, status: templateStatus }
    });

    return NextResponse.json({
      success: true,
      template
    });
  } catch (err: any) {
    console.error('Template creation error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Template creation failed' }, { status: 500 });
  }
}

// PATCH: Update an existing WhatsApp template and sync with WhatsBoost
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspace_id');
  const templateId = searchParams.get('template_id');

  if (!workspaceId || !templateId) {
    return NextResponse.json({ error: 'Missing workspace_id or template_id parameter' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { name, category, language, type, payload, buttons, meta_approval_required } = body;

    if (!name || !category || !language || !type) {
      return NextResponse.json({ error: 'Missing required template fields' }, { status: 400 });
    }

    const api_url = process.env.WHASTBOOST_API_URL || 'https://whatsboost.in/api/v1';
    const app_key = process.env.WHASTBOOST_APP_KEY;
    const auth_key = process.env.WHASTBOOST_AUTH_KEY;
    const isLive = !!(app_key && auth_key);

    let templateStatus = 'approved';

    // 1. Get the current template name from database to know what old template to delete
    const { data: currentTemplate, error: fetchErr } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('name')
      .eq('id', templateId)
      .eq('workspace_id', workspaceId)
      .single();

    if (fetchErr || !currentTemplate) {
      console.error('Failed to fetch existing template:', fetchErr);
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const oldName = currentTemplate.name.trim().toLowerCase().replace(/\s+/g, '_');
    const newName = name.trim().toLowerCase().replace(/\s+/g, '_');

    // 2. Sync with WhatsBoost if credentials are live
    if (isLive) {
      // Step A: Find the template on WhatsBoost to delete it
      const syncUrl = `${api_url}/templates?authkey=${auth_key}&apiKey=${auth_key}&appkey=${app_key}`;
      
      try {
        console.log(`Fetching template list from WhatsBoost to find old template "${oldName}" or conflicts with "${newName}"`);
        const listRes = await fetch(syncUrl, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-key': auth_key,
            'appkey': app_key
          }
        });

        if (listRes.ok) {
          const listData = await listRes.json();
          const templatesList = listData.results || [];
          
          // Find old template ID
          const oldTemplateOnWb = templatesList.find((t: any) => t.name === oldName);
          // Find new template ID (if different, e.g. name changed but matches an existing one on WhatsBoost)
          const newTemplateOnWb = templatesList.find((t: any) => t.name === newName);

          const deleteIds: string[] = [];
          if (oldTemplateOnWb) deleteIds.push(oldTemplateOnWb.id);
          if (newTemplateOnWb && newTemplateOnWb.id !== oldTemplateOnWb?.id) {
            deleteIds.push(newTemplateOnWb.id);
          }

          if (deleteIds.length > 0) {
            console.log(`Deleting templates on WhatsBoost: ${deleteIds}`);
            const deleteRes = await fetch(syncUrl, {
              method: 'DELETE',
              headers: {
                'accept': 'application/json',
                'x-api-key': auth_key,
                'appkey': app_key,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ templateIds: deleteIds })
            });
            console.log(`Delete response status: ${deleteRes.status}`);
          }
        }
      } catch (err) {
        console.error('Error listing/deleting old template on WhatsBoost:', err);
      }

      // Step B: Re-create the template on WhatsBoost with updated payload
      console.log(`Creating updated template "${newName}" to WhatsBoost`);
      
      const whatsboostPayload: any = {
        name: newName,
        category: category.toLowerCase(),
        language: language,
        type: type.toLowerCase(),
        body: payload.body || payload.question || ""
      };

      if (payload.footer) {
        whatsboostPayload.footer = payload.footer;
      }

      if (type.toLowerCase() === 'media') {
        whatsboostPayload.media = {
          url: payload.mediaUrl || payload.default_send_media_url || "",
          mime: payload.mediaMime || payload.default_send_media_mime || ""
        };
      }

      if (type.toLowerCase() === 'list') {
        whatsboostPayload.list = {
          buttonText: payload.buttonText || "",
          sections: (payload.sections || []).map((sec: any) => ({
            title: sec.title,
            rows: (sec.rows || []).map((row: any) => ({
              id: row.id || String(Math.random()),
              title: row.title,
              description: row.desc || row.description || ""
            }))
          }))
        };
      }

      if (type.toLowerCase() === 'poll') {
        whatsboostPayload.poll = {
          question: payload.question || payload.body || "",
          multipleAnswers: typeof payload.allowMultiple === 'boolean' ? payload.allowMultiple : (payload.multipleAnswers || false),
          options: (payload.options || []).map((opt: any) => ({
            text: opt.text
          }))
        };
      }

      if (buttons && buttons.length > 0) {
        whatsboostPayload.buttons = buttons.map((btn: any) => {
          const mappedBtn: any = {
            type: btn.type,
            text: btn.text
          };
          if (btn.type === 'url') {
            mappedBtn.url = btn.value || btn.url || "";
          } else if (btn.type === 'phone') {
            mappedBtn.phoneNumber = btn.value || btn.phoneNumber || "";
          }
          return mappedBtn;
        });
      }

      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': auth_key,
          'appkey': app_key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsboostPayload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('WhatsBoost template updating failed:', errText);
        throw new Error(`WhatsBoost API returned ${response.status}: ${errText}`);
      }

      const syncResult = await response.json();
      console.log('WhatsBoost update success:', syncResult);
      templateStatus = syncResult.status || (meta_approval_required ? 'pending' : 'approved');
    } else {
      templateStatus = meta_approval_required ? 'pending' : 'approved';
    }

    // 3. Write updates to local database in Supabase
    const { data: template, error: dbErr } = await supabaseAdmin
      .from('whatsapp_templates')
      .update({
        name: name,
        category: category,
        language: language,
        type: type,
        status: templateStatus,
        payload: payload || {},
        buttons: buttons || [],
        meta_approval_required: !!meta_approval_required,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (dbErr) {
      console.error('Database template update error:', dbErr);
      throw dbErr;
    }

    // 4. Log event to live_logs
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      event_type: 'sync_templates_success',
      message: `WhatsApp template "${name}" updated and synced successfully (${templateStatus}).`,
      metadata: { templateId: template.id, status: templateStatus }
    });

    return NextResponse.json({
      success: true,
      template
    });
  } catch (err: any) {
    console.error('Template update error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Template update failed' }, { status: 500 });
  }
}
