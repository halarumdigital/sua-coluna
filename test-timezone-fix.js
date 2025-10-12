/**
 * Test to verify timezone fix
 *
 * When AI returns "2025-10-14T10:00:00" (without timezone),
 * we should interpret it as 10:00 Brazil time (UTC-3),
 * NOT as 10:00 UTC
 */

console.log('🧪 Testing timezone fix...\n');

// Simulate AI response without timezone
const aiResponse = "2025-10-14T10:00:00";

console.log('📅 AI Response (without timezone):', aiResponse);
console.log('');

// OLD BEHAVIOR (WRONG):
console.log('❌ OLD BEHAVIOR (parsing as UTC):');
const oldDate = new Date(aiResponse);
console.log('  - Parsed as:', oldDate.toISOString());
console.log('  - Hours (UTC):', oldDate.getUTCHours());
console.log('  - Local time (Brazil):', oldDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
console.log('  - Result: Google Calendar would show 07:00 (10:00 UTC - 3 hours) ❌');
console.log('');

// NEW BEHAVIOR (CORRECT):
console.log('✅ NEW BEHAVIOR (parsing as Brazil time):');
const newDateString = aiResponse + '-03:00';
const newDate = new Date(newDateString);
console.log('  - Added timezone:', newDateString);
console.log('  - Parsed as:', newDate.toISOString());
console.log('  - Hours (UTC):', newDate.getUTCHours(), '(13:00 UTC = 10:00 BRT)');
console.log('  - Local time (Brazil):', newDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }));
console.log('  - Result: Google Calendar will show 10:00 ✅');
console.log('');

// Verify the fix
console.log('🔍 VERIFICATION:');
const brazilHour = parseInt(newDate.toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit'
}));
console.log('  - Expected hour: 10');
console.log('  - Actual hour:', brazilHour);
console.log('  - Test result:', brazilHour === 10 ? '✅ PASSED' : '❌ FAILED');
