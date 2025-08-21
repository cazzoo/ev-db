import nodemailer from 'nodemailer';
import { getSetting } from './settingsService';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

// Email data interface
interface EmailData {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: any[];
}

// Enhanced email service class
export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  // Get SMTP configuration from settings
  private static async getEmailConfig(): Promise<EmailConfig> {
    const host = await getSetting('EMAIL', 'smtp_host');
    const port = await getSetting('EMAIL', 'smtp_port');
    const user = await getSetting('EMAIL', 'smtp_user');
    const password = await getSetting('EMAIL', 'smtp_password');

    if (!host?.value) {
      throw new Error('SMTP host not configured');
    }

    const config: EmailConfig = {
      host: host.value,
      port: parseInt(port?.value || '587'),
      secure: parseInt(port?.value || '587') === 465, // true for 465, false for other ports
    };

    if (user?.value && password?.value) {
      config.auth = {
        user: user.value,
        pass: password.value,
      };
    }

    return config;
  }

  // Get or create SMTP transporter
  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (!this.transporter) {
      const config = await this.getEmailConfig();
      this.transporter = nodemailer.createTransport(config);
    }
    return this.transporter;
  }

  // Send email
  static async sendEmail(emailData: EmailData): Promise<any> {
    try {
      const transporter = await this.getTransporter();
      const fromEmail = await getSetting('EMAIL', 'from_email');
      const fromName = await getSetting('EMAIL', 'from_name');

      const mailOptions = {
        from: emailData.from || `${fromName?.value || 'EV Database'} <${fromEmail?.value || 'noreply@evdb.com'}>`,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
        replyTo: emailData.replyTo,
        attachments: emailData.attachments,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  // Generate HTML email template
  static generateHTMLTemplate(
    title: string,
    content: string,
    buttonText?: string,
    buttonUrl?: string,
    footerText?: string
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
        }
        .email-container {
            background-color: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e0e0e0;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 10px;
        }
        .title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
        }
        .content {
            margin-bottom: 30px;
            white-space: pre-line;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2563eb;
            color: #ffffff;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1d4ed8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #6b7280;
            text-align: center;
        }
        .highlight {
            background-color: #fef3c7;
            padding: 15px;
            border-left: 4px solid #f59e0b;
            margin: 20px 0;
            border-radius: 4px;
        }
        .success {
            background-color: #d1fae5;
            border-left-color: #10b981;
        }
        .error {
            background-color: #fee2e2;
            border-left-color: #ef4444;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">⚡ EV Database</div>
        </div>

        <div class="title">${title}</div>

        <div class="content">${content}</div>

        ${buttonText && buttonUrl ? `
        <div style="text-align: center;">
            <a href="${buttonUrl}" class="button">${buttonText}</a>
        </div>
        ` : ''}

        <div class="footer">
            ${footerText || 'This email was sent by EV Database. If you have any questions, please contact our support team.'}
            <br><br>
            <strong>EV Database Team</strong>
        </div>
    </div>
</body>
</html>`;
  }

  // Send contribution rejection email with enhanced template
  static async sendContributionRejectionEmail(
    toEmail: string,
    vehicleData: { make?: string; model?: string; year?: number },
    rejectionComment: string
  ): Promise<void> {
    const title = `${vehicleData?.year ?? ''} ${vehicleData?.make ?? ''} ${vehicleData?.model ?? ''}`.trim();
    const subject = `Your vehicle contribution needs attention`;

    const content = `Hello,

Your contribution for ${title || 'a vehicle'} has been reviewed by our moderation team and requires some changes before it can be approved.

**Feedback from our moderators:**
${rejectionComment}

Please review the feedback carefully and make the necessary adjustments. You can then resubmit your contribution for another review.

We appreciate your effort to contribute to the EV Database and look forward to your updated submission.`;

    const html = this.generateHTMLTemplate(
      'Contribution Review Required',
      content,
      'View My Contributions',
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/contributions`,
      'Thank you for contributing to the EV Database community!'
    );

    await this.sendEmail({
      to: toEmail,
      subject,
      text: content.replace(/\*\*(.*?)\*\*/g, '$1'), // Remove markdown formatting for text version
      html,
    });
  }

  // Send contribution approval email
  static async sendContributionApprovalEmail(
    toEmail: string,
    vehicleData: { make?: string; model?: string; year?: number },
    contributionId: number
  ): Promise<void> {
    const title = `${vehicleData?.year ?? ''} ${vehicleData?.make ?? ''} ${vehicleData?.model ?? ''}`.trim();
    const subject = `Your contribution has been approved! 🎉`;

    const content = `Congratulations!

Your contribution for ${title || 'a vehicle'} has been approved and is now live in the EV Database.

Your valuable contribution helps other EV enthusiasts make informed decisions. Thank you for being part of our community!

**What happens next:**
- Your contribution is now visible to all users
- You've earned contribution points for your profile
- Other users can now benefit from the information you provided`;

    const html = this.generateHTMLTemplate(
      'Contribution Approved! 🎉',
      content,
      'View Live Contribution',
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vehicles/${contributionId}`,
      'Keep up the great work! Your contributions make the EV Database better for everyone.'
    );

    await this.sendEmail({
      to: toEmail,
      subject,
      text: content.replace(/\*\*(.*?)\*\*/g, '$1'),
      html,
    });
  }

  // Send welcome email for new users
  static async sendWelcomeEmail(toEmail: string, userName?: string): Promise<void> {
    const subject = `Welcome to EV Database! 🚗⚡`;

    const content = `${userName ? `Hello ${userName}` : 'Hello'},

Welcome to the EV Database community! We're excited to have you join us.

**What you can do:**
- Browse our comprehensive database of electric vehicles
- Contribute vehicle data and help grow our community
- Access detailed specifications and real-world information
- Connect with other EV enthusiasts

**Getting started:**
1. Complete your profile to personalize your experience
2. Explore our vehicle database
3. Consider contributing data for vehicles you know about
4. Join discussions in our community forums

We're here to help if you have any questions. Welcome aboard!`;

    const html = this.generateHTMLTemplate(
      'Welcome to EV Database! 🚗⚡',
      content,
      'Explore Vehicles',
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/vehicles`,
      'Thank you for joining the EV Database community!'
    );

    await this.sendEmail({
      to: toEmail,
      subject,
      text: content.replace(/\*\*(.*?)\*\*/g, '$1'),
      html,
    });
  }

  // Send password reset email
  static async sendPasswordResetEmail(
    toEmail: string,
    resetToken: string,
    userName?: string
  ): Promise<void> {
    const subject = `Reset your EV Database password`;

    const content = `${userName ? `Hello ${userName}` : 'Hello'},

We received a request to reset your password for your EV Database account.

If you requested this password reset, click the button below to set a new password. This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.`;

    const html = this.generateHTMLTemplate(
      'Reset Your Password',
      content,
      'Reset Password',
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`,
      'For security reasons, this link will expire in 1 hour.'
    );

    await this.sendEmail({
      to: toEmail,
      subject,
      text: content,
      html,
    });
  }
}

// Legacy function for backward compatibility
export const sendContributionRejectionEmail = EmailService.sendContributionRejectionEmail;

