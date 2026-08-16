import nodemailer from 'nodemailer';

interface SendPasswordResetEmailParams {
  toEmail: string;
  recipientName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

interface SendWelcomeEmailParams {
  toEmail: string;
  name: string;
  businessName?: string;
  workspaceUrl?: string;
}

/**
 * Creates a configured Nodemailer transporter with tight timeouts (5s) for high responsiveness
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
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
}

/**
 * Dispatches email using Hostinger SMTP with automatic Port 465 (SSL) -> Port 587 (STARTTLS) fallback
 */
async function sendMailWithFallback(mailOptions: any) {
  const defaultPort = parseInt(process.env.SMTP_PORT || '465', 10);
  
  // Attempt 1: Default port (465 SSL or configured)
  try {
    const isSecure = defaultPort === 465;
    const transporter = createTransporter(defaultPort, isSecure);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Hostinger SMTP Port ${defaultPort} Success] MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err1: any) {
    console.warn(`[Hostinger SMTP Port ${defaultPort} Warning]: ${err1.message}. Trying fallback port...`);
  }

  // Attempt 2: Fallback to Port 587 STARTTLS (if 465 was blocked by VPS firewall)
  try {
    const fallbackPort = defaultPort === 465 ? 587 : 465;
    const transporterFallback = createTransporter(fallbackPort, fallbackPort === 465);
    const info = await transporterFallback.sendMail(mailOptions);
    console.log(`[Hostinger SMTP Fallback Port ${fallbackPort} Success] MessageID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err2: any) {
    console.error(`[Hostinger SMTP Fallback Error]:`, err2.message);
    return { success: false, error: err2.message || 'SMTP Connection failed' };
  }
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
  const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://test.studiocore.in';
  const targetUrl = workspaceUrl || `${defaultAppUrl.replace(/\/$/, '')}/workspace`;
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
      padding: 40px 32px;
      text-align: center;
    }
    .logo-text {
      font-size: 26px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .logo-orange {
      color: #F36F21;
    }
    .tagline {
      font-size: 12px;
      font-weight: 600;
      color: #a1a1aa;
      margin-top: 6px;
      letter-spacing: 1px;
      text-transform: uppercase;
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
    .cta-btn {
      display: inline-block;
      background: #F36F21;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
      padding: 16px 36px;
      border-radius: 14px;
      letter-spacing: 0.3px;
      box-shadow: 0 6px 20px rgba(243, 111, 33, 0.35);
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
      <div class="logo-text"><span class="logo-orange">SC</span> StudioCore</div>
      <div class="tagline">Focus on Art, We Manage</div>
    </div>
    <div class="content">
      <div class="badge">🎉 Account Ready</div>
      <h1>Welcome to StudioCore, ${name}!</h1>
      <p>Congratulations! Your official studio management workspace for <strong>${studioTitle}</strong> has been successfully initialized.</p>
      
      <div class="highlight-card">
        <div style="margin-bottom: 12px;">
          <strong style="color: #18181b; font-size: 14px;">What you can do right now:</strong>
        </div>
        <p style="margin: 6px 0; font-size: 13px; color: #3f3f46;">📸 <strong>Capture & Leads:</strong> Connect Meta Ads, Google Sheets, or import inquiries in 1-click.</p>
        <p style="margin: 6px 0; font-size: 13px; color: #3f3f46;">📄 <strong>Pro Quotation Builder:</strong> Design luxury interactive proposals with direct WhatsApp delivery.</p>
        <p style="margin: 6px 0; font-size: 13px; color: #3f3f46;">⚡ <strong>Automated Workflows:</strong> Dispatch automated follow-ups, contracts, and team attendance.</p>
      </div>

      <div class="button-container">
        <a href="${targetUrl}" target="_blank" class="cta-btn">Launch StudioCore Workspace →</a>
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

Congratulations! Your official studio management workspace for "${studioTitle}" is now live.

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
 * Sends a password reset email with modern branded HTML template
 */
export async function sendPasswordResetEmail({
  toEmail,
  recipientName = 'Creator',
  resetUrl,
  expiresInMinutes = 15,
}: SendPasswordResetEmailParams) {
  const fromAddress = process.env.SMTP_FROM || `"StudioCore Security" <support@studiocore.in>`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your StudioCore Password</title>
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
      padding: 38px 32px;
      text-align: center;
    }
    .logo-text {
      font-size: 26px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .logo-orange {
      color: #F36F21;
    }
    .tagline {
      font-size: 12px;
      font-weight: 600;
      color: #a1a1aa;
      margin-top: 6px;
      letter-spacing: 1px;
      text-transform: uppercase;
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
      font-size: 24px;
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
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-btn {
      display: inline-block;
      background: #F36F21;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 800;
      padding: 16px 36px;
      border-radius: 14px;
      letter-spacing: 0.3px;
      box-shadow: 0 6px 20px rgba(243, 111, 33, 0.35);
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
    .link-fallback {
      font-size: 11px;
      color: #a1a1aa;
      word-break: break-all;
      margin-top: 24px;
      line-height: 1.5;
    }
    .footer {
      background: #FAF6F3;
      border-top: 1px solid #EAE0D8;
      padding: 24px 36px;
      text-align: center;
      font-size: 11px;
      color: #a1a1aa;
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
    <div class="header">
      <div class="logo-text"><span class="logo-orange">SC</span> StudioCore</div>
      <div class="tagline">Focus on Art, We Manage</div>
    </div>
    <div class="content">
      <div class="badge">🔒 Security Request</div>
      <h1>Reset Your Password</h1>
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>We received a request to reset the password for your StudioCore account associated with <strong>${toEmail}</strong>.</p>
      
      <div class="button-container">
        <a href="${resetUrl}" target="_blank" class="cta-btn">Reset My Password →</a>
      </div>

      <div class="notice-box">
        <p>⏱️ This password reset link is valid for <strong>${expiresInMinutes} minutes</strong>. If you did not make this request, you can safely ignore this email.</p>
      </div>

      <p class="link-fallback">
        If the button above doesn't work, copy and paste this URL into your browser:<br>
        <a href="${resetUrl}" style="color: #F36F21;">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">StudioCore Security · Focus on Art, We Manage</p>
      <p style="margin: 0;">Support: <a href="mailto:support@studiocore.in">support@studiocore.in</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
Hello ${recipientName},

We received a request to reset your StudioCore password (${toEmail}).
Click the link below to set a new password (valid for ${expiresInMinutes} minutes):

${resetUrl}

If you did not request this, please ignore this email.

StudioCore Security
support@studiocore.in
  `.trim();

  return sendMailWithFallback({
    from: fromAddress,
    to: toEmail,
    subject: 'Reset Your StudioCore Password',
    text: textContent,
    html: htmlContent,
  });
}
