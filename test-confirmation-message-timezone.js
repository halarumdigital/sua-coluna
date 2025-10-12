/**
 * Teste para verificar correção do timezone na mensagem de confirmação
 */

console.log('🧪 Testando correção do timezone na mensagem de confirmação...\n');

// Simular a data que vem da IA: "2025-10-14T10:00:00-03:00"
// Isso representa 10:00 horário de Brasília = 13:00 UTC
const dateTimeString = "2025-10-14T10:00:00-03:00";
const dateTime = new Date(dateTimeString);

console.log('📅 Data/hora recebida da IA:');
console.log('  - String original:', dateTimeString);
console.log('  - Date object:', dateTime);
console.log('  - ISO String:', dateTime.toISOString());
console.log('  - UTC Hours:', dateTime.getUTCHours(), '(correto: 13:00 UTC = 10:00 BRT)');
console.log('');

// PROBLEMA: Usar toLocaleDateString sem especificar timeZone
console.log('❌ PROBLEMA (sem especificar timezone):');
const wrongDate = dateTime.toLocaleDateString('pt-BR');
const wrongTime = dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
console.log(`  📅 Data: ${wrongDate}`);
console.log(`  🕐 Horário: ${wrongTime}`);
console.log('  ⚠️ Resultado depende do timezone do servidor!');
console.log('');

// SOLUÇÃO: Especificar timezone explicitamente
console.log('✅ SOLUÇÃO (com timezone America/Sao_Paulo):');
const correctDate = dateTime.toLocaleDateString('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const correctTime = dateTime.toLocaleTimeString('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  hour: '2-digit',
  minute: '2-digit'
});

console.log(`  📅 Data: ${correctDate}`);
console.log(`  🕐 Horário: ${correctTime}`);
console.log('  ✅ Sempre mostra 10:00 independente do timezone do servidor!');
console.log('');

// Mensagem completa
console.log('📨 Mensagem de confirmação correta:');
const patientName = "Gilliard";
const message = `✅ Agendamento criado com sucesso!\n\n📅 Data: ${correctDate}\n🕐 Horário: ${correctTime}\n👤 Paciente: ${patientName}`;
console.log(message);
console.log('');

// Verificação
console.log('🔍 VERIFICAÇÃO:');
console.log('  - Horário esperado: 10:00');
console.log('  - Horário na mensagem:', correctTime);
console.log('  - Teste:', correctTime === '10:00' ? '✅ PASSOU' : '❌ FALHOU');
