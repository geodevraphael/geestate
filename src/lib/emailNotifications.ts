import { supabase } from '@/integrations/supabase/client';

interface EmailNotificationParams {
  userId?: string;
  email?: string;
  subject: string;
  title: string;
  message: string;
  linkUrl?: string;
  linkText?: string;
}

/**
 * Sends an email notification to a user
 * Requires user to be authenticated
 */
export async function sendEmailNotification({
  userId,
  email,
  subject,
  title,
  message,
  linkUrl,
  linkText = 'View Details',
}: EmailNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const htmlContent = generateEmailHtml({ title, message, linkUrl, linkText });
    
    const { data, error } = await supabase.functions.invoke('send-email-notification', {
      body: {
        user_id: userId,
        email,
        subject,
        html_content: htmlContent,
        text_content: `${title}\n\n${message}${linkUrl ? `\n\nView details: ${linkUrl}` : ''}`,
      },
    });

    if (error) {
      console.error('Error sending email notification:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending email notification:', error);
    return { success: false, error: error.message };
  }
}

function generateEmailHtml({
  title,
  message,
  linkUrl,
  linkText,
}: {
  title: string;
  message: string;
  linkUrl?: string;
  linkText?: string;
}): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://geoinsight.co.tz';
  const fullLinkUrl = linkUrl?.startsWith('/') ? `${baseUrl}${linkUrl}` : linkUrl;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                GeoInsight Tanzania
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #71717a;">
                Your trusted land marketplace
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">
                ${title}
              </h2>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                ${message}
              </p>
              ${fullLinkUrl ? `
              <a href="${fullLinkUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                ${linkText}
              </a>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 12px; color: #71717a; text-align: center;">
                This is an automated notification from GeoInsight Tanzania.
                <br>
                Please do not reply to this email.
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #71717a; text-align: center;">
                © ${new Date().getFullYear()} GeoInsight Tanzania. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
