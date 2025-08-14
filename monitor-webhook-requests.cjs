const fetch = require('node-fetch');
require('dotenv').config();

async function monitorWebhookRequests() {
  console.log('🔍 MONITORANDO REQUISIÇÕES DO WEBHOOK...\n');
  console.log('📡 Enviando requisições de teste a cada 10 segundos...\n');

  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  
  let testCount = 0;
  
  const sendTestRequest = async () => {
    testCount++;
    const timestamp = new Date().toISOString();
    
    console.log(`\n🔄 Teste #${testCount} - ${timestamp}`);
    
    const testWebhookData = {
      event: 'messages.upsert',
      instance: 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398',
      data: {
        messages: [{
          key: {
            remoteJid: '554999214230@s.whatsapp.net',
            fromMe: false,
            id: 'monitor_test_' + Date.now()
          },
          message: {
            conversation: `Teste de monitoramento #${testCount} - ${timestamp}`
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          messageType: 'conversation'
        }]
      }
    };

    try {
      console.log(`   📤 Enviando para: ${webhookUrl}`);
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Webhook-Monitor-Test'
        },
        body: JSON.stringify(testWebhookData),
        timeout: 15000
      });

      console.log(`   📊 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log(`   ✅ Resposta:`, result);
      } else {
        const errorText = await response.text();
        console.log(`   ❌ Erro: ${errorText}`);
      }
    } catch (error) {
      console.log(`   ❌ Erro de conexão: ${error.message}`);
    }
  };

  // Primeiro teste imediato
  await sendTestRequest();
  
  // Testes a cada 10 segundos
  const interval = setInterval(sendTestRequest, 10000);
  
  console.log('\n⏰ Monitoramento ativo! Pressione Ctrl+C para parar.');
  console.log('📝 Verifique os logs do servidor para ver se as requisições estão chegando.');
  
  // Parar após 2 minutos
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n⏰ Monitoramento finalizado após 2 minutos.');
    console.log('📝 Verifique se as requisições apareceram nos logs do servidor.');
  }, 120000);
}

monitorWebhookRequests();
