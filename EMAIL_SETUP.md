# Email Configuration Guide for Madadgar

## Overview
This guide will help you set up email functionality for the Madadgar platform. Emails are used for:
- Welcome emails for new users
- OTP verification codes
- Password reset codes
- Booking confirmations
- Account security notifications

## Email Templates
All email templates are professionally designed with:
- ✅ Responsive design for all devices
- ✅ Brand colors (Primary Blue: #2563eb)
- ✅ Modern gradient backgrounds
- ✅ Security warnings and tips
- ✅ Clear call-to-action buttons

## Setup Options

### Option 1: Hostinger Email (Recommended for Production)

1. **Create Email Account in Hostinger:**
   - Log in to Hostinger control panel
   - Go to "Email Accounts"
   - Create a new email: `noreply@yourdomain.com`
   - Set a strong password

2. **Get SMTP Settings:**
   - Host: `smtp.hostinger.com`
   - Port: `465` (SSL) or `587` (TLS)
   - Username: Your full email address
   - Password: Your email password

3. **Update .env file:**
   ```env
   SMTP_HOST=smtp.hostinger.com
   SMTP_PORT=465
   SMTP_USER=noreply@yourdomain.com
   SMTP_PASSWORD=your_strong_password
   EMAIL_FROM=Madadgar <noreply@yourdomain.com>
   ```

### Option 2: Gmail (Good for Development/Testing)

1. **Enable App Password:**
   - Go to Google Account settings
   - Security → 2-Step Verification (enable if not already)
   - App passwords → Generate new app password
   - Select "Mail" and "Other (Custom name)"
   - Copy the 16-character password

2. **Update .env file:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASSWORD=xxxx xxxx xxxx xxxx (16-char app password)
   EMAIL_FROM=Madadgar <your.email@gmail.com>
   ```

### Option 3: Other SMTP Providers

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
EMAIL_FROM=Madadgar <noreply@yourdomain.com>
```

#### Amazon SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your_ses_username
SMTP_PASSWORD=your_ses_password
EMAIL_FROM=Madadgar <noreply@yourdomain.com>
```

## Testing Email Setup

### 1. Start the Backend Server
```bash
cd madadgar_backend
npm install
npm run dev
```

### 2. Check Console Output
You should see:
```
✅ Email transporter initialized: your-email@domain.com
```

If you see warnings, check your credentials.

### 3. Test with API Call

#### Test Forgot Password:
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

#### Test Register (sends welcome email):
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "client",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "03001234567",
    "password": "Test123456"
  }'
```

## Email Features

### 1. Welcome Email
- **Sent:** When user registers
- **Contains:** Welcome message, platform features, getting started button
- **Template:** `welcomeEmail(name)`

### 2. OTP Verification Email
- **Sent:** For account verification
- **Contains:** 6-digit OTP code, expiration timer (10 minutes)
- **Template:** `otpEmail(name, otp)`

### 3. Password Reset Email
- **Sent:** When user requests password reset
- **Contains:** 6-digit reset code, security warnings
- **Template:** `resetPasswordEmail(name, otp)`

### 4. Password Changed Email
- **Sent:** After successful password change
- **Contains:** Confirmation, security tips, login button
- **Template:** `passwordChangedEmail(name)`

### 5. Booking Confirmation Email
- **Sent:** After successful booking
- **Contains:** Booking details, service info, tracking link
- **Template:** `bookingConfirmationEmail(name, bookingId, serviceName, scheduledTime)`

## Troubleshooting

### Issue: "Email not sent (SMTP not configured)"
**Solution:** Check that all SMTP environment variables are set in `.env` file

### Issue: "Authentication failed"
**Solution:** 
- Verify email and password are correct
- For Gmail, ensure you're using App Password (not regular password)
- For Hostinger, ensure email account is created

### Issue: "Connection timeout"
**Solution:**
- Check SMTP host and port
- Ensure firewall allows outgoing connections on port 587/465
- Try alternative port (587 vs 465)

### Issue: Emails go to spam
**Solution:**
- Add SPF and DKIM records to your domain
- Use a professional email address (@yourdomain.com)
- Avoid spam trigger words in subject lines
- Verify sender email address

## Development Mode

In development, OTP codes are logged to console:
```
🔑 [DEV] Password reset OTP: 123456
```

You can also use test OTP `1234` in development mode for quick testing.

## Security Best Practices

1. **Never commit .env file** - It contains sensitive credentials
2. **Use strong email passwords** - At least 16 characters
3. **Rotate credentials regularly** - Change passwords every 90 days
4. **Use dedicated email** - Don't use personal email for production
5. **Monitor email logs** - Check for suspicious activity
6. **Rate limit email sending** - Prevent abuse (already implemented)

## Email Rate Limits

Current limits (via authLimiter middleware):
- Forgot password: 5 requests per 15 minutes per IP
- Register: 5 requests per 15 minutes per IP
- Resend OTP: 5 requests per 15 minutes per IP

## Support

If you encounter issues:
1. Check backend console for detailed error messages
2. Verify all environment variables are set
3. Test SMTP connection using online tools
4. Check email provider's documentation

## Email Service Recommendations

| Provider | Best For | Pricing | Setup Difficulty |
|----------|----------|---------|------------------|
| Hostinger | Production | Included with hosting | Easy |
| Gmail | Development/Testing | Free (limited) | Easy |
| SendGrid | High volume | Free tier: 100/day | Medium |
| Amazon SES | Enterprise | $0.10 per 1000 emails | Hard |
| Mailgun | API-focused | Free tier: 5000/month | Medium |

## Environment Variables Reference

```env
# Required
SMTP_HOST=smtp.provider.com
SMTP_PORT=465 or 587
SMTP_USER=your_email@domain.com
SMTP_PASSWORD=your_password
EMAIL_FROM=Madadgar <noreply@domain.com>

# Optional
FRONTEND_URL=http://localhost:3000  # For email links
```

---

**Made with ❤️ for Madadgar Platform**
