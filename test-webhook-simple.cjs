const fetch = require('node-fetch');

async function testWebhook() {
  console.log('🧪 Testando webhook do WhatsApp...');

  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  
  // Simular dados de webhook da Evolution API
  const testWebhookData = {
    event: 'messages.upsert',
    instance: 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398',
    data: {
      messages: [
        {
          key: {
            remoteJid: '5549991016846@s.whatsapp.net',
            fromMe: false,
            id: 'test_msg_' + Date.now()
          },
          message: {
            conversation: 'Olá, preciso de ajuda com dor nas costas'
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          messageType: 'conversation'
        }
      ]
    }
  };

  try {
    console.log(`📡 Enviando teste para: ${webhookUrl}`);
    console.log(`📋 Dados de teste:`, JSON.stringify(testWebhookData, null, 2));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testWebhookData)
    });

    console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Webhook funcionando! Resposta:`, result);
    } else {
      const errorText = await response.text();
      console.log(`❌ Erro no webhook: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error.message);
  }
}

testWebhook();
