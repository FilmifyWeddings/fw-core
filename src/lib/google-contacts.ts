import { Lead } from '@/types';
import { supabaseAdmin } from './supabase';
import { getGoogleCreds } from './google-auth';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
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

export interface GoogleContactSyncResult {
  success: boolean;
  contactId?: string;
  duplicate?: boolean;
  message: string;
}

/**
 * Automatically or manually syncs a single lead to the user's isolated Google Contacts account.
 * Multi-tenant safe: Workspace A credentials only touch Workspace A contacts.
 */
export async function syncLeadToGoogleContacts(
  workspaceId: string,
  lead: Lead | any
): Promise<GoogleContactSyncResult> {
  if (!workspaceId || !lead) {
    return { success: false, message: 'Missing workspace or lead context' };
  }

  try {
    // 1. Fetch Google Integration Credentials for Google Contacts for this specific workspace
    const creds = await getGoogleCreds(supabaseAdmin, workspaceId, 'google_contacts');
    if (!creds || !creds.access_token) {
      console.log(`[Google Contacts Auto-Sync] Workspace ${workspaceId} has not connected Google Contacts. Skipping.`);
      return { success: false, message: 'Google Contacts account not connected.' };
    }

    // 2. Load configuration settings for Google Contacts
    const { data: integration } = await supabaseAdmin
      .from('integration_credentials')
      .select('config')
      .eq('user_id', workspaceId)
      .in('provider', ['google_contacts', 'google'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const config = (integration?.config as Record<string, any>) || {};
    
    // Check if contacts sync is enabled (default is true if connected)
    if (config.contacts_enabled === false) {
      console.log(`[Google Contacts Auto-Sync] Sync disabled in settings for workspace ${workspaceId}.`);
      return { success: false, message: 'Google Contacts sync disabled in settings.' };
    }

    const labelId = config.contacts_label_id || null;
    const prefix = config.contacts_prefix || '';
    const suffix = config.contacts_suffix || '';

    // 3. Format Phone Number
    if (!lead.phone) {
      return { success: false, message: 'Skipped: Lead has no phone number.' };
    }
    const formattedPhone = formatPhoneNumber(lead.phone);

    // 4. Duplicate Check in User's Google Contacts
    let isDuplicate = false;
    try {
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
        isDuplicate = results.some((r: any) => {
          const contact = r.person || {};
          const numbers = contact.phoneNumbers || [];
          return numbers.some((n: any) => {
            const cleanExist = (n.value || '').replace(/[^0-9]/g, '');
            const cleanNew = formattedPhone.replace(/[^0-9]/g, '');
            return cleanExist === cleanNew || cleanExist.endsWith(cleanNew) || cleanNew.endsWith(cleanExist);
          });
        });
      }
    } catch (searchErr) {
      console.warn('[Google Contacts Auto-Sync] Duplicate search non-fatal error:', searchErr);
    }

    if (isDuplicate) {
      console.log(`[Google Contacts Auto-Sync] Lead "${lead.name}" phone ${formattedPhone} already in Google Contacts.`);
      
      // Mark lead as synced in database
      const existingRaw = (lead.raw_payload && typeof lead.raw_payload === 'object') ? lead.raw_payload : {};
      await supabaseAdmin
        .from('leads')
        .update({
          raw_payload: {
            ...existingRaw,
            google_synced: true,
            google_synced_at: new Date().toISOString(),
          }
        })
        .eq('id', lead.id);

      await supabaseAdmin.from('live_logs').insert({
        workspace_id: workspaceId,
        lead_id: lead.id,
        event_type: 'sync_google_contacts_duplicate',
        message: `Google Contacts: Skipped duplicate for "${lead.name || lead.phone}". Phone ${formattedPhone} is already present in Google Contacts.`,
        metadata: { phone: formattedPhone, name: lead.name },
      });

      return { success: true, duplicate: true, message: 'Already exists in Google Contacts' };
    }

    // 5. Construct Contact Payload
    const finalName = `${prefix}${lead.name || 'Lead ' + formattedPhone}${suffix}`;
    const rawData = (lead.raw_payload && typeof lead.raw_payload === 'object') ? lead.raw_payload : {};
    
    const contactPayload = {
      names: [{ givenName: finalName }],
      phoneNumbers: [{ value: formattedPhone, type: 'mobile' }],
      emailAddresses: lead.email ? [{ value: lead.email, type: 'home' }] : [],
      biographies: [
        {
          value: `Lead Source: ${lead.source || 'StudioCore'}\nEvent Date: ${rawData.event_date || 'N/A'}\nVenue/City: ${rawData.venue || rawData.location || rawData.city || 'N/A'}\nBudget: ${rawData.budget || 'N/A'}\nSynced via StudioCore Leads CRM on ${new Date().toLocaleString('en-IN')}`,
          contentType: 'TEXT_PLAIN',
        },
      ],
      userDefined: [
        { key: 'LeadSource', value: String(lead.source || 'StudioCore') },
        { key: 'StudioCoreLeadId', value: String(lead.id) },
      ],
    };

    // 6. Create Contact via People API
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
      throw new Error(`Google People createContact failed: ${errText}`);
    }

    const contactData = await createRes.json();
    const contactResourceName = contactData.resourceName; // e.g. people/c123456789

    // 7. Associate Contact with Label/Group if selected
    if (labelId) {
      try {
        await fetch(`https://people.googleapis.com/v1/${labelId}/members:modify`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${creds.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resourceNamesToAdd: [contactResourceName],
          }),
        });
      } catch (groupErr) {
        console.warn(`[Google Contacts Auto-Sync] Failed adding contact to group ${labelId}:`, groupErr);
      }
    }

    // 8. Update Lead in Database with google_synced = true
    const updatedRaw = {
      ...rawData,
      google_synced: true,
      google_contact_id: contactResourceName,
      google_synced_at: new Date().toISOString(),
    };

    await supabaseAdmin
      .from('leads')
      .update({
        raw_payload: updatedRaw,
      })
      .eq('id', lead.id);

    // 9. Write Detailed Live Activity Log
    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      event_type: 'sync_google_contacts_success',
      message: `Successfully synced lead "${finalName}" (${formattedPhone}) to Google Contacts.`,
      metadata: {
        googleContactId: contactResourceName,
        name: finalName,
        phone: formattedPhone,
        group: labelId || 'Default',
        synced_at: new Date().toISOString(),
      },
    });

    console.log(`[Google Contacts Auto-Sync] Successfully synced lead "${finalName}" for workspace ${workspaceId}.`);
    return { success: true, contactId: contactResourceName, message: 'Synced successfully' };
  } catch (err: any) {
    console.error(`[Google Contacts Auto-Sync] Error syncing lead ${lead?.id}:`, err);

    await supabaseAdmin.from('live_logs').insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      event_type: 'sync_google_contacts_failed',
      message: `Google Contacts sync failed for "${lead?.name || 'Lead'}": ${err.message || err}`,
      metadata: { error: String(err) },
    });

    return { success: false, message: err.message || 'Sync failed' };
  }
}
