// Supabase Edge Function: process-drip-queue
// Triggered by pg_cron every minute

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Edge function environment setup
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// WhatsBoost configuration fallbacks
const WHASTBOOST_API_URL = Deno.env.get('WHASTBOOST_API_URL') || 'https://whatsboost.in/api/v1';
const WHASTBOOST_APP_KEY = Deno.env.get('WHASTBOOST_APP_KEY') || '';
const WHASTBOOST_AUTH_KEY = Deno.env.get('WHASTBOOST_AUTH_KEY') || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req) => {
  try {
    // 1. Fetch pending messages that are scheduled for <= now()
    const nowISO = new Date().toISOString();
    const { data: messages, error: fetchErr } = await supabaseAdmin
      .from('queue_messages')
      .select(`
        *,
        leads (
          phone,
          name
        ),
        profiles (
          whastboost_api_url,
          whastboost_token,
          whastboost_status
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', nowISO)
      .order('scheduled_for', { ascending: true })
      .limit(10); // Batch size: limit execution time in serverless environment

    if (fetchErr) throw fetchErr;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending drip messages found to execute.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`Processing ${messages.length} pending WhatsApp drip messages...`);

    // Cache the device ID lookup to avoid multiple requests
    let cachedDeviceId: string | null = null;

    const fetchDeviceId = async (apiUrl: string, authKey: string, appKey: string): Promise<string | null> => {
      if (cachedDeviceId) return cachedDeviceId;
      try {
        const devicesUrl = `${apiUrl}/devices?authkey=${authKey}&apiKey=${authKey}&appkey=${appKey}`;
        const res = await fetch(devicesUrl, {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-key': authKey,
            'appkey': appKey
          }
        });
        if (res.ok) {
          const data = await res.json();
          const device = data.results?.[0];
          if (device) {
            cachedDeviceId = device._id || device.id;
            return cachedDeviceId;
          }
        }
      } catch (err) {
        console.error('Error fetching device ID:', err);
      }
      return null;
    };

    for (const msg of messages) {
      const workspaceId = msg.workspace_id;
      const phone = msg.leads?.phone;
      const leadName = msg.leads?.name || 'Client';

      // Determine keys: prioritize Edge Env then DB profile
      const authKey = WHASTBOOST_AUTH_KEY || msg.profiles?.whastboost_token || '';
      const appKey = WHASTBOOST_APP_KEY || '';
      const apiUrl = WHASTBOOST_API_URL;

      const isLive = !!(authKey && appKey);

      // Lock message state to processing so no other cron thread runs it concurrently
      await supabaseAdmin
        .from('queue_messages')
        .update({ status: 'processing' })
        .eq('id', msg.id);

      if (!isLive && msg.profiles?.whastboost_token !== 'mock-token') {
        console.warn(`WhatsBoost keys not configured. Postponing message.`);
        await supabaseAdmin
          .from('queue_messages')
          .update({
            status: 'pending',
            retry_count: msg.retry_count + 1,
            last_error: 'WhatsBoost credentials missing. Set keys in environment.',
          })
          .eq('id', msg.id);
        continue;
      }

      try {
        let apiSuccess = false;
        let responseError = '';

        if (!isLive && msg.profiles?.whastboost_token === 'mock-token') {
          // Mock Simulation mode
          await new Promise((resolve) => setTimeout(resolve, 500));
          apiSuccess = Math.random() > 0.05;
          if (!apiSuccess) responseError = 'Simulated network timeout/gateway device failure';
        } else {
          // Real live dispatch to whatsboost.in
          const deviceId = await fetchDeviceId(apiUrl, authKey, appKey);

          if (!deviceId) {
            throw new Error('No active WhatsApp device found to send message.');
          }

          // Clean phone: strip + and spaces
          const cleanPhone = phone.replace(/[^\d]/g, '');

          const sendUrl = `${apiUrl}/messages/send?authkey=${authKey}&apiKey=${authKey}&appkey=${appKey}`;
          const response = await fetch(sendUrl, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'x-api-key': authKey,
              'appkey': appKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              device_id: deviceId,
              to: cleanPhone,
              type: 'text',
              body: msg.message_body,
            }),
          });

          if (response.ok) {
            apiSuccess = true;
          } else {
            const errData = await response.json().catch(() => ({}));
            responseError = errData.message || response.statusText || 'API dispatch failed';
          }
        }

        if (apiSuccess) {
          // Success: Mark message as sent
          await supabaseAdmin
            .from('queue_messages')
            .update({
              status: 'sent',
              last_error: null,
            })
            .eq('id', msg.id);

          // Write success log to Dashboard
          await supabaseAdmin.from('live_logs').insert({
            workspace_id: workspaceId,
            lead_id: msg.lead_id,
            event_type: 'whatsapp_sent',
            message: `WhatsApp Drip sent to "${leadName}" (${phone}) successfully.`,
            metadata: { body: msg.message_body },
          });

          console.log(`Successfully sent message ${msg.id} to ${phone}`);
        } else {
          throw new Error(responseError || 'API dispatch failed');
        }
      } catch (err: any) {
        const errMsg = err.message || String(err);
        console.error(`Dispatch failure for message ${msg.id}:`, errMsg);

        const nextRetry = msg.retry_count + 1;
        const finalStatus = nextRetry >= 3 ? 'failed' : 'pending';

        await supabaseAdmin
          .from('queue_messages')
          .update({
            status: finalStatus,
            retry_count: nextRetry,
            last_error: errMsg,
          })
          .eq('id', msg.id);

        // Write error log to Dashboard
        await supabaseAdmin.from('live_logs').insert({
          workspace_id: workspaceId,
          lead_id: msg.lead_id,
          event_type: 'whatsapp_failed',
          message: `WhatsApp Drip failed to send to "${leadName}" (Attempt ${nextRetry}/3). Error: ${errMsg}.`,
          metadata: { error: errMsg, willRetry: finalStatus === 'pending' },
        });
      }

      // Smart Queue Management: Delay between drip dispatches to mimic human behavior (30-90s)
      if (messages.indexOf(msg) < messages.length - 1) {
        const randomSeconds = Math.floor(Math.random() * (90 - 30 + 1) + 30);
        console.log(`Waiting for ${randomSeconds} seconds to mimic human behavior before next message...`);
        await new Promise((resolve) => setTimeout(resolve, randomSeconds * 1000));
      }
    }

    return new Response(JSON.stringify({ success: true, processedCount: messages.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    console.error('Edge Function process-drip-queue crash:', err);
    return new Response(JSON.stringify({ error: err.message || String(err) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
