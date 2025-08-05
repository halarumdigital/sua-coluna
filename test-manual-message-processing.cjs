require('dotenv').config();
const { WhatsAppAIHandler } = require('./server/whatsapp-ai-handler.js');

async function testManualMessageProcessing() {
  console.log('🧪 Testando processamento manual de mensagem...');
  
  // Simular dados de mensagem do Evolution API
  const testMessageData = {
    data: {
      key: {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
        id: 'TEST_MESSAGE_ID'
      },
      message: {
        conversation: 'oi'
      },
      messageType: 'conversation',
      pushName: 'Test User'
    }
  };
  
  const instanceKey = 'deploy1';
  
  console.log('📱 Dados da mensagem simulada:');
  console.log(`   Instância: ${instanceKey}`);
  console.log(`   De: ${testMessageData.data.key.remoteJid}`);
  console.log(`   Texto: ${testMessageData.data.message.conversation}`);
  
  try {
    const handler = new WhatsAppAIHandler();
    
    console.log('\n🤖 Iniciando processamento...');
    await handler.handleIncomingMessage(instanceKey, testMessageData);
    console.log('\n✅ Processamento concluído!');
  } catch (error) {
    console.error('\n❌ Erro durante o processamento:', error);
  }
}

testManualMessageProcessing().catch(console.error);