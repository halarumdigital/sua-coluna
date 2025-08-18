const fetch = require('node-fetch');
require('dotenv').config();

async function debugAgentResponse() {
  console.log('🔍 DIAGNÓSTICO: Por que o agente não está respondendo?\n');

  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';
  
  try {
    // 1. Verificar instâncias disponíveis
    console.log('1️⃣ Verificando instâncias disponíveis...');
    const instancesResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    let instances = [];
    if (instancesResponse.ok) {
      instances = await instancesResponse.json();
      console.log('   📋 Instâncias encontradas:');
      
      for (const inst of instances) {
        if (inst.instance) {
          console.log(`   📱 ${inst.instance.instanceName}:`);
          console.log(`      - Status: ${inst.instance.status}`);
          console.log(`      - Instance Key: ${inst.instance.instance.instanceName}`);
          console.log(`      - Webhook: ${inst.instance.webhook || 'Não configurado'}`);
          console.log(`      - Webhook Events: ${inst.instance.webhookEvents || 'N/A'}`);
          console.log(`      - Webhook Enabled: ${inst.instance.webhookEnabled || 'N/A'}`);
          console.log('');
        }
      }
    } else {
      console.log('   ❌ Erro ao buscar instâncias:', instancesResponse.status);
    }

    // 2. Verificar webhooks configurados
    console.log('2️⃣ Verificando webhooks configurados...');
    for (const inst of instances) {
      if (inst.instance && inst.instance.instance.instanceName) {
        const instanceName = inst.instance.instance.instanceName;
        console.log(`   🔍 Verificando webhook para ${instanceName}...`);
        
        try {
          const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceName}`, {
            method: 'GET',
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (webhookResponse.ok) {
            const webhook = await webhookResponse.json();
            console.log(`      ✅ Webhook encontrado:`, JSON.stringify(webhook, null, 2));
          } else {
            console.log(`      ❌ Webhook não encontrado para ${instanceName}`);
          }
        } catch (error) {
          console.log(`      ❌ Erro ao verificar webhook: ${error.message}`);
        }
      }
    }

    // 3. Testar endpoint do servidor
    console.log('\n3️⃣ Testando endpoint do servidor...');
    const testUrls = [
      'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1',
      'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy2'
    ];
    
    for (const url of testUrls) {
      console.log(`   🔍 Testando: ${url}`);
      try {
        const testResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event: 'test',
            instance: 'test',
            data: { test: true }
          })
        });
        
        console.log(`      📊 Status: ${testResponse.status} ${testResponse.statusText}`);
        if (testResponse.ok) {
          const testResult = await testResponse.text();
          console.log(`      ✅ Resposta: ${testResult.substring(0, 200)}...`);
        }
      } catch (error) {
        console.log(`      ❌ Erro: ${error.message}`);
      }
    }

    // 4. Verificar logs do servidor
    console.log('\n4️⃣ Verificando logs do servidor...');
    console.log('   📝 Verifique se há erros nos logs do servidor:');
    console.log('      - Erros de conexão com banco de dados');
    console.log('      - Erros ao processar webhook');
    console.log('      - Erros ao enviar mensagem via WhatsApp');
    console.log('      - Problemas com configurações de AI');

    // 5. Verificar configurações de AI
    console.log('\n5️⃣ Verificando configurações de AI...');
    console.log('   🧠 Verifique se:');
    console.log('      - API key do ChatGPT está configurada');
    console.log('      - Configurações de AI estão ativas');
    console.log('      - Serviço OpenAI está funcionando');

    // 6. Verificar instância específica deploy2
    console.log('\n6️⃣ Verificando instância deploy2 especificamente...');
    try {
      const deploy2Response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (deploy2Response.ok) {
        const instances = await deploy2Response.json();
        const deploy2 = instances.find(inst => 
          inst.instance && inst.instance.instanceName === 'deploy2'
        );
        
        if (deploy2) {
          console.log('   ✅ Instância deploy2 encontrada:');
          console.log(`      - Status: ${deploy2.instance.status}`);
          console.log(`      - Webhook: ${deploy2.instance.webhook || 'Não configurado'}`);
          console.log(`      - Webhook Events: ${deploy2.instance.webhookEvents || 'N/A'}`);
          
          // Verificar webhook específico
          const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/find/deploy2`, {
            method: 'GET',
            headers: {
              'apikey': apiKey,
              'Content-Type': 'application/json'
            }
          });
          
          if (webhookResponse.ok) {
            const webhook = await webhookResponse.json();
            console.log(`      - Webhook Config:`, JSON.stringify(webhook, null, 2));
          } else {
            console.log(`      - ❌ Webhook não configurado para deploy2`);
          }
        } else {
          console.log('   ❌ Instância deploy2 não encontrada');
        }
      }
    } catch (error) {
      console.log(`   ❌ Erro ao verificar deploy2: ${error.message}`);
    }

    console.log('\n🎯 DIAGNÓSTICO COMPLETO!');
    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('   1. Verifique se o webhook está configurado corretamente na Evolution API');
    console.log('   2. Confirme se o endpoint do servidor está acessível');
    console.log('   3. Verifique os logs do servidor para erros');
    console.log('   4. Teste o envio de uma mensagem manual');
    console.log('   5. Verifique se as configurações de AI estão corretas');

  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error);
  }
}

debugAgentResponse();
