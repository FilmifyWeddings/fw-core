import { supabaseAdmin } from '@/lib/supabase';

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  previewMessage?: string;
}

export interface SmsTemplateData {
  headline: string;
  bodyText: string;
}

const DEFAULT_SMS_TEMPLATE: SmsTemplateData = {
  headline: 'StudioCore Verification',
  bodyText: 'Your StudioCore verification code is {OTP}. Valid for 10 minutes. Please do not share this code.',
};

/**
 * Fetch editable SMS template from Supabase or fallback to default
 */
export async function getSmsTemplate(templateKey = 'google_onboarding_otp'): Promise<SmsTemplateData> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sms_templates')
      .select('headline, body_text')
      .eq('template_key', templateKey)
      .maybeSingle();

    if (!error && data && data.body_text) {
      return {
        headline: data.headline || DEFAULT_SMS_TEMPLATE.headline,
        bodyText: data.body_text,
      };
    }
  } catch (err) {
    console.warn('[getSmsTemplate notice]:', err);
  }

  return DEFAULT_SMS_TEMPLATE;
}

/**
 * Save or update editable SMS template in Supabase
 */
export async function updateSmsTemplate(
  templateKey: string,
  headline: string,
  bodyText: string
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('sms_templates')
      .upsert({
        template_key: templateKey,
        headline: headline.trim(),
        body_text: bodyText.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'template_key' });

    return !error;
  } catch (err) {
    console.error('[updateSmsTemplate error]:', err);
    return false;
  }
}

/**
 * Send Normal SMS OTP to user phone number
 * Supports Fast2SMS (India), MSG91, Twilio, or Custom SMS Gateway HTTP API.
 */
export async function sendSmsOtp({
  phone,
  otp,
  templateKey = 'google_onboarding_otp',
}: {
  phone: string;
  otp: string;
  templateKey?: string;
}): Promise<SmsSendResult> {
  const cleanPhone = phone.replace(/\D/g, '');
  const template = await getSmsTemplate(templateKey);
  const formattedMessage = template.bodyText.replace(/\{OTP\}/g, otp);
  const fullText = `${template.headline ? `[${template.headline}] ` : ''}${formattedMessage}`;

  console.log(`\n======================================================`);
  console.log(`📱 [NORMAL SMS GATEWAY DISPATCH] -> To: +${cleanPhone}`);
  console.log(`📝 Headline: ${template.headline}`);
  console.log(`💬 Message: ${fullText}`);
  console.log(`🔑 OTP Code: ${otp}`);
  console.log(`======================================================\n`);

  // 1. Fast2SMS Provider (Very popular & affordable in India)
  const fast2SmsApiKey = process.env.FAST2SMS_API_KEY;
  if (fast2SmsApiKey) {
    try {
      const national10Digit = cleanPhone.slice(-10);
      const otpId = process.env.FAST2SMS_OTP_ID || process.env.FAST2SMS_TEMPLATE_ID;

      // A. Fast2SMS New Smart OTP API (v1.0 Endpoint from docs.fast2sms.com/reference/send-otp)
      if (otpId) {
        const res = await fetch('https://www.fast2sms.com/dev/otp/send', {
          method: 'POST',
          headers: {
            'Authorization': fast2SmsApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            mobile: national10Digit,
            otp_id: otpId,
            otp: otp,
          }),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok && (json.return === true || json.status_code === 200 || json.request_id)) {
          return { success: true, messageId: json.request_id || 'otp_sent', previewMessage: fullText };
        }

        const errorMessage = Array.isArray(json.message)
          ? json.message.join(', ')
          : (json.message || `Fast2SMS OTP API failed (HTTP ${res.status})`);

        console.error('[Fast2SMS Smart OTP API Rejected]:', errorMessage, json);
        return { success: false, error: errorMessage };
      }

      // B. Fast2SMS Quick SMS Route (Requires NO DLT, NO Entity ID, NO Website Verification!)
      const useOtpRoute = process.env.FAST2SMS_ROUTE === 'otp';
      const payload: any = useOtpRoute
        ? {
            route: 'otp',
            variables_values: otp,
            numbers: national10Digit,
          }
        : {
            route: 'q',
            message: fullText,
            numbers: national10Digit,
          };

      let res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2SmsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      let json = await res.json().catch(() => ({}));

      // If route:otp failed due to DLT/website verification requirement, auto-fallback to route:q
      if (!json.return && (json.status_code === 996 || json.status_code === 999)) {
        console.warn('[Fast2SMS Notice]: Falling back to Quick SMS route (q)...');
        res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            'authorization': fast2SmsApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'q',
            message: fullText,
            numbers: national10Digit,
          }),
        });
        json = await res.json().catch(() => ({}));
      }

      if (res.ok && json.return === true) {
        return { success: true, messageId: json.request_id || json.message?.[0], previewMessage: fullText };
      }

      const errorMessage = Array.isArray(json.message)
        ? json.message.join(', ')
        : (json.message || `Fast2SMS dispatch failed (HTTP ${res.status})`);

      console.error('[Fast2SMS API Rejected]:', errorMessage, json);
      return { success: false, error: errorMessage };
    } catch (err: any) {
      console.error('[Fast2SMS Network Error]:', err.message);
      return { success: false, error: err.message || 'Fast2SMS network connection failed' };
    }
  }

  // 2. Generic HTTP SMS Webhook Gateway
  const genericSmsUrl = process.env.SMS_GATEWAY_URL;
  if (genericSmsUrl) {
    try {
      const res = await fetch(genericSmsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.SMS_GATEWAY_API_KEY ? { 'Authorization': `Bearer ${process.env.SMS_GATEWAY_API_KEY}` } : {}),
        },
        body: JSON.stringify({
          to: cleanPhone,
          message: fullText,
          otp,
          headline: template.headline,
        }),
      });
      if (res.ok) {
        return { success: true, previewMessage: fullText };
      }
      return { success: false, error: `Generic SMS Gateway returned HTTP ${res.status}` };
    } catch (err: any) {
      console.error('[Generic SMS Gateway Error]:', err.message);
      return { success: false, error: err.message || 'Generic SMS Gateway connection failed' };
    }
  }

  // 3. Fallback: Development preview mode
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Fast2SMS DEV SIMULATION] OTP for +91 ${cleanPhone.slice(-10)}: ${otp}`);
    return {
      success: true,
      messageId: `sim_${Date.now()}`,
      previewMessage: fullText,
    };
  }

  return {
    success: false,
    error: 'SMS service is not configured. Please add FAST2SMS_API_KEY in server environment settings.',
  };
}
