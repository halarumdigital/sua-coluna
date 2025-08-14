const fetch = require('node-fetch');
require('dotenv').config();

async function restoreWebhookToProduction() {
  console.log('🔧 Restaurando webhook para servidor de produção...');

  // Configurações da Evolution API
  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';
  
  // Webhook URL original (servidor de produção)
  const originalWebhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';

  try {
    console.log(`🔗 Restaurando webhook URL: ${originalWebhookUrl}`);
    console.log(`📡 Atualizando webhook na Evolution API...`);

    // Configurar webhook na Evolution API
    const webhookConfig = {
      webhook: {
        url: originalWebhookUrl,
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
      return;
    }

    const result = await response.json();
    console.log(`✅ Webhook restaurado com sucesso:`, result);
    
    console.log('\n🎉 WEBHOOK RESTAURADO PARA PRODUÇÃO!');
    console.log('\n📝 AGORA VOCÊ PRECISA:');
    console.log('   1. Fazer deploy das suas alterações para labs.beaihub.com.br');
    console.log('   2. Ou usar ngrok para testar localmente');
    
    console.log('\n💡 PARA USAR NGROK:');
    console.log('   1. Execute: node setup-ngrok.cjs');
    console.log('   2. Obtenha a URL pública do ngrok');
    console.log('   3. Execute novamente este script com a URL do ngrok');

  } catch (error) {
    console.error('❌ Erro ao restaurar webhook:', error.message);
  }
}

restoreWebhookToProduction().catch(console.error);