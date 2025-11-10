# Email Service Troubleshooting Guide

## Current Issue: Connection Timeout to Gmail SMTP

### What Changed
- Switched from port **465** (SSL/TLS) to port **587** (STARTTLS)
- Port 587 often works better in Docker containers and restricted network environments

### If Port 587 Still Fails

#### Option 1: Check Network/Firewall Configuration
Your server/container might be blocking outbound SMTP connections. Check:

1. **Test connectivity from your container:**
   ```bash
   # SSH into your container
   docker exec -it <container-name> sh
   
   # Test if port 587 is reachable
   nc -zv smtp.gmail.com 587
   
   # Or test port 465
   nc -zv smtp.gmail.com 465
   ```

2. **Check firewall rules:**
   - Ensure outbound traffic on ports 587 and 465 is allowed
   - Some cloud providers (AWS, Google Cloud) block port 25 by default but 587 should work

#### Option 2: Switch to a Professional Email Service (Recommended)

Gmail SMTP is not designed for production server use. Consider:

**SendGrid (Free tier: 100 emails/day)**
```typescript
// Install: npm install @sendgrid/mail
import * as sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const msg = {
  to: email,
  from: 'noreply@yourdomain.com',
  subject: 'Verify Your Email',
  html: htmlContent,
};

await sgMail.send(msg);
```

**Mailgun (Free tier: 5,000 emails/month)**
```typescript
// Install: npm install mailgun.js form-data
import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
});

await mg.messages.create(process.env.MAILGUN_DOMAIN, {
  from: 'noreply@yourdomain.com',
  to: [email],
  subject: 'Verify Your Email',
  html: htmlContent,
});
```

**Resend (Modern, developer-friendly)**
```typescript
// Install: npm install resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: email,
  subject: 'Verify Your Email',
  html: htmlContent,
});
```

#### Option 3: Use Gmail with Correct Settings

Ensure you have:
1. **App Password** (not regular Gmail password)
   - Go to: https://myaccount.google.com/apppasswords
   - Generate a new app password
   - Use this in `EMAIL_PASS` environment variable

2. **2-Step Verification Enabled**
   - Required for App Passwords

3. **"Less Secure App Access"** is deprecated - use App Passwords instead

#### Option 4: Local SMTP Server (for development)

Use MailHog or Mailtrap for testing:

**MailHog (catches emails locally)**
```yaml
# docker-compose.yml
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025"  # SMTP
      - "8025:8025"  # Web UI
```

```typescript
// Configuration for MailHog
{
  host: 'mailhog',
  port: 1025,
  secure: false,
  // No auth needed
}
```

### Current Configuration

```env
EMAIL_USER=mergeverse.info@gmail.com
EMAIL_PASS=your-app-password-here
```

**Email Service Settings:**
- Host: smtp.gmail.com
- Port: 587
- Secure: false (STARTTLS)
- Connection Timeout: 15s
- Greeting Timeout: 15s
- Socket Timeout: 30s

### Testing the Connection

You can test the SMTP connection manually:
```bash
# Test from your server/container
telnet smtp.gmail.com 587

# Or using openssl
openssl s_client -connect smtp.gmail.com:587 -starttls smtp
```

### Environment Variable Checklist

- [ ] `EMAIL_USER` is set correctly
- [ ] `EMAIL_PASS` is an **App Password**, not regular password
- [ ] App Password has no spaces (format: `xxxx xxxx xxxx xxxx` → `xxxxxxxxxxxxxxxx`)
- [ ] 2-Step Verification is enabled on the Gmail account

### Recommended Next Steps

1. **Try port 587** (already done) - restart your app and test
2. **Verify App Password** - regenerate if unsure
3. **Test network connectivity** - ensure ports 587/465 are accessible
4. **Consider switching to SendGrid/Mailgun** for production use
