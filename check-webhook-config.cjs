require('dotenv').config();
const fetch = require('node-fetch');

async function checkWebhookConfig() {
  console.log('🔍 Verificando configuração do webhook...');
  
  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798';
  const instanceKey = 'deploy1';
  
  try {
    // 1. Verificar status da instância
    console.log('\n📱 1. Verificando status da instância...');
    const instanceResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (instanceResponse.ok) {
      const instances = await instanceResponse.json();
      const instance = instances.find(inst => inst.instance.instanceName === instanceKey);
      if (instance) {
        console.log(`   Status: ${instance.instance.status}`);
        console.log(`   Nome: ${instance.instance.instanceName}`);
        console.log(`   Número: ${instance.instance.owner}`);
      } else {
        console.log('   ❌ Instância não encontrada!');
        return;
      }
    }
    
    // 2. Verificar configuração atual do webhook
    console.log('\n🔗 2. Verificando webhook atual...');
    const webhookCheckResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (webhookCheckResponse.ok) {
      const webhookConfig = await webhookCheckResponse.json();
      console.log('   Webhook atual:', webhookConfig);
    } else {
      console.log('   ❌ Erro ao buscar webhook:', await webhookCheckResponse.text());
    }
    
    // 3. Reconfigurar o webhook
    console.log('\n🔧 3. Reconfigurando webhook...');
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
    
    console.log('   URL:', webhookUrl);
    console.log('   Eventos:', webhookConfig.events);
    
    const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });
    
    console.log(`   Status: ${webhookResponse.status}`);
    
    if (webhookResponse.ok) {
      const result = await webhookResponse.json();
      console.log('   ✅ Webhook configurado:', result);
    } else {
      const error = await webhookResponse.text();
      console.log('   ❌ Erro:', error);
    }
    
    // 4. Verificar novamente após configuração
    console.log('\n✅ 4. Verificando webhook após configuração...');
    const finalCheckResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      }
    });
    
    if (finalCheckResponse.ok) {
      const finalConfig = await finalCheckResponse.json();
      console.log('   Configuração final:', finalConfig);
    }
    
  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
  }
}

checkWebhookConfig().catch(console.error);