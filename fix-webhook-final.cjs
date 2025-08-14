const fetch = require('node-fetch');
require('dotenv').config();

async function fixWebhookFinal() {
  console.log('🔧 CORREÇÃO FINAL DO WEBHOOK: Resolvendo erro "instance requires property webhook"...\n');

  // Configurações da Evolution API
  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';
  
  // Webhook URL correta
  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';

  try {
    console.log(`🔗 Webhook URL: ${webhookUrl}`);
    console.log(`📡 Corrigindo webhook na Evolution API...\n`);

    // 1. Primeiro, verificar o status atual
    console.log('1️⃣ Verificando status atual do webhook...');
    const checkResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const currentWebhook = await checkResponse.json();
      console.log('   📋 Webhook atual:', JSON.stringify(currentWebhook, null, 2));
    } else {
      console.log('   ❌ Erro ao verificar webhook atual');
    }

    // 2. Configuração CORRETA do webhook (formato que a Evolution API espera)
    console.log('\n2️⃣ Configurando webhook com formato correto...');
    const webhookConfig = {
      webhook: {
        url: webhookUrl,
        enabled: true,
        events: [
          'MESSAGES_UPSERT'
        ],
        webhook_by_events: false,
        webhook_base64: true
      }
    };

    console.log('   📋 Configuração:', JSON.stringify(webhookConfig, null, 2));

    // 3. Aplicar configuração
    const response = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });

    console.log(`\n3️⃣ Resposta da Evolution API:`);
    console.log(`   📊 Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ Erro: ${errorText}`);
      
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

      console.log(`   📊 Status alternativo: ${altResponse.status} ${altResponse.statusText}`);

      if (!altResponse.ok) {
        const altErrorText = await altResponse.text();
        console.log(`   ❌ Erro alternativo: ${altErrorText}`);
        return;
      }

      const altResult = await altResponse.json();
      console.log(`   ✅ Webhook configurado com formato alternativo:`, altResult);
    } else {
      const result = await response.json();
      console.log(`   ✅ Webhook configurado com sucesso:`, result);
    }

    // 4. Verificação final
    console.log('\n4️⃣ Verificação final...');
    const finalCheckResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (finalCheckResponse.ok) {
      const finalWebhook = await finalCheckResponse.json();
      console.log(`   ✅ Webhook final configurado:`, JSON.stringify(finalWebhook, null, 2));
    } else {
      console.log(`   ❌ Erro na verificação final: ${finalCheckResponse.status}`);
    }

    // 5. Teste do webhook
    console.log('\n5️⃣ Testando webhook...');
    const testWebhookData = {
      event: 'messages.upsert',
      instance: instanceKey,
      data: {
        messages: [
          {
            key: {
              remoteJid: '554999214230@s.whatsapp.net',
              fromMe: false,
              id: 'test_msg_' + Date.now()
            },
            message: {
              conversation: 'Teste de webhook corrigido'
            },
            messageTimestamp: Math.floor(Date.now() / 1000),
            messageType: 'conversation'
          }
        ]
      }
    };

    try {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testWebhookData)
      });

      console.log(`   📊 Teste do webhook: ${testResponse.status} ${testResponse.statusText}`);
      
      if (testResponse.ok) {
        const testResult = await testResponse.json();
        console.log(`   ✅ Webhook funcionando:`, testResult);
      } else {
        const testError = await testResponse.text();
        console.log(`   ❌ Erro no teste: ${testError}`);
      }
    } catch (testError) {
      console.log(`   ❌ Erro ao testar webhook: ${testError.message}`);
    }

    console.log('\n🎉 CORREÇÃO COMPLETA!');
    console.log('\n📝 AGORA TESTE:');
    console.log('   1. Envie uma mensagem para o WhatsApp');
    console.log('   2. O agente deve responder automaticamente');
    console.log('   3. Verifique os logs do servidor');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

fixWebhookFinal();
