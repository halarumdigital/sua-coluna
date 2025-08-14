const fetch = require('node-fetch');
require('dotenv').config();

async function fixWebhookConfig() {
  console.log('🔧 Corrigindo configuração do webhook na Evolution API...');

  // Configurações da Evolution API
  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';
  
  // Webhook URL correta
  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';

  try {
    console.log(`🔗 Webhook URL: ${webhookUrl}`);
    console.log(`📡 Configurando webhook na Evolution API...`);

    // Configuração correta do webhook
    const webhookConfig = {
      webhook: {
        url: webhookUrl,
        enabled: true,
        events: [
          'MESSAGES_UPSERT'
        ],
        webhook_by_events: false
      }
    };

    console.log('📋 Configuração do webhook:', JSON.stringify(webhookConfig, null, 2));

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
      
      // Tentar formato alternativo
      console.log('\n🔄 Tentando formato alternativo...');
      const altWebhookConfig = {
        url: webhookUrl,
        enabled: true,
        events: [
          'MESSAGES_UPSERT'
        ]
      };

      const altResponse = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(altWebhookConfig)
      });

      console.log(`📊 Status da resposta alternativa: ${altResponse.status} ${altResponse.statusText}`);

      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.log(`❌ Erro alternativo: ${altErrorText}`);
        return;
      }

      const altResult = await altResponse.json();
      console.log(`✅ Webhook configurado com formato alternativo:`, altResult);
    } else {
      const result = await response.json();
      console.log(`✅ Webhook configurado com sucesso:`, result);
    }

    // Verificar se foi configurado
    console.log('\n🔍 Verificando configuração...');
    const checkResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      console.log(`✅ Configuração atual:`, JSON.stringify(checkData, null, 2));
    } else {
      console.log(`❌ Erro ao verificar: ${checkResponse.status}`);
    }

    console.log('\n🎉 WEBHOOK CONFIGURADO!');
    console.log('\n📝 AGORA TESTE:');
    console.log('   1. Envie uma mensagem para o WhatsApp');
    console.log('   2. Verifique os logs do servidor');
    console.log('   3. O agente deve responder automaticamente');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixWebhookConfig();
