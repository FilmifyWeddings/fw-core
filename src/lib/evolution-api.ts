/**
 * Evolution API Client & WhatsApp Microservice Gateway
 * Provides high-speed, isolated multi-tenant instance management,
 * QR generation, webhook auto-configuration, and zero-storage media dispatch.
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  webhookUrl: string;
}

export function getEvolutionConfig(): EvolutionConfig {
  const baseUrl = (
    process.env.EVOLUTION_API_URL ||
    process.env.EVOLUTION_BASE_URL ||
    'http://127.0.0.1:8085'
  ).replace(/\/+$/, '');

  const apiKey = (
    process.env.EVOLUTION_API_KEY ||
    process.env.EVOLUTION_GLOBAL_API_KEY ||
    'studiocore_evo_secret_2026'
  );

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://studiocore.in'
  ).replace(/\/+$/, '');

  const webhookUrl = `${appUrl}/api/webhooks/evolution-beta`;

  return { baseUrl, apiKey, webhookUrl };
}

export async function resolveEvolutionConfig(workspaceId?: string): Promise<EvolutionConfig> {
  let baseUrl = (
    process.env.EVOLUTION_API_URL ||
    process.env.EVOLUTION_BASE_URL ||
    'http://127.0.0.1:8085'
  ).replace(/\/+$/, '');

  let apiKey = (
    process.env.EVOLUTION_API_KEY ||
    process.env.EVOLUTION_GLOBAL_API_KEY ||
    'studiocore_evo_secret_2026'
  );

  if (workspaceId) {
    try {
      // 1. Check evolution_instances table
      const { data: inst } = await supabaseAdmin
        .from('evolution_instances')
        .select('api_key, raw_payload')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

      if (inst?.api_key) apiKey = inst.api_key;
      if (inst?.raw_payload?.server_url) baseUrl = inst.raw_payload.server_url.replace(/\/+$/, '');

      // 2. Check integration_credentials
      if (!inst?.raw_payload?.server_url) {
        const { data: cred } = await supabaseAdmin
          .from('integration_credentials')
          .select('access_token, config')
          .eq('user_id', workspaceId)
          .eq('provider', 'evolution_whatsapp')
          .maybeSingle();

        if (cred?.access_token) apiKey = cred.access_token;
        if (cred?.config?.server_url) baseUrl = cred.config.server_url.replace(/\/+$/, '');
      }
    } catch (_) {}
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://studiocore.in'
  ).replace(/\/+$/, '');

  const webhookUrl = `${appUrl}/api/webhooks/evolution-beta`;

  return { baseUrl, apiKey, webhookUrl };
}

export function getInstanceNameForWorkspace(workspaceId: string): string {
  // Format as ws_<workspace_id_with_underscores>
  const cleanId = workspaceId.replace(/-/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  return `ws_${cleanId}`;
}

export function formatJid(phoneOrJid: string): string {
  if (phoneOrJid.includes('@')) return phoneOrJid;
  const digits = phoneOrJid.replace(/[^0-9]/g, '');
  return `${digits}@s.whatsapp.net`;
}

export function extractPhoneFromJid(jid: string): string {
  return jid.split('@')[0] || jid;
}

/**
 * 1. Create or Provision Evolution Instance
 */
export async function createEvolutionInstance(instanceName: string) {
  const { baseUrl, apiKey, webhookUrl } = getEvolutionConfig();

  const payload = {
    instanceName: instanceName,
    token: apiKey,
    qrcode: true,
    integration: 'WHATSAPP_BAILEYS',
    webhook: {
      url: webhookUrl,
      byEvents: false,
      base64: false, // Keep false for 0-blob lightweight payload
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CHATS_UPSERT',
        'CHATS_SET',
        'CONTACTS_SET',
        'CONTACTS_UPSERT',
        'CONNECTION_UPDATE',
      ],
    },
  };

  try {
    const res = await fetch(`${baseUrl}/instance/create`, {
      method: 'POST',
      signal: AbortSignal.timeout(1500),
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}

/**
 * 2. Fetch Live QR Code for Instance
 */
export async function getEvolutionQrCode(instanceName: string) {
  const { baseUrl, apiKey } = getEvolutionConfig();

  try {
    const res = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
      headers: {
        'apikey': apiKey,
      },
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}

/**
 * 3. Check Instance Connection State
 */
export async function getEvolutionConnectionState(instanceName: string) {
  const { baseUrl, apiKey } = getEvolutionConfig();

  try {
    const res = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
      headers: {
        'apikey': apiKey,
      },
    });

    const data = await res.json().catch(() => ({}));
    const state = data?.instance?.state || data?.state || 'close';
    return {
      ok: res.ok,
      status: res.status,
      state: state === 'open' ? 'CONNECTED' : state === 'connecting' ? 'CONNECTING' : 'DISCONNECTED',
      raw: data,
    };
  } catch (err: any) {
    return { ok: false, status: 500, state: 'DISCONNECTED', error: err.message };
  }
}

/**
 * 4. Set/Update Webhook Subscription
 */
export async function setEvolutionWebhook(instanceName: string, customWebhookUrl?: string) {
  const { baseUrl, apiKey, webhookUrl } = getEvolutionConfig();
  const targetUrl = customWebhookUrl || webhookUrl;

  const payload = {
    enabled: true,
    url: targetUrl,
    byEvents: false,
    base64: false,
    events: [
      'MESSAGES_UPSERT',
      'MESSAGES_UPDATE',
      'CHATS_UPSERT',
      'CHATS_SET',
      'CONTACTS_SET',
      'CONTACTS_UPSERT',
      'CONNECTION_UPDATE',
    ],
  };

  try {
    const res = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      signal: AbortSignal.timeout(1500),
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}

/**
 * 5. Logout & Disconnect Session
 */
export async function logoutEvolutionInstance(instanceName: string) {
  const { baseUrl, apiKey } = getEvolutionConfig();

  try {
    const res = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(1500),
      headers: {
        'apikey': apiKey,
      },
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}

/**
 * 6. Send Outgoing Text Message
 */
export async function sendEvolutionTextMessage(
  instanceName: string,
  recipient: string,
  text: string
) {
  const { baseUrl, apiKey } = getEvolutionConfig();
  const digits = recipient.replace(/[^0-9]/g, '');

  const payload = {
    number: digits,
    text: text,
    delay: 1200,
    linkPreview: true,
  };

  try {
    const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      signal: AbortSignal.timeout(1500),
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}

/**
 * 7. Send Outgoing Media Message (Photo, Audio, Video, Document)
 */
export async function sendEvolutionMediaMessage(
  instanceName: string,
  recipient: string,
  media: {
    mediaUrl: string;
    mediaType: 'image' | 'audio' | 'video' | 'document';
    caption?: string;
    fileName?: string;
    mimetype?: string;
  }
) {
  const { baseUrl, apiKey } = getEvolutionConfig();
  const digits = recipient.replace(/[^0-9]/g, '');

  const payload = {
    number: digits,
    mediatype: media.mediaType,
    mimetype: media.mimetype || 'image/jpeg',
    caption: media.caption || '',
    media: media.mediaUrl,
    fileName: media.fileName || 'attachment',
  };

  try {
    const res = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      signal: AbortSignal.timeout(3000),
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    return { ok: false, status: 500, error: err.message };
  }
}
