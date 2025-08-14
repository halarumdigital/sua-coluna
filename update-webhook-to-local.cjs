const fetch = require('node-fetch');
require('dotenv').config();

async function updateWebhookToLocal() {
  console.log('🔧 Atualizando webhook para servidor local...');

  // Configurações da Evolution API
  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';
  
  // Novo webhook URL (servidor local)
  const newWebhookUrl = 'http://localhost:5000/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';

  try {
    console.log(`🔗 Novo webhook URL: ${newWebhookUrl}`);
    console.log(`📡 Atualizando webhook na Evolution API...`);

    // Configurar webhook na Evolution API
    const webhookConfig = {
      webhook: {
        url: newWebhookUrl,
        enabled: true,
        events: [
          'MESSAGES_UPSERT'
        ]
      }
    };

    const response = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });

    console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Erro: ${errorText}`);
      
      // Tentar método alternativo
      console.log('\n🔄 Tentando método alternativo...');
      
      const altResponse = await fetch(`${evolutionApiUrl}/instance/webhook/${instanceKey}`, {
        method: 'PUT',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: newWebhookUrl,
          enabled: true,
          events: ['MESSAGES_UPSERT']
        })
      });

      console.log(`📊 Status alternativo: ${altResponse.status} ${altResponse.statusText}`);
      
      if (altResponse.ok) {
        const altResult = await altResponse.json();
        console.log(`✅ Webhook atualizado (método alternativo):`, altResult);
      } else {
        const altError = await altResponse.text();
        console.log(`❌ Erro alternativo: ${altError}`);
      }
      
      return;
    }

    const result = await response.json();
    console.log(`✅ Webhook atualizado com sucesso:`, result);
    
    console.log('\n🎉 WEBHOOK CONFIGURADO PARA SERVIDOR LOCAL!');
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('   1. Certifique-se que o servidor local está rodando (npm run dev)');
    console.log('   2. Envie uma mensagem para o WhatsApp');
    console.log('   3. Monitore os logs do servidor local');
    console.log('   4. Aguarde a resposta automática');
    
    console.log('\n⚠️ IMPORTANTE:');
    console.log('   - O webhook agora aponta para localhost:5000');
    console.log('   - Funciona apenas enquanto seu servidor local estiver rodando');
    console.log('   - Para produção, você precisará fazer deploy das alterações');

  } catch (error) {
    console.error('❌ Erro ao atualizar webhook:', error.message);
    
    console.log('\n💡 ALTERNATIVA - USANDO NGROK:');
    console.log('   1. Instale ngrok: npm install -g ngrok');
    console.log('   2. Execute: ngrok http 5000');
    console.log('   3. Use a URL do ngrok para o webhook');
  }
}

updateWebhookToLocal().catch(console.error);