require('dotenv').config();
const fetch = require('node-fetch');

async function fixWebhookConfig() {
  console.log('🔧 Configurando webhook da Evolution API...');
  
  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798';
  const instanceKey = 'deploy1';
  
  try {
    // Configurar o webhook diretamente
    console.log('\n🔗 Configurando webhook...');
    const webhookUrl = 'https://suacoluna.gilliard.dev.br/api/client/whatsapp-webhook/deploy1';
    
    const webhookConfig = {
      url: webhookUrl,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE', 
        'MESSAGES_DELETE',
        'SEND_MESSAGE'
      ],
      webhook_by_events: false
    };
    
    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Eventos: ${webhookConfig.events.join(', ')}`);
    
    const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });
    
    console.log(`   Status da resposta: ${webhookResponse.status}`);
    
    if (webhookResponse.ok) {
      const result = await webhookResponse.json();
      console.log('   ✅ Webhook configurado com sucesso!');
      console.log('   Resposta:', result);
    } else {
      const error = await webhookResponse.text();
      console.log('   ❌ Erro ao configurar webhook:', error);
    }
    
    // Testar se o webhook está funcionando
    console.log('\n🧪 Testando webhook...');
    console.log('   Agora envie uma mensagem para 5549991016846');
    console.log('   O webhook deve receber a mensagem em:');
    console.log(`   ${webhookUrl}`);
    
  } catch (error) {
    console.error('❌ Erro durante configuração:', error);
  }
}

fixWebhookConfig().catch(console.error);