import nodemailer from 'nodemailer';

// Create reusable transporter with Hostinger SMTP
let transporter = null;

if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates if needed
    }
  });
  console.log(`✅ Email transporter initialized: ${process.env.SMTP_USER}`);
} else {
  console.warn('⚠️  Email credentials not configured. Email functionality will be disabled.');
  console.warn('💡 Set SMTP_USER and SMTP_PASSWORD in .env file');
}

// Send email
export const sendEmail = async (options) => {
  if (!transporter) {
    console.warn('Email not sent (SMTP not configured):', options.subject);
    // In development, just log the email instead of failing
    return { messageId: 'dev-mode', accepted: [options.to] };
  }
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Email templates
export const welcomeEmail = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 10px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1f2937; font-size: 24px; margin-bottom: 20px; }
        .content p { color: #4b5563; font-size: 16px; margin-bottom: 15px; line-height: 1.8; }
        .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3); }
        .button:hover { box-shadow: 0 6px 12px rgba(37, 99, 235, 0.4); }
        .features { background: #f9fafb; border-radius: 12px; padding: 25px; margin: 25px 0; }
        .feature-item { display: flex; align-items: start; margin-bottom: 15px; }
        .feature-item:last-child { margin-bottom: 0; }
        .check-icon { color: #10b981; font-size: 20px; margin-right: 12px; font-weight: bold; }
        .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; font-size: 14px; }
        .footer p { margin-bottom: 10px; }
        .social-links { margin: 20px 0; }
        .social-links a { color: #60a5fa; text-decoration: none; margin: 0 10px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✨ Welcome to Madadgar!</h1>
          <p>Pakistan's #1 Trusted Service Platform</p>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Welcome aboard! We're thrilled to have you join our community of thousands of satisfied users across Pakistan.</p>
          
          <div class="features">
            <div class="feature-item">
              <span class="check-icon">✓</span>
              <div>
                <strong>10,000+ Verified Professionals</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Connect with trusted service providers instantly</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="check-icon">✓</span>
              <div>
                <strong>Secure Payment Processing</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Your transactions are safe and protected</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="check-icon">✓</span>
              <div>
                <strong>Real-time Service Tracking</strong><br>
                <span style="color: #6b7280; font-size: 14px;">Track your bookings from start to finish</span>
              </div>
            </div>
            <div class="feature-item">
              <span class="check-icon">✓</span>
              <div>
                <strong>24/7 Customer Support</strong><br>
                <span style="color: #6b7280; font-size: 14px;">We're always here to help you</span>
              </div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Get Started Now →</a>
          </div>

          <p style="margin-top: 30px;">If you have any questions or need assistance, our support team is ready to help you.</p>
          
          <p style="margin-top: 20px; color: #1f2937; font-weight: 600;">Best regards,<br>The Madadgar Team</p>
        </div>
        <div class="footer">
          <p><strong>Madadgar</strong> - Your Trusted Service Helper</p>
          <p>Made with ❤️ in Pakistan</p>
          <div class="social-links">
            <a href="#">Facebook</a> | 
            <a href="#">Twitter</a> | 
            <a href="#">Instagram</a>
          </div>
          <p style="font-size: 12px; color: #6b7280; margin-top: 15px;">
            © ${new Date().getFullYear()} Madadgar. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const otpEmail = (name, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; text-align: center; }
        .content h2 { color: #1f2937; font-size: 22px; margin-bottom: 15px; }
        .content p { color: #4b5563; font-size: 16px; margin-bottom: 20px; }
        .otp-box { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 3px dashed #2563eb; border-radius: 12px; padding: 30px; margin: 30px auto; max-width: 300px; }
        .otp { font-size: 42px; font-weight: 800; color: #2563eb; letter-spacing: 12px; font-family: 'Courier New', monospace; }
        .timer { background: #fef3c7; color: #92400e; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: 600; }
        .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin-top: 30px; text-align: left; }
        .warning p { color: #991b1b; font-size: 14px; margin: 0; }
        .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Verify Your Account</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Please use the verification code below to verify your account:</p>
          
          <div class="otp-box">
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px; font-weight: 600;">YOUR OTP CODE</p>
            <div class="otp">${otp}</div>
          </div>

          <div class="timer">⏰ Expires in 10 minutes</div>

          <p style="margin-top: 30px; color: #6b7280;">Enter this code in the app to complete your verification.</p>

          <div class="warning">
            <p><strong>⚠️ Security Notice:</strong> Never share this code with anyone. Madadgar will never ask for your OTP via phone or email.</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Madadgar</strong> - Your Trusted Service Helper</p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
            If you didn't request this code, please ignore this email.
          </p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">
            © ${new Date().getFullYear()} Madadgar. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const resetPasswordEmail = (name, resetLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; }
        .content { padding: 40px 30px; text-align: center; }
        .content h2 { color: #1f2937; font-size: 22px; margin-bottom: 15px; }
        .content p { color: #4b5563; font-size: 16px; margin-bottom: 20px; line-height: 1.8; }
        .button-box { margin: 40px 0; }
        .reset-button { display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white !important; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 18px; font-weight: 700; box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3); transition: transform 0.2s; }
        .reset-button:hover { transform: translateY(-2px); box-shadow: 0 15px 35px rgba(37, 99, 235, 0.4); color: white !important; }
        .timer { background: #fef3c7; color: #92400e; padding: 12px 24px; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: 600; }
        .info-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; border-radius: 6px; margin-top: 30px; text-align: left; }
        .info-box p { color: #1e40af; font-size: 14px; margin: 8px 0; }
        .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin-top: 20px; text-align: left; }
        .warning p { color: #991b1b; font-size: 14px; margin: 0; }
        .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; font-size: 14px; }
        .link-text { word-break: break-all; color: #6b7280; font-size: 12px; margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>We received a request to reset your password. Click the button below to reset your password:</p>
          
          <div class="button-box">
            <a href="${resetLink}" class="reset-button">🔐 Reset Password</a>
          </div>

          <div class="timer">⏰ Link expires in 10 minutes</div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <div class="link-text">${resetLink}</div>

          <div class="warning">
            <p><strong>⚠️ Didn't request this?</strong> If you didn't request a password reset, please ignore this email and your password will remain unchanged. Consider changing your password for security.</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Madadgar</strong> - Your Trusted Service Helper</p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
            This is an automated email. Please do not reply.
          </p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">
            © ${new Date().getFullYear()} Madadgar. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const passwordChangedEmail = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { font-size: 28px; font-weight: 700; }
        .success-icon { font-size: 64px; margin-bottom: 10px; }
        .content { padding: 40px 30px; text-align: center; }
        .content h2 { color: #1f2937; font-size: 22px; margin-bottom: 15px; }
        .content p { color: #4b5563; font-size: 16px; margin-bottom: 20px; line-height: 1.8; }
        .success-box { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 12px; padding: 25px; margin: 30px 0; }
        .success-box p { color: #065f46; font-weight: 600; margin: 0; }
        .info-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px; border-radius: 6px; margin-top: 30px; text-align: left; }
        .info-box p { color: #1e40af; font-size: 14px; margin: 8px 0; }
        .button { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 8px; margin: 25px 0; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3); }
        .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin-top: 20px; text-align: left; }
        .warning p { color: #991b1b; font-size: 14px; margin: 0; }
        .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="success-icon">✅</div>
          <h1>Password Changed Successfully</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your password has been successfully changed. You can now log in with your new password.</p>
          
          <div class="success-box">
            <p>✓ Your account is secure with your new password</p>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="button">Login to Your Account →</a>
          </div>

          <div class="info-box">
            <p><strong>🛡️ Security Tips:</strong></p>
            <p>• Use a unique password for your Madadgar account</p>
            <p>• Never share your password with anyone</p>
            <p>• Enable two-factor authentication for extra security</p>
            <p>• Change your password regularly</p>
          </div>

          <div class="warning">
            <p><strong>⚠️ Didn't make this change?</strong> If you didn't change your password, please contact our support team immediately at support@madadgar.com</p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Madadgar</strong> - Your Trusted Service Helper</p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 10px;">
            Need help? Contact us at support@madadgar.com
          </p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 5px;">
            © ${new Date().getFullYear()} Madadgar. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const bookingConfirmationEmail = (name, bookingId, serviceName, scheduledTime) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #41154c 0%, #8b3a9c 100%); color: white; padding: 30px; text-align: center; }
        .content { background: #f9f9f9; padding: 30px; }
        .booking-details { background: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Booking Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your booking has been confirmed.</p>
          <div class="booking-details">
            <div class="detail-row">
              <span><strong>Booking ID:</strong></span>
              <span>${bookingId}</span>
            </div>
            <div class="detail-row">
              <span><strong>Service:</strong></span>
              <span>${serviceName}</span>
            </div>
            <div class="detail-row">
              <span><strong>Scheduled Time:</strong></span>
              <span>${scheduledTime}</span>
            </div>
          </div>
          <p>You will receive notifications as your service provider updates the status.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};
