import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockTransporter: any;

  beforeEach(async () => {
    // Create mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id-123',
      }),
      verify: jest.fn().mockResolvedValue(true),
    };

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const config = {
                EMAIL_USER: 'test@example.com',
                EMAIL_PASS: 'test-password',
              };
              return config[key];
            }),
            get: jest.fn((key: string) => {
              const config = {
                APP_NAME: 'TestApp',
                EMAIL_USER: 'test@example.com',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);

    // Wait a bit for the async verifyConnection to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should create nodemailer transporter with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'test-password',
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
      });
    });

    it('should verify connection on startup', () => {
      expect(mockTransporter.verify).toHaveBeenCalled();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const email = 'user@example.com';
      const code = '123456';

      await service.sendVerificationEmail(email, code);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"TestApp" <test@example.com>',
          to: email,
          subject: 'Verify Your Email - TestApp',
          html: expect.stringContaining(code),
        }),
      );
    });

    it('should include verification code in email HTML', async () => {
      const email = 'user@example.com';
      const code = '654321';

      await service.sendVerificationEmail(email, code);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(code);
      expect(callArgs.html).toContain('Verification Code');
    });

    it('should throw error if sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('SMTP connection failed'),
      );

      const email = 'user@example.com';
      const code = '123456';

      await expect(
        service.sendVerificationEmail(email, code),
      ).rejects.toThrow('Failed to send verification email');
    });

    it('should use default app name if not configured', async () => {
      // Override config to return undefined for APP_NAME
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const email = 'user@example.com';
      const code = '123456';

      await service.sendVerificationEmail(email, code);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.subject).toContain('MergeVerse');
    });
  });

  describe('sendPayoutCodeEmail', () => {
    it('should send payout code email successfully', async () => {
      const email = 'user@example.com';
      const code = '789012';
      const amount = 100.5;

      await service.sendPayoutCodeEmail(email, code, amount);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"TestApp" <test@example.com>',
          to: email,
          subject: 'Payout Confirmation Code - TestApp',
          html: expect.stringContaining(code),
        }),
      );
    });

    it('should include payout amount in email HTML', async () => {
      const email = 'user@example.com';
      const code = '789012';
      const amount = 250.75;

      await service.sendPayoutCodeEmail(email, code, amount);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(code);
      expect(callArgs.html).toContain('250.75');
      expect(callArgs.html).toContain('USDT');
    });

    it('should format amount with 2 decimal places', async () => {
      const email = 'user@example.com';
      const code = '789012';
      const amount = 100;

      await service.sendPayoutCodeEmail(email, code, amount);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('100.00');
    });

    it('should throw error if sending fails', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('Network timeout'),
      );

      const email = 'user@example.com';
      const code = '789012';
      const amount = 100;

      await expect(
        service.sendPayoutCodeEmail(email, code, amount),
      ).rejects.toThrow('Failed to send payout code email');
    });
  });

  describe('error handling', () => {
    it('should handle connection verification failure gracefully', async () => {
      const mockVerifyError = new Error('Connection timeout');
      mockTransporter.verify.mockRejectedValueOnce(mockVerifyError);

      // Create a new instance to trigger verification
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: {
              getOrThrow: jest.fn((key: string) => {
                const config = {
                  EMAIL_USER: 'test@example.com',
                  EMAIL_PASS: 'test-password',
                };
                return config[key];
              }),
              get: jest.fn((key: string) => 'TestApp'),
            },
          },
        ],
      }).compile();

      const newService = module.get<EmailService>(EmailService);

      // Wait for verification to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Service should still be created even if verification fails
      expect(newService).toBeDefined();
    });
  });
});
