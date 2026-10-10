import nodemailer from 'nodemailer';

interface SendPasswordResetEmailParams {
  toEmail: string;
  recipientName?: string;
  resetUrl: string;
  otp?: string;
  expiresInMinutes?: number;
}

interface SendWelcomeEmailParams {
  toEmail: string;
  name: string;
  businessName?: string;
  workspaceUrl?: string;
}

interface SendEmailOtpParams {
  toEmail: string;
  recipientName?: string;
  otp: string;
  expiresInMinutes?: number;
}

/**
 * Creates a configured Nodemailer transporter with tight timeouts for high responsiveness
 */
function createTransporter(port: number, secure: boolean) {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'support@studiocore.in';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || 'Sushant@102310#';

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 10000,
  });
}

function parseCleanFrom(rawFrom?: string): { name: string; address: string } {
  const fallback = { name: 'StudioCore', address: 'support@studiocore.in' };
  if (!rawFrom) return fallback;
  const cleaned = rawFrom.replace(/\\/g, '').replace(/["']/g, '').trim();
  const match = cleaned.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].trim() || 'StudioCore';
    const address = match[2].trim() || 'support@studiocore.in';
    return { name, address };
  }
  if (cleaned.includes('@')) {
    return { name: 'StudioCore', address: cleaned };
  }
  return fallback;
}

/**
 * Dispatches email using a resilient multi-provider cascade:
 * 1. Resend REST API (HTTPS Port 443 - zero blockages)
 * 2. Brevo REST API (HTTPS Port 443)
 * 3. Gmail / Google Workspace SMTP (Port 465 SSL)
 * 4. Hostinger SMTP (Port 465 SSL -> Port 587 STARTTLS)
 */
async function sendMailWithFallback(mailOptions: {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const cleanFromObj = parseCleanFrom(mailOptions.from);
  const cleanFromHeader = `${cleanFromObj.name} <${cleanFromObj.address}>`;

  // ── Provider 1: Resend HTTP API (Port 443) ──
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      const fromAddr = cleanFromHeader;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [mailOptions.to],
          subject: mailOptions.subject,
          text: mailOptions.text,
          html: mailOptions.html,
        }),
      });

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.id) {
        console.log(`[Resend API Success] Email ID: ${resData.id} delivered to ${mailOptions.to}`);
        return { success: true, messageId: resData.id, provider: 'resend' };
      } else {
        console.warn('[Resend API Notice]:', resData);
      }
    } catch (resendErr: any) {
      console.warn('[Resend API Dispatch Error]:', resendErr?.message);
    }
  }

  // ── Provider 2: Brevo HTTP API (Port 443) ──
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey) {
    try {
      const fromEmail = process.env.BREVO_FROM_EMAIL || 'support@studiocore.in';
      const fromName = process.env.BREVO_FROM_NAME || 'StudioCore';
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey.trim(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: fromName, email: fromEmail },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          textContent: mailOptions.text,
          htmlContent: mailOptions.html,
        }),
      });

      const brevoData = await res.json().catch(() => ({}));
      if (res.ok && brevoData.messageId) {
        console.log(`[Brevo API Success] MessageID: ${brevoData.messageId}`);
        return { success: true, messageId: brevoData.messageId, provider: 'brevo' };
      }
    } catch (brevoErr: any) {
      console.warn('[Brevo API Dispatch Error]:', brevoErr?.message);
    }
  }

  // ── Provider 3: Gmail / Google Workspace SMTP (Port 465 SSL) ──
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GOOGLE_SMTP_PASS;
  const gmailUser = process.env.GMAIL_USER || process.env.GOOGLE_SMTP_USER;
  if (gmailPass && gmailUser) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPass },
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
      });

      const info = await transporter.sendMail({
        from: cleanFromObj,
        to: mailOptions.to,
        subject: mailOptions.subject,
        text: mailOptions.text,
        html: mailOptions.html,
      });
      console.log(`[Gmail SMTP Success] MessageID: ${info.messageId}`);
      return { success: true, messageId: info.messageId, provider: 'gmail' };
    } catch (gmailErr: any) {
      console.warn('[Gmail SMTP Dispatch Notice]:', gmailErr?.message);
    }
  }

  // ── Provider 4: Hostinger SMTP (Port 465 SSL -> Port 587 STARTTLS) ──
  const defaultPort = parseInt(process.env.SMTP_PORT || '465', 10);
  try {
    const isSecure = defaultPort === 465;
    const transporter = createTransporter(defaultPort, isSecure);
    const info = await transporter.sendMail({
      ...mailOptions,
      from: cleanFromObj,
    });
    console.log(`[Hostinger SMTP Port ${defaultPort} Success] MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, provider: 'hostinger' };
  } catch (err1: any) {
    console.warn(`[Hostinger SMTP Port ${defaultPort} Notice]: ${err1.message}. Attempting fallback port 587...`);
  }

  try {
    const fallbackPort = defaultPort === 465 ? 587 : 465;
    const transporterFallback = createTransporter(fallbackPort, fallbackPort === 465);
    const info = await transporterFallback.sendMail({
      ...mailOptions,
      from: cleanFromObj,
    });
    console.log(`[Hostinger SMTP Fallback Port ${fallbackPort} Success] MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId, provider: 'hostinger' };
  } catch (err2: any) {
    console.error(`[Hostinger SMTP Fallback Error]:`, err2.message);
  }

  return { success: false, error: 'All email providers failed or sender address rejected by mail server.' };
}

