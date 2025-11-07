import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    const EMAIL_USER = this.configService.get<string>('EMAIL_USER');
    const EMAIL_PASS = this.configService.get<string>('EMAIL_PASS');
    if (!EMAIL_USER || !EMAIL_PASS) {
      throw new Error('EMAIL OR PASSWORD IS NOT SET IN EMAIL SERVICE');
    }

    this.transporter = nodemailer.createTransport({
      pool: true,
      host: 'pkz66.hoster.kz',
      port: 465,
      secure: true,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    try {
      const appName =
        this.configService.get<string>('APP_NAME') || 'MergeVerse';

      const mailOptions = {
        from: `"${appName}" <${this.configService.get<string>('EMAIL_USER')}>`,
        to: email,
        subject: `Verify Your Email - ${appName}`,
        html: this.generateVerificationEmailHTML(code, appName),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Verification email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}:`,
        error,
      );
      throw new Error('Failed to send verification email');
    }
  }

  private generateVerificationEmailHTML(code: string, appName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            background-color: #f4f4f4;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            margin-bottom: 10px;
        }
        .header p {
            color: #f0f0f0;
            font-size: 16px;
        }
        .content {
            padding: 40px 30px;
        }
        .greeting {
            font-size: 18px;
            color: #333333;
            margin-bottom: 20px;
        }
        .message {
            font-size: 16px;
            color: #555555;
            margin-bottom: 30px;
            line-height: 1.8;
        }
        .code-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code-label {
            color: #ffffff;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        .verification-code {
            font-size: 36px;
            font-weight: bold;
            color: #ffffff;
            letter-spacing: 8px;
            font-family: 'Courier New', monospace;
            display: inline-block;
            padding: 15px 30px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            border: 2px dashed #ffffff;
        }
        .expiry-notice {
            background-color: #fff9e6;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 25px 0;
            border-radius: 4px;
        }
        .expiry-notice p {
            color: #856404;
            font-size: 14px;
            margin: 0;
        }
        .security-notice {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin-top: 30px;
        }
        .security-notice h3 {
            color: #333333;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .security-notice p {
            color: #666666;
            font-size: 14px;
            margin-bottom: 0;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .footer p {
            color: #6c757d;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .footer a {
            color: #667eea;
            text-decoration: none;
        }
        .footer a:hover {
            text-decoration: underline;
        }
        @media only screen and (max-width: 600px) {
            .content {
                padding: 30px 20px;
            }
            .verification-code {
                font-size: 28px;
                letter-spacing: 5px;
                padding: 12px 20px;
            }
            .header h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✨ ${appName}</h1>
            <p>Email Verification</p>
        </div>
        
        <div class="content">
            <div class="greeting">
                <strong>Hello!</strong>
            </div>
            
            <div class="message">
                Thank you for signing up with ${appName}! To complete your registration and secure your account, please verify your email address by entering the verification code below.
            </div>
            
            <div class="code-container">
                <div class="code-label">Your Verification Code</div>
                <div class="verification-code">${code}</div>
            </div>
            
            <div class="expiry-notice">
                <p><strong>⏰ Important:</strong> This verification code will expire in <strong>15 minutes</strong>. Please complete the verification process promptly.</p>
            </div>
            
            <div class="message">
                Simply enter this code in the verification field to activate your account and start exploring all the features ${appName} has to offer.
            </div>
            
            <div class="security-notice">
                <h3>🔒 Security Notice</h3>
                <p>If you didn't request this verification code, please ignore this email. Your account remains secure, and no further action is required.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
