const fetch = require('node-fetch');

async function testWebhookEndpoint() {
  console.log('🔍 Testando endpoint do webhook...');

  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  
  // Simular dados de webhook da Evolution API (formato real)
  const testWebhookData = {
    event: 'messages.upsert',
    instance: 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398',
    key: {
      remoteJid: '554999214230@s.whatsapp.net',
      fromMe: false,
      id: 'TEST_MESSAGE_ID'
    },
    pushName: 'Teste',
    message: {
      conversation: 'Teste de webhook'
    },
    messageType: 'conversation',
    messageTimestamp: Math.floor(Date.now() / 1000)
  };

  try {
    console.log(`📤 Enviando teste para: ${webhookUrl}`);
    console.log(`📋 Dados do teste:`, JSON.stringify(testWebhookData, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Evolution-API-Test'
      },
      body: JSON.stringify(testWebhookData)
    });

    console.log(`📊 Status da resposta: ${response.status}`);
    console.log(`📊 Status text: ${response.statusText}`);

    if (response.ok) {
      const responseData = await response.json();
      console.log(`✅ Resposta do servidor:`, responseData);
      console.log('\n🎉 WEBHOOK FUNCIONANDO!');
      console.log('   O problema pode ser:');
      console.log('   1. A Evolution API não está conseguindo alcançar o servidor');
      console.log('   2. Há algum problema de rede/firewall');
      console.log('   3. O webhook não está configurado corretamente na Evolution API');
    } else {
      const errorText = await response.text();
      console.log(`❌ Erro na resposta: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error.message);
    console.log('\n💡 Possíveis problemas:');
    console.log('   1. Servidor não está acessível externamente');
    console.log('   2. Firewall bloqueando conexões');
    console.log('   3. SSL/HTTPS não configurado corretamente');
    console.log('   4. DNS não resolvendo corretamente');
  }
}

testWebhookEndpoint().catch(console.error);