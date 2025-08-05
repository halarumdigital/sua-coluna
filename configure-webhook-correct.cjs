require('dotenv').config();
const fetch = require('node-fetch');

async function configureWebhookCorrect() {
  console.log('🔧 Configurando webhook com formato correto...');
  
  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798';
  const instanceKey = 'deploy1';
  
  try {
    const webhookUrl = 'https://suacoluna.gilliard.dev.br/api/client/whatsapp-webhook/deploy1';
    
    // Formato correto segundo a documentação da Evolution API
    const webhookConfig = {
      webhook: {
        url: webhookUrl,
        enabled: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE', 
          'MESSAGES_DELETE'
        ]
      }
    };
    
    console.log('📋 Configuração do webhook:');
    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Eventos: ${webhookConfig.webhook.events.join(', ')}`);
    
    const response = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });
    
    console.log(`📊 Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Webhook configurado com sucesso!');
      console.log('📋 Resposta:', result);
    } else {
      const error = await response.text();
      console.log('❌ Erro:', error);
    }
    
    console.log('\n🧪 Agora teste:');
    console.log('   1. Envie uma mensagem para 5549991016846');
    console.log('   2. Verifique os logs do servidor');
    console.log('   3. O agente deve responder automaticamente');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

configureWebhookCorrect().catch(console.error);