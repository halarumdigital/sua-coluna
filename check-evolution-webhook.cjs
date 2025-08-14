const fetch = require('node-fetch');
require('dotenv').config();

async function checkEvolutionWebhook() {
  console.log('🔍 Verificando configuração do webhook na Evolution API...');

  try {
    // Usar as configurações do banco de dados
    const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
    const apiKey = '25cab27e8bdeb30090a423f0c03844ff'; // Do log da Evolution API
    const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';

    console.log(`🔗 Evolution API URL: ${evolutionApiUrl}`);
    console.log(`🔑 API Key: ${apiKey.substring(0, 10)}...`);
    console.log(`📱 Instance Key: ${instanceKey}`);

    // 1. Verificar status da instância
    console.log('\n1️⃣ Verificando status da instância...');
    const statusResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log(`✅ Status da instância:`, statusData);
    } else {
      console.log(`❌ Erro ao verificar status: ${statusResponse.status}`);
    }

    // 2. Verificar configuração do webhook
    console.log('\n2️⃣ Verificando configuração do webhook...');
    const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      console.log(`✅ Configuração do webhook:`, JSON.stringify(webhookData, null, 2));
      
      // Verificar se o webhook está configurado corretamente
      const expectedWebhook = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
      
      if (webhookData.webhook && webhookData.webhook.url === expectedWebhook) {
        console.log('✅ Webhook configurado corretamente!');
      } else {
        console.log('❌ Webhook não está configurado corretamente');
        console.log(`   Esperado: ${expectedWebhook}`);
        console.log(`   Atual: ${webhookData.webhook?.url || 'Não configurado'}`);
      }
    } else {
      console.log(`❌ Erro ao verificar webhook: ${webhookResponse.status}`);
      const errorText = await webhookResponse.text();
      console.log(`   Erro: ${errorText}`);
    }

    // 3. Tentar configurar o webhook (se necessário)
    console.log('\n3️⃣ Configurando webhook...');
    const webhookConfig = {
      url: 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398',
      events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'MESSAGES_DELETE'],
      webhook_by_events: false
    };

    const setWebhookResponse = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });

    if (setWebhookResponse.ok) {
      const setWebhookData = await setWebhookResponse.json();
      console.log(`✅ Webhook configurado:`, setWebhookData);
    } else {
      console.log(`❌ Erro ao configurar webhook: ${setWebhookResponse.status}`);
      const errorText = await setWebhookResponse.text();
      console.log(`   Erro: ${errorText}`);
    }

    // 4. Testar conectividade do webhook
    console.log('\n4️⃣ Testando conectividade do webhook...');
    const testUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
    
    try {
      const testResponse = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-API-Test'
        },
        body: JSON.stringify({
          event: 'test',
          instance: instanceKey,
          test: true
        })
      });

      console.log(`📊 Teste de conectividade: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.ok) {
        console.log('✅ Servidor está acessível da Evolution API');
      } else {
        console.log('❌ Servidor não está acessível ou retornou erro');
      }
    } catch (error) {
      console.log('❌ Erro de conectividade:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkEvolutionWebhook().catch(console.error);