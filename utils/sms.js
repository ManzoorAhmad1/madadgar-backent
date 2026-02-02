import twilio from 'twilio';
import { formatPakistaniPhone } from './phoneFormatter.js';

// Initialize Twilio client only if credentials are provided
let client = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

// Validate Twilio configuration
if (accountSid && authToken && accountSid.startsWith('AC')) {
  if (!twilioPhone || twilioPhone.includes('your_twilio') || twilioPhone.length < 10) {
    console.warn('⚠️  TWILIO_PHONE_NUMBER not properly configured. SMS will be simulated.');
    console.warn('💡 Get a Twilio phone number from: https://console.twilio.com/us1/develop/phone-numbers');
  } else {
    client = twilio(accountSid, authToken);
    console.log(`✅ Twilio initialized successfully with number: ${twilioPhone}`);
  }
} else {
  console.warn('⚠️  Twilio credentials not configured. SMS functionality will be disabled.');
  console.warn('💡 For production, configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
}

// Send SMS
export const sendSMS = async (to, message) => {
  // Format phone number to international format
  const formattedPhone = formatPakistaniPhone(to);
  if (!client) {
    console.warn('📱 SMS not sent (Twilio not configured)');
    console.log(`📋 [DEV MODE] SMS to ${formattedPhone}: ${message}`);
    // In development, just log the message instead of failing
    return { sid: 'dev-mode', status: 'simulated', to: formattedPhone, body: message };
  }
  
  try {
    const result = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: formattedPhone
    });
    console.log('✅ SMS sent successfully:', result.sid);
    return result;
  } catch (error) {
    // Handle common Twilio errors with helpful messages
    if (error.code === 21266) {
      console.error('❌ Twilio Error: "To" and "From" numbers cannot be the same');
      console.error(`   From: ${twilioPhone}, To: ${formattedPhone}`);
      console.error('💡 Solution: Use a valid Twilio phone number or disable Twilio for development');
    } else if (error.code === 21211) {
      console.error('❌ Twilio Error: Invalid phone number format');
      console.error(`   Number: ${formattedPhone}`);
    } else if (error.code === 21608) {
      console.error('❌ Twilio Error: Phone number not verified (trial account)');
      console.error('💡 Solution: Verify this number in Twilio Console or upgrade to paid account');
    } else {
      console.error('❌ SMS sending error:', error.message || error);
    }
    
    // Don't throw error - let it fail gracefully
    console.log(`📋 [FALLBACK] SMS content: ${message}`);
    return { sid: 'error', status: 'failed', error: error.message };
  }
};

// Send OTP SMS
export const sendOTPSMS = async (to, otp) => {
  const message = `Your Madadgar verification code is: ${otp}. This code will expire in 10 minutes.`;
  return await sendSMS(to, message);
};

// Send booking notification SMS
export const sendBookingNotificationSMS = async (to, bookingId, status) => {
  let message = '';
  switch (status) {
    case 'accepted':
      message = `Your booking ${bookingId} has been accepted by the service provider.`;
      break;
    case 'en_route':
      message = `Your service provider is on the way for booking ${bookingId}.`;
      break;
    case 'arrived':
      message = `Your service provider has arrived for booking ${bookingId}.`;
      break;
    case 'completed':
      message = `Your service for booking ${bookingId} has been completed. Please confirm payment.`;
      break;
    default:
      message = `Update on booking ${bookingId}: Status changed to ${status}.`;
  }
  return await sendSMS(to, message);
};
