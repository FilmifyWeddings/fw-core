/**
 * Evolution API Client & WhatsApp Microservice Gateway
 * Provides high-speed, isolated multi-tenant instance management,
 * QR generation, webhook auto-configuration, and zero-storage media dispatch.
 */

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  webhookUrl: string;
}

export function getEvolutionConfig(): EvolutionConfig {
  const baseUrl = (
    process.env.EVOLUTION_API_URL ||
    process.env.EVOLUTION_BASE_URL ||
    'https://evolution.studiocore.in'
  ).replace(/\/+$/, '');

  const apiKey = (
    process.env.EVOLUTION_API_KEY ||
    process.env.EVOLUTION_GLOBAL_API_KEY ||
    'evolution_global_api_key_2026'
  );

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    'https://studiocore.in'
  ).replace(/\/+$/, '');

  const webhookUrl = `${appUrl}/api/webhooks/evolution-beta`;

  return { baseUrl, apiKey, webhookUrl };
}

export function getInstanceNameForWorkspace(workspaceId: string): string {
  // Sanitize UUID into safe alphanumeric slug
  const cleanId = workspaceId.replace(/[^a-zA-Z0-9]/g, '');
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
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
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
