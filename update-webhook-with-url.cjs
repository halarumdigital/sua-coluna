const fetch = require('node-fetch');
require('dotenv').config();

async function updateWebhookWithUrl() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Uso: node update-webhook-with-url.cjs "https://sua-url-publica.com"');
    return;
  }

  const publicUrl = args[0];
  const webhookPath = '/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const fullWebhookUrl = publicUrl + webhookPath;

  console.log('🔧 Atualizando webhook com URL pública...');

  // Configurações da Evolution API
  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';

  try {
    console.log(`🔗 Novo webhook URL: ${fullWebhookUrl}`);
    console.log(`📡 Atualizando webhook na Evolution API...`);

    // Configurar webhook na Evolution API
    const webhookConfig = {
      webhook: {
        url: fullWebhookUrl,
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
    console.log(`✅ Webhook atualizado com sucesso:`, result);
    
    console.log('\n🎉 WEBHOOK CONFIGURADO!');
    console.log('\n📝 AGORA TESTE:');
    console.log('   1. Certifique-se que o servidor local está rodando (npm run dev)');
    console.log('   2. Certifique-se que o túnel está ativo');
    console.log('   3. Envie uma mensagem para o WhatsApp');
    console.log('   4. Monitore os logs do servidor local');
    console.log('   5. Aguarde a resposta automática');

  } catch (error) {
    console.error('❌ Erro ao atualizar webhook:', error.message);
  }
}

updateWebhookWithUrl().catch(console.error);