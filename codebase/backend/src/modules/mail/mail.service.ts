import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !port || !user || !pass) {
      this.logger.warn(
        'Mail service is not fully configured. SMTP credentials are missing in env.',
      );
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // Use SSL/TLS for port 465, otherwise STARTTLS
        auth: {
          user,
          pass,
        },
      });
      this.logger.log('SMTP Mail transporter initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize SMTP transporter', error);
    }
  }

  async sendResetPasswordEmail(to: string, name: string, token: string) {
    const from = this.configService.get<string>(
      'SMTP_FROM',
      '"ProxyLLM Support" <no-reply@proxyllm.com>',
    );
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (!this.transporter) {
      this.logger.error(
        'Cannot send email: SMTP transporter is not initialized.',
      );
      throw new Error(
        'Mail service is unconfigured. Please check SMTP settings.',
      );
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your ProxyLLM Password</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #0b0f19;
            color: #e2e8f0;
            margin: 0;
            padding: 0;
          }
          .email-container {
            max-width: 600px;
            margin: 40px auto;
            background: #0d1527;
            border: 1px solid rgba(0, 255, 255, 0.1);
            border-radius: 16px;
            padding: 32px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .logo {
            text-align: center;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.025em;
            color: #ffffff;
            margin-bottom: 24px;
          }
          .logo-cyan {
            color: #00ffff;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          }
          h1 {
            color: #ffffff;
            font-size: 20px;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            font-size: 14px;
            line-height: 1.6;
            color: #94a3b8;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .btn-container {
            text-align: center;
            margin-bottom: 28px;
          }
          .btn-reset {
            display: inline-block;
            background-color: #00ffff;
            color: #0b0f19 !important;
            font-weight: 700;
            font-size: 14px;
            text-decoration: none;
            padding: 12px 28px;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
            transition: all 0.3s ease;
          }
          .link-text {
            word-break: break-all;
            color: #00ffff;
            font-size: 12px;
            text-decoration: underline;
          }
          .divider {
            border: 0;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            margin: 24px 0;
          }
          .footer {
            font-size: 11px;
            text-align: center;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            Proxy<span class="logo-cyan">LLM</span>
          </div>
          <h1>Password Reset Request</h1>
          <p>Hello ${name},</p>
          <p>We received a request to reset the password for your ProxyLLM account. Click the button below to choose a new password. This reset link is valid for the next 60 minutes.</p>
          
          <div class="btn-container">
            <a href="${resetUrl}" target="_blank" class="btn-reset">Reset Password</a>
          </div>
          
          <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
          <p><a href="${resetUrl}" target="_blank" class="link-text">${resetUrl}</a></p>
          
          <p>If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
          
          <hr class="divider">
          
          <div class="footer">
            <p style="margin-bottom: 4px;">This is an automated message, please do not reply directly to this email.</p>
            <p style="margin: 0;">© 2026 ProxyLLM. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Reset your ProxyLLM Password',
        html: htmlContent,
      });
      this.logger.log(`Password reset email successfully sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      throw new Error('Could not send reset email. Please try again later.');
    }
  }
}