/**
 * Sends a 6-digit verification code (OTP) for account registration or verification
 */
export async function sendEmailOtp({
  toEmail,
  recipientName = 'Creator',
  otp,
  expiresInMinutes = 10,
}: SendEmailOtpParams) {
  const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studiocore.in';
  const logoUrl = `${defaultAppUrl.replace(/\/$/, '')}/images/auth/sc-orange-logo.png`;
  const rawFrom = process.env.RESEND_FROM || process.env.SMTP_FROM || 'StudioCore <support@studiocore.in>';
  const fromAddress = rawFrom.replace(/^["']|["']$/g, '').trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your StudioCore Verification Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F6EFEB;
      margin: 0;
      padding: 0;
      color: #18181b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 560px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(243, 111, 33, 0.08);
      border: 1px solid #EAE0D8;
    }
    .header {
      background: #18181b;
      padding: 36px 32px;
      text-align: center;
    }
    .content {
      padding: 40px 36px;
    }
    .badge {
      display: inline-block;
      background: #FFF2E8;
      color: #F36F21;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 50px;
      border: 1px solid #FFD9BD;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 26px;
      font-weight: 900;
      color: #18181b;
      margin: 0 0 14px 0;
      line-height: 1.25;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 14px;
      line-height: 1.65;
      color: #52525b;
      margin: 0 0 18px 0;
    }
    .otp-container {
      text-align: center;
      margin: 32px 0;
    }
    .otp-code {
      display: inline-block;
      font-size: 38px;
      font-weight: 900;
      letter-spacing: 10px;
      color: #F36F21;
      background: #FFF7F2;
      border: 2px dashed #F36F21;
      padding: 16px 32px;
      border-radius: 18px;
      box-shadow: 0 4px 16px rgba(243, 111, 33, 0.12);
      font-family: 'Courier New', Courier, monospace;
    }
    .notice-box {
      background: #FAF6F3;
      border: 1px solid #EAE0D8;
      border-radius: 14px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .notice-box p {
      margin: 0;
      color: #c2410c;
      font-size: 13px;
      font-weight: 600;
    }
    .footer {
      background: #FAF6F3;
      border-top: 1px solid #EAE0D8;
      padding: 24px 36px;
      text-align: center;
      font-size: 11px;
      color: #a1a1aa;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="padding-bottom: 8px;">
            <img src="${logoUrl}" alt="StudioCore Logo" width="56" height="32" style="display: block; border: 0;" />
          </td>
        </tr>
        <tr>
          <td align="center">
            <span style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">Studio<span style="color: #F36F21;">Core</span></span>
          </td>
        </tr>
        <tr>
          <td align="center">
            <span style="font-size: 11px; font-weight: 600; color: #a1a1aa; letter-spacing: 1px; text-transform: uppercase;">Focus on Art, We Manage</span>
          </td>
        </tr>
      </table>
    </div>
    <div class="content">
      <div class="badge">🛡️ Email Verification</div>
      <h1>Verify Your Email Address</h1>
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>Thank you for choosing StudioCore! Use the verification code below to complete your registration for <strong>${toEmail}</strong>:</p>
      
      <div class="otp-container">
        <div class="otp-code">${otp}</div>
      </div>

      <div class="notice-box">
        <p>⏱️ This code will expire in <strong>${expiresInMinutes} minutes</strong>. Please do not share this code with anyone.</p>
      </div>

      <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 24px;">
        If you did not request this verification code, you can safely disregard this email.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">StudioCore Security · Focus on Art, We Manage</p>
      <p style="margin: 0;">Support: support@studiocore.in</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Your StudioCore Verification Code: ${otp}

Hello ${recipientName},

Use this 6-digit code to complete your StudioCore account verification:
${otp}

This code expires in ${expiresInMinutes} minutes.

StudioCore Security
support@studiocore.in
  `.trim();

  return sendMailWithFallback({
    from: fromAddress,
    to: toEmail,
    subject: `${otp} is your StudioCore Verification Code`,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Sends a high-end luxury Welcome / Congratulations Email upon registration
 */
export async function sendWelcomeEmail({
  toEmail,
  name,
  businessName,
  workspaceUrl,
}: SendWelcomeEmailParams) {
  const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://studiocore.in';
  const targetUrl = workspaceUrl || `${defaultAppUrl.replace(/\/$/, '')}/workspace`;
  const logoUrl = `${defaultAppUrl.replace(/\/$/, '')}/images/auth/sc-orange-logo.png`;
  const fromAddress = process.env.SMTP_FROM || `"StudioCore Support" <support@studiocore.in>`;
  const studioTitle = businessName || `${name}'s Studio`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to StudioCore</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F6EFEB;
      margin: 0;
      padding: 0;
      color: #18181b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 580px;
      margin: 30px auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 12px 36px rgba(243, 111, 33, 0.08);
      border: 1px solid #EAE0D8;
    }
    .header {
      background: #18181b;
      padding: 36px 32px;
      text-align: center;
    }
    .content {
      padding: 40px 36px;
    }
    .badge {
      display: inline-block;
      background: #FFF2E8;
      color: #F36F21;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 50px;
      border: 1px solid #FFD9BD;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 26px;
      font-weight: 900;
      color: #18181b;
      margin: 0 0 16px 0;
      line-height: 1.25;
      letter-spacing: -0.5px;
    }
    p {
      font-size: 14px;
      line-height: 1.65;
      color: #52525b;
      margin: 0 0 18px 0;
    }
    .highlight-card {
      background: #FAF6F3;
      border: 1px solid #EAE0D8;
      border-radius: 18px;
      padding: 22px;
      margin: 28px 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .cta-btn-3d {
      display: inline-block;
      background: linear-gradient(135deg, #F36F21 0%, #FF8A3D 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 800;
      padding: 16px 40px;
      border-radius: 14px;
      letter-spacing: 0.5px;
      box-shadow: 0 8px 24px rgba(243, 111, 33, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.4);
      border-bottom: 3px solid #d45610;
      text-transform: uppercase;
    }
    .footer {
      background: #FAF6F3;
      border-top: 1px solid #EAE0D8;
      padding: 24px 36px;
      text-align: center;
      font-size: 11px;
      color: #a1a1aa;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="padding-bottom: 8px;">
            <img src="${logoUrl}" alt="StudioCore Logo" width="56" height="32" style="display: block; border: 0;" />
          </td>
        </tr>
        <tr>
          <td align="center">
            <span style="font-size: 24px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">Studio<span style="color: #F36F21;">Core</span></span>
          </td>
        </tr>
        <tr>
          <td align="center">
            <span style="font-size: 11px; font-weight: 600; color: #a1a1aa; letter-spacing: 1px; text-transform: uppercase;">Focus on Art, We Manage</span>
          </td>
        </tr>
      </table>
    </div>
    <div class="content">
      <div class="badge">🎉 Account Ready</div>
      <h1>Welcome to StudioCore, ${name}!</h1>
      <p>Congratulations! Your studio workspace for <strong>${studioTitle}</strong> has been successfully initialized.</p>
      
      <div class="highlight-card">
        <div style="margin-bottom: 12px;">
          <strong style="color: #18181b; font-size: 14px;">What you can do right now:</strong>
        </div>
        <p style="margin: 6px 0; font-size: 13px; color: #3f3f46;">📸 <strong>Capture & Leads:</strong> Connect Meta Ads, Google Sheets, or import inquiries in 1-click.</p>
        <p style="margin: 6px 0; font-size: 13px; color: #3f3f46;">📄 <strong>Pro Quotation Builder:</strong> Design luxury interactive proposals with direct WhatsApp delivery.</p>
        <p style="margin: 6px 0; font-size: 13px; color: #3f3f46;">⚡ <strong>Automated Workflows:</strong> Dispatch automated follow-ups, contracts, and team attendance.</p>
      </div>

      <div class="button-container">
        <a href="${targetUrl}" target="_blank" class="cta-btn-3d">Launch Workspace →</a>
      </div>

      <p style="font-size: 12px; color: #71717a; text-align: center; margin-top: 24px;">
        Need assistance getting set up? Reply directly to <a href="mailto:support@studiocore.in" style="color: #F36F21; font-weight: bold;">support@studiocore.in</a>.
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">StudioCore · Capture · Manage · Deliver · Grow</p>
      <p style="margin: 0;">&copy; ${new Date().getFullYear()} StudioCore. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Welcome to StudioCore, ${name}!

Congratulations! Your studio workspace for "${studioTitle}" is now live.

Access your dashboard here:
${targetUrl}

Capture · Manage · Deliver · Grow
StudioCore Support (support@studiocore.in)
  `.trim();

  return sendMailWithFallback({
    from: fromAddress,
    to: toEmail,
    subject: `Welcome to StudioCore, ${name}! 🎉 Your Account is Ready`,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Sends official StudioCore Password Reset Email matching Photo 2 design exactly
 */
export async function sendPasswordResetEmail({
  toEmail,
  recipientName = 'Creator',
  resetUrl,
  expiresInMinutes = 15,
}: SendPasswordResetEmailParams) {
  const fromAddress = 'StudioCore <support@studiocore.in>';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F6EFEB;
      margin: 0;
      padding: 0;
      color: #18181b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 520px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
      border: 1px solid #EAE0D8;
    }
    .header {
      background: #18181b;
      padding: 34px 28px 28px 28px;
      text-align: center;
    }
    .content {
      padding: 36px 36px 28px 36px;
    }
    h1 {
      font-size: 24px;
      font-weight: 800;
      color: #18181b;
      margin: 0 0 18px 0;
      line-height: 1.25;
      letter-spacing: -0.4px;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #3f3f46;
      margin: 0 0 16px 0;
    }
    .button-container {
      text-align: center;
      margin: 28px 0 24px 0;
    }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #F36F21 0%, #FF8A3D 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
      padding: 15px 36px;
      border-radius: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 6px 18px rgba(243, 111, 33, 0.35);
    }
    .notice-box {
      background: #FFF8F5;
      border: 1px solid #FFD9BD;
      border-radius: 12px;
      padding: 14px 18px;
      margin: 24px 0 8px 0;
      text-align: center;
    }
    .notice-box p {
      margin: 0;
      color: #c2410c;
      font-size: 12.5px;
      font-weight: 600;
      line-height: 1.5;
    }
    .footer {
      background: #FAF6F3;
      border-top: 1px solid #EAE0D8;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #71717a;
    }
    .footer a {
      color: #F36F21;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header matching Photo 2 -->
    <div class="header">
      <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #F36F21 0%, #D9530F 100%); border-radius: 15px; border: 1px solid rgba(255, 255, 255, 0.25); text-align: center; line-height: 50px; margin: 0 auto;">
              <span style="font-size: 21px; font-weight: 900; color: #ffffff; font-family: serif; letter-spacing: 1px;">SC</span>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 3px;">
            <span style="font-size: 23px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">Studio<span style="color: #F36F21;">Core</span></span>
          </td>
        </tr>
        <tr>
          <td align="center">
            <span style="font-size: 10px; font-weight: 700; color: #a1a1aa; letter-spacing: 1.5px; text-transform: uppercase;">FOCUS ON ART, WE MANAGE</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- Content matching Photo 2 -->
    <div class="content">
      <h1>Reset Your Password</h1>
      <p>Hello,</p>
      <p>We received a request to reset your StudioCore account password. Click the button below to choose a new password:</p>

      <div class="button-container">
        <a href="${resetUrl}" target="_blank" class="cta-btn">RESET MY PASSWORD →</a>
      </div>

      <div class="notice-box">
        <p>⏱ This password reset link is valid for 15 minutes. If you did not make this request, you can safely ignore this email.</p>
      </div>
    </div>

    <!-- Footer matching Photo 2 -->
    <div class="footer">
      <p style="margin: 0 0 4px 0; color: #71717a;">StudioCore Security · Focus on Art, We Manage</p>
      <p style="margin: 0; color: #71717a;">Support: <a href="mailto:support@studiocore.in">support@studiocore.in</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Hello,

We received a request to reset your StudioCore account password.
Click the link below to set your new password (valid for ${expiresInMinutes} minutes):

${resetUrl}

If you did not request this, you can safely ignore this email.

StudioCore Security · Focus on Art, We Manage
Support: support@studiocore.in
  `.trim();

  return sendMailWithFallback({
    from: fromAddress,
    to: toEmail,
    subject: 'Reset Your StudioCore Password',
    text: textContent,
    html: htmlContent,
  });
}
