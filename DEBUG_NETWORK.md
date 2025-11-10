# Network Debugging Guide for Production Email Issues

## Problem
- Email sending works locally (`npm run test:email`) ✅
- Email sending fails in production with "Connection timeout" ❌

## Why This Happens
Your production environment (likely Docker container or cloud server) cannot reach Gmail's SMTP servers due to network restrictions.

## Test Network Connectivity in Production

### 1. SSH into your production server/container
```bash
# If using Docker
docker exec -it <container-name> sh

# If using SSH
ssh user@your-server
```

### 2. Test SMTP Port Accessibility
```bash
# Test port 587 (current configuration)
nc -zv smtp.gmail.com 587
# OR
telnet smtp.gmail.com 587

# Test port 465 (alternative)
nc -zv smtp.gmail.com 465
```

**Expected Results:**
- ✅ **Success**: `Connection to smtp.gmail.com 587 port [tcp/submission] succeeded!`
- ❌ **Failure**: `Connection timeout` or `Connection refused`

### 3. Check if nc/telnet is installed
```bash
# Install if missing (Alpine Linux - common in Docker)
apk add netcat-openbsd

# Install if missing (Debian/Ubuntu)
apt-get update && apt-get install -y netcat

# Install if missing (CentOS/RHEL)
yum install -y nc
```

## Common Causes & Solutions

### Cause 1: Cloud Provider Blocks SMTP Ports
**Common in:** AWS EC2, Google Cloud, Azure, DigitalOcean

**Why:** Prevents spam/abuse

**Solutions:**
1. **Use port 587** (already configured) - usually allowed
2. **Request port unblocking** from cloud provider
3. **Use relay service** (SendGrid, Mailgun) - RECOMMENDED

### Cause 2: Docker Network Isolation
**Issue:** Container cannot reach external SMTP servers

**Solutions:**
```yaml
# docker-compose.yml
services:
  app:
    network_mode: "bridge"  # or "host"
```

### Cause 3: Firewall Rules
**Check outbound rules:**
```bash
# Check iptables
sudo iptables -L OUTPUT -v -n

# Check if Docker has network issues
docker network inspect bridge
```

## Recommended Fix: Use Professional Email Service

Since your local test works but production doesn't, the issue is infrastructure-related.

### Switch to SendGrid (Easiest)

**1. Install package:**
```bash
npm install @sendgrid/mail
```

**2. Get API Key:**
- Sign up at https://sendgrid.com (free tier: 100 emails/day)
- Create API key in Settings → API Keys

**3. Update email.service.ts:**
```typescript
import * as sgMail from '@sendgrid/mail';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.getOrThrow<string>('SENDGRID_API_KEY');
    sgMail.setApiKey(apiKey);
    this.logger.log('SendGrid email service initialized');
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    try {
      const appName = this.configService.get<string>('APP_NAME') || 'MergeVerse';
      
      await sgMail.send({
        from: this.configService.getOrThrow<string>('SENDGRID_FROM_EMAIL'),
        to: email,
        subject: `Verify Your Email - ${appName}`,
        html: this.generateVerificationEmailHTML(code, appName),
      });

      this.logger.log(`Verification email sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}:`, error);
      throw new Error('Failed to send verification email');
    }
  }

  // ... rest of the code
}
```

**4. Update .env:**
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

**Benefits:**
- ✅ No firewall/network issues
- ✅ Better deliverability 
- ✅ Works everywhere (local, Docker, cloud)
- ✅ Email analytics/tracking
- ✅ Higher sending limits

### Alternative: Use Resend (Modern & Developer-Friendly)

**1. Install:**
```bash
npm install resend
```

**2. Get API Key:**
- Sign up at https://resend.com (free tier: 3,000 emails/month)

**3. Implementation:**
```typescript
import { Resend } from 'resend';

export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(
      this.configService.getOrThrow<string>('RESEND_API_KEY')
    );
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    await this.resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: 'Verify Your Email',
      html: this.generateVerificationEmailHTML(code, 'MergeVerse'),
    });
  }
}
```

## Quick Test in Production

Create a test endpoint to verify network access:

```typescript
// In user.controller.ts or create a test controller
@Get('test/smtp-connection')
async testSmtpConnection() {
  const { execSync } = require('child_process');
  
  try {
    // Test port 587
    const result587 = execSync('nc -zv smtp.gmail.com 587 2>&1', { 
      timeout: 5000 
    }).toString();
    
    // Test port 465
    const result465 = execSync('nc -zv smtp.gmail.com 465 2>&1', { 
      timeout: 5000 
    }).toString();
    
    return {
      port587: result587,
      port465: result465,
      conclusion: 'SMTP ports are accessible',
    };
  } catch (error) {
    return {
      error: error.message,
      conclusion: 'SMTP ports are BLOCKED - use SendGrid/Resend instead',
    };
  }
}
```

Then call: `GET /test/smtp-connection` from your production server.

## Summary

✅ **Local works** = Your code is correct  
❌ **Production fails** = Network/Infrastructure issue  

**Best Solution:** Switch to SendGrid, Mailgun, or Resend instead of fighting with Gmail SMTP in production.
