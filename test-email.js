/**
 * Email Testing Script for Madadgar
 * 
 * This script helps you test email functionality without running the full server.
 * 
 * Usage:
 * 1. Make sure .env file is configured with SMTP settings
 * 2. Run: node test-email.js
 */

import dotenv from 'dotenv';
import { sendEmail, welcomeEmail, otpEmail, resetPasswordEmail, passwordChangedEmail } from './utils/email.js';

// Load environment variables
dotenv.config();

const TEST_EMAIL = process.env.TEST_EMAIL || 'your-test-email@example.com';

console.log('🧪 Madadgar Email Testing Script\n');
console.log('Configuration:');
console.log(`  SMTP Host: ${process.env.SMTP_HOST || 'NOT SET'}`);
console.log(`  SMTP Port: ${process.env.SMTP_PORT || 'NOT SET'}`);
console.log(`  SMTP User: ${process.env.SMTP_USER || 'NOT SET'}`);
console.log(`  Email From: ${process.env.EMAIL_FROM || 'NOT SET'}`);
console.log(`  Test Email: ${TEST_EMAIL}\n`);

// Test all email templates
async function testEmails() {
  try {
    console.log('📧 Testing email templates...\n');

    // Test 1: Welcome Email
    console.log('1️⃣ Sending Welcome Email...');
    await sendEmail({
      to: TEST_EMAIL,
      subject: 'Welcome to Madadgar! 🎉',
      html: welcomeEmail('Test User')
    });
    console.log('✅ Welcome email sent successfully!\n');

    // Wait 2 seconds between emails
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: OTP Email
    console.log('2️⃣ Sending OTP Verification Email...');
    await sendEmail({
      to: TEST_EMAIL,
      subject: 'Verify Your Account - Madadgar',
      html: otpEmail('Test User', '123456')
    });
    console.log('✅ OTP email sent successfully!\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 3: Password Reset Email
    console.log('3️⃣ Sending Password Reset Email...');
    await sendEmail({
      to: TEST_EMAIL,
      subject: 'Password Reset Code - Madadgar',
      html: resetPasswordEmail('Test User', '789012')
    });
    console.log('✅ Password reset email sent successfully!\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 4: Password Changed Email
    console.log('4️⃣ Sending Password Changed Confirmation Email...');
    await sendEmail({
      to: TEST_EMAIL,
      subject: 'Password Changed Successfully - Madadgar',
      html: passwordChangedEmail('Test User')
    });
    console.log('✅ Password changed email sent successfully!\n');

    console.log('🎉 All email tests completed successfully!');
    console.log(`📬 Check your inbox at: ${TEST_EMAIL}\n`);
    console.log('💡 Tips:');
    console.log('  - Check spam/junk folder if emails not in inbox');
    console.log('  - Wait a few minutes for emails to arrive');
    console.log('  - Verify email templates look good on mobile and desktop\n');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('  1. Check your .env file has all SMTP settings');
    console.error('  2. Verify SMTP credentials are correct');
    console.error('  3. For Gmail, use App Password (not regular password)');
    console.error('  4. Check firewall allows connections on SMTP port');
    console.error('  5. Try alternative SMTP port (587 vs 465)\n');
    process.exit(1);
  }
}

// Check if SMTP is configured
if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  console.error('❌ Error: SMTP credentials not configured!\n');
  console.error('Please add the following to your .env file:');
  console.error('  SMTP_HOST=smtp.hostinger.com (or your provider)');
  console.error('  SMTP_PORT=465');
  console.error('  SMTP_USER=your-email@domain.com');
  console.error('  SMTP_PASSWORD=your-password');
  console.error('  EMAIL_FROM=Madadgar <noreply@domain.com>\n');
  console.error('See EMAIL_SETUP.md for detailed instructions.\n');
  process.exit(1);
}

// Run tests
testEmails().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
