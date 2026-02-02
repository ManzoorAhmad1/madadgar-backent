/**
 * Format Pakistani phone numbers to international E.164 format for Twilio
 * Converts: 0304040XXXX -> +923040XXXXXX
 * Converts: 3040XXXXXX -> +923040XXXXXX
 * Keeps: +923040XXXXXX as is
 */
export const formatPakistaniPhone = (phone) => {
  if (!phone) return null;
  
  // Remove all spaces, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If already has +92, return as is
  if (cleaned.startsWith('+92')) {
    return cleaned;
  }
  
  // If starts with 92 (without +), add +
  if (cleaned.startsWith('92')) {
    return '+' + cleaned;
  }
  
  // If starts with 0, replace with +92
  if (cleaned.startsWith('0')) {
    return '+92' + cleaned.substring(1);
  }
  
  // If doesn't start with 0 or 92, assume it's missing country code
  // Add +92 prefix
  return '+92' + cleaned;
};

/**
 * Validate if phone number is a valid Pakistani number
 */
export const isValidPakistaniPhone = (phone) => {
  if (!phone) return false;
  
  const formatted = formatPakistaniPhone(phone);
  
  // Pakistani mobile numbers after +92 should have 10 digits
  // Format: +92 XXX XXXXXXX (total 13 characters including +92)
  const phoneRegex = /^\+92[0-9]{10}$/;
  
  return phoneRegex.test(formatted);
};

/**
 * Display phone number in user-friendly format
 * +923040XXXXXX -> 0304-0XXXXXX
 */
export const displayFormat = (phone) => {
  if (!phone) return '';
  
  const formatted = formatPakistaniPhone(phone);
  
  if (formatted.startsWith('+92')) {
    const digits = formatted.substring(3); // Remove +92
    return '0' + digits.substring(0, 3) + '-' + digits.substring(3);
  }
  
  return phone;
};
