require('dotenv').config();
const fetch = require('node-fetch');

async function fixWebhookUrl() {
  console.log('🔧 Corrigindo URL do webhook...');
  
  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798';
  const instanceKey = 'deploy1';
  
  // URL correta do VPS
  const correctWebhookUrl = 'https://suacoluna.gilliard.dev.br/api/client/whatsapp-webhook/deploy1';
  
  try {
    console.log('📋 Configurando webhook com URL correta...');
    console.log(`   URL: ${correctWebhookUrl}`);
    
    const webhookConfig = {
      webhook: {
        url: correctWebhookUrl,
        enabled: true,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'MESSAGES_DELETE'
        ]
      }
    };
    
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
      console.log('✅ Webhook corrigido com sucesso!');
      console.log(`   Nova URL: ${result.url}`);
      console.log(`   Eventos: ${result.events?.join(', ')}`);
      console.log(`   Ativo: ${result.enabled ? 'Sim' : 'Não'}`);
    } else {
      const error = await response.text();
      console.log('❌ Erro ao corrigir webhook:', error);
    }
    
    // Verificar se foi aplicado
    console.log('\n🔍 Verificando webhook após correção...');
    const checkResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      headers: { 'apikey': globalToken }
    });
    
    if (checkResponse.ok) {
      const webhookData = await checkResponse.json();
      console.log('✅ Verificação:');
      console.log(`   URL atual: ${webhookData.url}`);
      console.log(`   Eventos: ${webhookData.events?.join(', ')}`);
      console.log(`   Status: ${webhookData.enabled ? 'Ativo' : 'Inativo'}`);
      
      if (webhookData.url === correctWebhookUrl) {
        console.log('\n🎉 SUCESSO! Webhook configurado corretamente!');
        console.log('📱 Agora envie uma mensagem para 5549991016846 para testar');
      } else {
        console.log('\n❌ URL ainda está incorreta. Pode ser necessário reconfigurar manualmente.');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  }
}

fixWebhookUrl().catch(console.error);