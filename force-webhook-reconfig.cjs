const fetch = require('node-fetch');
require('dotenv').config();

async function forceWebhookReconfig() {
  console.log('🔧 FORÇANDO RECONFIGURAÇÃO COMPLETA DO WEBHOOK...\n');

  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';
  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';

  try {
    console.log('1️⃣ Verificando status atual da instância...');
    const instanceResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (instanceResponse.ok) {
      const instances = await instanceResponse.json();
      const deploy1Instance = instances.find(inst => inst.instance.instanceName === 'deploy1');
      if (deploy1Instance) {
        console.log(`   ✅ Instância deploy1 encontrada`);
        console.log(`   📱 Status: ${deploy1Instance.instance.status}`);
        console.log(`   🔗 Webhook: ${deploy1Instance.instance.webhook || 'Não configurado'}`);
      } else {
        console.log('   ❌ Instância deploy1 não encontrada');
      }
    }

    console.log('\n2️⃣ Removendo webhook atual...');
    try {
      const deleteResponse = await fetch(`${evolutionApiUrl}/webhook/del/${instanceKey}`, {
        method: 'DELETE',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (deleteResponse.ok) {
        console.log('   ✅ Webhook removido com sucesso');
      } else {
        console.log('   ℹ️ Webhook não existia ou já foi removido');
      }
    } catch (deleteError) {
      console.log('   ℹ️ Erro ao remover webhook (pode não existir):', deleteError.message);
    }

    console.log('\n3️⃣ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n4️⃣ Configurando novo webhook...');
    
    // Tentar múltiplos formatos de configuração
    const webhookConfigs = [
      {
        name: 'Formato 1 - Estrutura completa',
        config: {
          webhook: {
            url: webhookUrl,
            enabled: true,
            events: ['MESSAGES_UPSERT'],
            webhook_by_events: false,
            webhook_base64: true
          }
        }
      },
      {
        name: 'Formato 2 - Estrutura simples',
        config: {
          url: webhookUrl,
          enabled: true,
          events: ['MESSAGES_UPSERT']
        }
      },
      {
        name: 'Formato 3 - Apenas URL e eventos',
        config: {
          url: webhookUrl,
          events: ['MESSAGES_UPSERT']
        }
      }
    ];

    let webhookConfigured = false;
    
    for (const webhookConfig of webhookConfigs) {
      if (webhookConfigured) break;
      
      console.log(`   🔄 Tentando: ${webhookConfig.name}`);
      console.log(`   📋 Configuração:`, JSON.stringify(webhookConfig.config, null, 2));
      
      try {
        const response = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
          method: 'POST',
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(webhookConfig.config)
        });

        console.log(`   📊 Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Webhook configurado com sucesso usando ${webhookConfig.name}:`, result);
          webhookConfigured = true;
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Erro: ${errorText}`);
        }
      } catch (error) {
        console.log(`   ❌ Erro de conexão: ${error.message}`);
      }
      
      if (!webhookConfigured) {
        console.log('   ⏳ Aguardando 2 segundos antes da próxima tentativa...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!webhookConfigured) {
      console.log('\n❌ Nenhum formato de webhook funcionou!');
      return;
    }

    console.log('\n5️⃣ Verificação final...');
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

    console.log('\n6️⃣ Testando webhook...');
    const testWebhookData = {
      event: 'messages.upsert',
      instance: instanceKey,
      data: {
        messages: [{
          key: {
            remoteJid: '554999214230@s.whatsapp.net',
            fromMe: false,
            id: 'force_reconfig_test_' + Date.now()
          },
          message: {
            conversation: 'Teste após reconfiguração forçada'
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          messageType: 'conversation'
        }]
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

    console.log('\n🎉 RECONFIGURAÇÃO COMPLETA!');
    console.log('\n📝 AGORA TESTE:');
    console.log('   1. Envie uma nova mensagem para o WhatsApp');
    console.log('   2. O agente deve responder automaticamente');
    console.log('   3. Se não funcionar, verifique os logs da Evolution API');

  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

forceWebhookReconfig();
