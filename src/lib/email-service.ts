import nodemailer from 'nodemailer';

interface SendPasswordResetEmailParams {
  toEmail: string;
  recipientName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

/**
 * Creates a configured Nodemailer transporter using Hostinger SMTP credentials
 */
export function getEmailTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || 'support@studiocore.in';
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '';
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed cert issues on shared hosting
    },
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
  const fromAddress = process.env.SMTP_FROM || `STUDIO <${process.env.SMTP_USER || 'support@studiocore.in'}>`;

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
      background-color: #f7f7f9;
      margin: 0;
      padding: 0;
      color: #1e293b;
    }
    .wrapper {
      max-width: 540px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
      padding: 36px 32px;
      text-align: center;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 8px 18px;
      border-radius: 50px;
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .content {
      padding: 40px 36px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 16px 0;
      line-height: 1.3;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 20px 0;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-btn {
      display: inline-block;
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 14px 34px;
      border-radius: 12px;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(234, 88, 12, 0.35);
    }
    .notice-box {
      background: #fff7ed;
      border: 1px solid #ffedd5;
      border-radius: 12px;
      padding: 16px 20px;
      margin: 24px 0;
    }
    .notice-box p {
      margin: 0;
      color: #c2410c;
      font-size: 13px;
      font-weight: 500;
    }
    .link-fallback {
      font-size: 12px;
      color: #94a3b8;
      word-break: break-all;
      margin-top: 24px;
    }
    .footer {
      background: #fafaf9;
      border-top: 1px solid #f1f5f9;
      padding: 24px 36px;
      text-align: center;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">
        <span>📸 STUDIO.</span>
      </div>
    </div>
    <div class="content">
      <h1>Password Reset Request</h1>
      <p>Hello <strong>${recipientName}</strong>,</p>
      <p>We received a request to reset the password for your Studio account associated with <strong>${toEmail}</strong>.</p>
      
      <div class="button-container">
        <a href="${resetUrl}" target="_blank" class="cta-btn">Reset My Password →</a>
      </div>

      <div class="notice-box">
        <p>⏱️ This reset link is secure and will expire in <strong>${expiresInMinutes} minutes</strong>. If you did not request a password reset, you can safely ignore this email.</p>
      </div>

      <p class="link-fallback">
        If the button above does not work, copy and paste this link into your web browser:<br>
        <a href="${resetUrl}" style="color: #ea580c;">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Shoot · Edit · Deliver · Grow &copy; ${new Date().getFullYear()} Studio Core Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Hello ${recipientName},

We received a request to reset your password for your Studio account (${toEmail}).
Click the link below to set a new password (valid for ${expiresInMinutes} minutes):

${resetUrl}

If you did not request this, please ignore this email.

Shoot · Edit · Deliver · Grow
Studio Core
  `.trim();

  // If SMTP password is not configured or in testing environment, log for easy dev testing
  if (!process.env.SMTP_PASS && !process.env.EMAIL_PASSWORD) {
    console.log(`[SMTP Notice] No SMTP_PASS found in env. Reset URL: ${resetUrl}`);
    return {
      success: true,
      simulated: true,
      resetUrl,
      message: 'SMTP credentials not configured. Simulation logged to console.',
    };
  }

  try {
    const transporter = getEmailTransporter();
    const info = await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: 'Reset Your Studio Account Password',
      text: textContent,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error('[Nodemailer Error]:', error);
    // Even if Hostinger SMTP fails, return detailed error and simulated link for local verification
    return {
      success: false,
      error: error.message || 'Failed to send email via SMTP server.',
      resetUrl,
    };
  }
}
