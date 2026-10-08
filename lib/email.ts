import Mailgun from "mailgun.js";

// Initialize Mailgun client
const mailgun = new Mailgun(FormData);

const mg = process.env.MAILGUN_API_KEY
  ? mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY,
    })
  : null;

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "revolutionuc.com";
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || "RevolutionUC <info@revolutionuc.com>";

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send an email using Mailgun
 */
async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; error?: string }> {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    console.error(
      "Mailgun configuration missing. Set MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables.",
    );
    return { success: false, error: "Email service not configured" };
  }

  try {
    await mg.messages.create(MAILGUN_DOMAIN, {
      from: FROM_EMAIL,
      to: [options.to],
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`Email sent successfully to ${options.to}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send email to admins notifying them of a new access request
 */
export async function sendAccessRequestEmail(
  adminEmail: string,
  requesterName: string,
  requesterEmail: string,
): Promise<{ success: boolean; error?: string }> {
  const dashboardUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const approvalsUrl = `${dashboardUrl}/admin/approvals`;

  const subject = `New Dashboard Access Request from ${requesterName}`;

  const textContent = `
New Access Request

${requesterName} (${requesterEmail}) has requested access to the RevolutionUC Dashboard.

Please review this request at: ${approvalsUrl}

- RevolutionUC Dashboard
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Access Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050b24;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #0d1538; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); border: 1px solid #1a2555;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #151477 0%, #4a67b9 100%); border-radius: 16px 16px 0 0;">
              <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #9fb3ff;">Dashboard Access</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">New Access Request</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #e8f1ff; font-size: 16px; line-height: 1.6;">
                <strong style="color: #ffffff;">${requesterName}</strong> (<a href="mailto:${requesterEmail}" style="color: #4a67b9; text-decoration: none;">${requesterEmail}</a>) has requested access to the RevolutionUC Dashboard.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${approvalsUrl}" style="display: inline-block; background: linear-gradient(135deg, #151477 0%, #4a67b9 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Review Request
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #0a0f2e; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #1a2555;">
              <p style="margin: 0; color: #9fb3ff; font-size: 12px;">RevolutionUC Dashboard</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: adminEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Send email to a user notifying them their access has been approved
 */
export async function sendApprovalEmail(
  userEmail: string,
  userName: string,
): Promise<{ success: boolean; error?: string }> {
  const dashboardUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  const subject = "Your RevolutionUC Dashboard access has been approved!";

  const textContent = `
Hi ${userName},

Great news! Your request to access the RevolutionUC Dashboard has been approved.

You can now sign in at: ${dashboardUrl}

- The RevolutionUC Team
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050b24;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #0d1538; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); border: 1px solid #1a2555;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #0d7a3e 0%, #2ecc71 100%); border-radius: 16px 16px 0 0;">
              <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #a8f0c6;">Access Granted</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">You're Approved!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #e8f1ff; font-size: 16px; line-height: 1.6;">
                Hi <strong style="color: #ffffff;">${userName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #e8f1ff; font-size: 16px; line-height: 1.6;">
                Your request to access the RevolutionUC Dashboard has been approved. You can now sign in and start using the dashboard.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #0d7a3e 0%, #2ecc71 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Go to Dashboard
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #0a0f2e; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #1a2555;">
              <p style="margin: 0; color: #9fb3ff; font-size: 12px;">The RevolutionUC Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: userEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}

/**
 * Send email to a user notifying them their access has been denied
 */
export async function sendDenialEmail(
  userEmail: string,
  userName: string,
): Promise<{ success: boolean; error?: string }> {
  const subject = "RevolutionUC Dashboard access request update";

  const textContent = `
Hi ${userName},

Thank you for your interest in the RevolutionUC Dashboard. Unfortunately, your access request has been denied at this time.

If you believe this was a mistake, please reach out to info@revolutionuc.com.

- The RevolutionUC Team
`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Access Request Update</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #050b24;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #0d1538; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); border: 1px solid #1a2555;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; background: linear-gradient(135deg, #7a3d0d 0%, #c0792e 100%); border-radius: 16px 16px 0 0;">
              <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #f0d6a8;">Request Update</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Access Request Denied</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; color: #e8f1ff; font-size: 16px; line-height: 1.6;">
                Hi <strong style="color: #ffffff;">${userName}</strong>,
              </p>
              <p style="margin: 0 0 20px; color: #e8f1ff; font-size: 16px; line-height: 1.6;">
                Thank you for your interest in the RevolutionUC Dashboard. Unfortunately, your access request has been denied at this time.
              </p>
              <p style="margin: 0 0 20px; color: #e8f1ff; font-size: 16px; line-height: 1.6;">
                If you believe this was a mistake, please contact us at
                <a href="mailto:info@revolutionuc.com" style="color: #4a67b9; text-decoration: none; font-weight: 600;">info@revolutionuc.com</a>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px; background-color: #0a0f2e; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #1a2555;">
              <p style="margin: 0; color: #9fb3ff; font-size: 12px;">The RevolutionUC Team</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  return sendEmail({
    to: userEmail,
    subject,
    text: textContent,
    html: htmlContent,
  });
}
