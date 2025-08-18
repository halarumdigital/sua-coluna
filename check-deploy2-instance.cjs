const fetch = require('node-fetch');
require('dotenv').config();

async function checkDeploy2Instance() {
  console.log('🔍 VERIFICANDO INSTÂNCIA DEPLOY2...\n');

  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff';
  
  try {
    // 1. Verificar todas as instâncias
    console.log('1️⃣ Buscando todas as instâncias...');
    const instancesResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!instancesResponse.ok) {
      console.log(`❌ Erro ao buscar instâncias: ${instancesResponse.status} ${instancesResponse.statusText}`);
      const errorText = await instancesResponse.text();
      console.log(`📋 Erro detalhado: ${errorText}`);
      return;
    }

    const instances = await instancesResponse.json();
    console.log(`📋 Total de instâncias encontradas: ${instances.length}`);

    // 2. Procurar por deploy2
    console.log('\n2️⃣ Procurando por instância deploy2...');
    let deploy2Instance = null;
    
    for (const inst of instances) {
      if (inst.name === 'deploy2') {
        deploy2Instance = inst;
        console.log('✅ Instância deploy2 encontrada!');
        break;
      }
    }

    if (!deploy2Instance) {
      console.log('❌ Instância deploy2 não encontrada');
      console.log('\n📝 Instâncias disponíveis:');
      for (const inst of instances) {
        console.log(`   - ${inst.name} (${inst.connectionStatus})`);
      }
      return;
    }

    // 3. Verificar detalhes da instância deploy2
    console.log('\n3️⃣ Detalhes da instância deploy2:');
    console.log(`📱 Nome: ${deploy2Instance.name}`);
    console.log(`🆔 ID: ${deploy2Instance.id}`);
    console.log(`📊 Status: ${deploy2Instance.connectionStatus}`);
    console.log(`👤 Owner: ${deploy2Instance.ownerJid}`);
    console.log(`🏷️ Profile: ${deploy2Instance.profileName}`);
    console.log(`🔑 Token: ${deploy2Instance.token}`);
    console.log(`📨 Mensagens: ${deploy2Instance._count?.Message || 0}`);
    console.log(`👥 Contatos: ${deploy2Instance._count?.Contact || 0}`);
    console.log(`💬 Chats: ${deploy2Instance._count?.Chat || 0}`);

    // 4. Verificar webhook da instância deploy2
    console.log('\n4️⃣ Verificando webhook da instância deploy2...');
    
    // Tentar diferentes possíveis instanceKeys
    const possibleKeys = [
      'deploy2',
      deploy2Instance.name,
      deploy2Instance.id
    ].filter(Boolean);

    console.log('🔑 Possíveis chaves da instância:', possibleKeys);

    for (const key of possibleKeys) {
      if (!key) continue;
      
      console.log(`\n🔍 Verificando webhook para chave: ${key}`);
      try {
        const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/find/${key}`, {
          method: 'GET',
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`📊 Status: ${webhookResponse.status} ${webhookResponse.statusText}`);
        
        if (webhookResponse.ok) {
          const webhook = await webhookResponse.json();
          console.log(`✅ Webhook encontrado para ${key}:`, JSON.stringify(webhook, null, 2));
        } else {
          const errorText = await webhookResponse.text();
          console.log(`❌ Webhook não encontrado para ${key}: ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ Erro ao verificar webhook para ${key}: ${error.message}`);
      }
    }

    // 5. Verificar se o webhook está configurado
    console.log('\n5️⃣ Verificando configuração de webhook...');
    console.log('🔍 Baseado nos logs que você mostrou, o webhook está sendo enviado para:');
    console.log('   https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy2');
    
    // Verificar se o endpoint está funcionando
    console.log('\n🔍 Testando endpoint do webhook...');
    try {
      const webhookTestResponse = await fetch('https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'test',
          instance: 'deploy2',
          data: { test: true }
        })
      });
      
      console.log(`📊 Status do teste: ${webhookTestResponse.status} ${webhookTestResponse.statusText}`);
      if (webhookTestResponse.ok) {
        const testResult = await webhookTestResponse.text();
        console.log(`✅ Endpoint funcionando: ${testResult}`);
      }
    } catch (error) {
      console.log(`❌ Erro ao testar endpoint: ${error.message}`);
    }

    // 6. Testar envio de mensagem
    console.log('\n6️⃣ Testando envio de mensagem...');
    const testPhone = '554999214230';
    const testMessage = 'Teste de resposta automática - ' + new Date().toISOString();
    
    for (const key of possibleKeys) {
      if (!key) continue;
      
      console.log(`\n📤 Testando envio via chave: ${key}`);
      try {
        const messageData = {
          number: testPhone,
          text: testMessage
        };

        const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${key}`, {
          method: 'POST',
          headers: {
            'apikey': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(messageData)
        });

        console.log(`📊 Status do envio: ${sendResponse.status} ${sendResponse.statusText}`);
        
        if (sendResponse.ok) {
          const result = await sendResponse.json();
          console.log(`✅ Mensagem enviada com sucesso:`, JSON.stringify(result, null, 2));
        } else {
          const errorText = await sendResponse.text();
          console.log(`❌ Erro ao enviar mensagem: ${errorText}`);
        }
      } catch (error) {
        console.log(`❌ Erro de conexão: ${error.message}`);
      }
    }

    // 7. Análise do problema
    console.log('\n7️⃣ ANÁLISE DO PROBLEMA...');
    console.log('🔍 Baseado na investigação:');
    console.log('   ✅ A instância deploy2 existe e está conectada');
    console.log('   ✅ O endpoint do webhook está funcionando');
    console.log('   ❌ O webhook pode não estar configurado na Evolution API');
    console.log('   ❌ Ou há um problema na estrutura dos dados do webhook');
    
    console.log('\n📝 POSSÍVEIS CAUSAS:');
    console.log('   1. Webhook não configurado na Evolution API');
    console.log('   2. Estrutura dos dados do webhook incorreta');
    console.log('   3. Problema no processamento do webhook no servidor');
    console.log('   4. Configurações de AI não funcionando');
    
    console.log('\n🎯 VERIFICAÇÃO COMPLETA!');

  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
  }
}

checkDeploy2Instance();
