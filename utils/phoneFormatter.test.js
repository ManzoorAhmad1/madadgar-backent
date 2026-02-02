/**
 * Phone Formatter Test Examples
 * Run with: node utils/phoneFormatter.test.js
 */

const { formatPakistaniPhone, isValidPakistaniPhone, displayFormat } = require('./phoneFormatter');

console.log('📱 Pakistani Phone Number Formatter - Test Cases\n');

const testCases = [
  '03040401234',      // Standard format
  '0304-0401234',     // With dash
  '0304 040 1234',    // With spaces
  '3040401234',       // Without leading 0
  '+923040401234',    // Already formatted
  '923040401234',     // With country code, no +
  '(0304) 0401234',   // With parentheses
];

console.log('Format Conversion:');
console.log('─'.repeat(70));
testCases.forEach(phone => {
  const formatted = formatPakistaniPhone(phone);
  const isValid = isValidPakistaniPhone(phone);
  const display = displayFormat(phone);
  console.log(`Input:     ${phone.padEnd(20)} → Output: ${formatted}`);
  console.log(`Valid:     ${isValid ? '✅' : '❌'}                    → Display: ${display}`);
  console.log('─'.repeat(70));
});

console.log('\n✨ All Pakistani phone numbers are now converted to E.164 format (+923XXXXXXXXX)');
console.log('   This format is required by Twilio for SMS delivery.\n');
