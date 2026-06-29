import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getGoogleCreds } from '@/lib/google-auth';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const maxDuration = 45;
export const runtime = 'nodejs';

async function getAuthUser(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  
  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error } = await supabaseUser.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function formatPhoneNumber(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, '');
  const phoneNumber = parsePhoneNumberFromString(clean, 'IN');
  if (phoneNumber) {
    return phoneNumber.format('E.164');
  }
  if (clean.length === 10) {
    return `+91${clean}`;
  }
  if (clean.length > 10 && !phone.startsWith('+')) {
    return `+${clean}`;
  }
  return phone;
}

export async function POST(req: NextRequest) {
  try {
    let workspaceId: string | null = null;
    
    // Check if called with frontend User authentication
    const user = await getAuthUser(req);
    if (user) {
      workspaceId = user.id;
    }

    const { leadId, workspaceId: bodyWorkspaceId } = await req.json();
    
    if (!workspaceId && bodyWorkspaceId) {
      // Backend/Worker call context
      workspaceId = bodyWorkspaceId;
    }

    if (!workspaceId || !leadId) {
      return NextResponse.json({ error: 'Missing leadId or workspaceId context' }, { status: 400 });
    }

    // 1. Fetch Lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (leadErr || !lead) {
      console.error(`[Google Contacts Sync] Lead not found: ${leadId}`);
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 2. Fetch Google Integration Credentials
    const creds = await getGoogleCreds(supabaseAdmin, workspaceId);
    if (!creds) {
      console.log(`[Google Contacts Sync] Google integration not active for workspace ${workspaceId}. Skipping.`);
      return NextResponse.json({ success: true, message: 'Google account not connected.' });
    }

    // 3. Load configuration settings from unified config
    const { data: integration } = await supabaseAdmin
      .from('integration_credentials')
      .select('config')
      .eq('user_id', workspaceId)
      .eq('provider', 'google')
      .maybeSingle();

    const config = (integration?.config as Record<string, any>) || {};
    
    // Google Contacts active check (default is true if Google OAuth is connected)
    const contactsEnabled = config.contacts_enabled !== false;
    if (!contactsEnabled) {
      console.log(`[Google Contacts Sync] Google Contacts sync disabled in settings. Skipping.`);
      return NextResponse.json({ success: true, message: 'Google Contacts sync disabled in configuration.' });
    }

    const labelId = config.contacts_label_id || null;
    const prefix = config.contacts_prefix || '';
    const suffix = config.contacts_suffix || '';

    // 4. Format Phone Number
    if (!lead.phone) {
      console.log(`[Google Contacts Sync] Lead has no phone number. Skipping.`);
      return NextResponse.json({ success: true, message: 'Skipped: No phone number.' });
    }
    const formattedPhone = formatPhoneNumber(lead.phone);

    // 5. Duplicate Detection Matrix: Check if phone already exists in user's contacts
    const searchUrl = `https://people.googleapis.com/v1/people:searchContacts?query=${encodeURIComponent(formattedPhone)}&readMask=names,phoneNumbers`;
    const searchRes = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const results = searchData.results || [];
      const duplicateFound = results.some((r: any) => {
        const contact = r.person || {};
        const numbers = contact.phoneNumbers || [];
        return numbers.some((n: any) => {
          const cleanExist = (n.value || '').replace(/[^0-9]/g, '');
          const cleanNew = formattedPhone.replace(/[^0-9]/g, '');
          return cleanExist === cleanNew || cleanExist.endsWith(cleanNew) || cleanNew.endsWith(cleanExist);
        });
      });

      if (duplicateFound) {
        console.log(`[Google Contacts Sync] Contact with phone ${formattedPhone} already exists. Skipping.`);
        await supabaseAdmin.from('live_logs').insert({
          workspace_id: workspaceId,
          lead_id: leadId,
          event_type: 'sync_google_contacts_duplicate',
          message: `Google Contacts: Skip sync for lead "${lead.name}". Phone number ${formattedPhone} is already in your contacts.`,
        });
        return NextResponse.json({ success: true, message: 'Duplicate found. Ignored.' });
      }
    }

    // 6. Name Template Interpolation
    const finalName = `${prefix}${lead.name || 'Sheet Lead'}${suffix}`;

    // 7. Call People API to create contact
    const contactPayload = {
      names: [{ givenName: finalName }],
      phoneNumbers: [{ value: formattedPhone, type: 'mobile' }],
      emailAddresses: lead.email ? [{ value: lead.email, type: 'home' }] : [],
      biographies: [
        {
          value: `Lead Source: ${lead.source || 'N/A'}\nStatus: ${lead.status || 'N/A'}\nCreated via Brahmastra Leads Ingestion Hub on ${new Date().toLocaleDateString()}`,
          contentType: 'TEXT_PLAIN',
        },
      ],
    };

    const createRes = await fetch('https://people.googleapis.com/v1/people:createContact', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Google createContact API failed: ${errText}`);
    }

    const contactData = await createRes.json();
    const contactResourceName = contactData.resourceName; // e.g. people/c1234567

    // 8. Associate with Label/Group if specified
    if (labelId) {
      console.log(`[Google Contacts Sync] Associating contact ${contactResourceName} with group ${labelId}...`);
      const modifyGroupUrl = `https://people.googleapis.com/v1/${labelId}/members:modify`;
      
      const groupRes = await fetch(modifyGroupUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceNamesToAdd: [contactResourceName],
        }),
      });

      if (!groupRes.ok) {
        const groupErrText = await groupRes.text();
        console.warn(`[Google Contacts Sync] Failed to associate contact with group ${labelId}:`, groupErrText);
      }
    }

    // 9. Write live logs on success
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      event_type: 'sync_google_contacts_success',
      message: `Successfully synced lead "${finalName}" to Google Contacts.`,
      metadata: { googleContactId: contactResourceName },
    });

    return NextResponse.json({ success: true, contactId: contactResourceName });
  } catch (err: any) {
    console.error('[POST /api/workflows/google-contacts/sync-lead] Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
