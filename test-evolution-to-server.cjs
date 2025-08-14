const fetch = require('node-fetch');
require('dotenv').config();

async function testEvolutionToServer() {
  console.log('🔍 TESTANDO CONECTIVIDADE: Evolution API → Seu Servidor\n');

  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  
  try {
    console.log('1️⃣ Testando conectividade básica...');
    
    // Teste 1: GET simples para verificar se o servidor responde
    try {
      const pingResponse = await fetch('https://labs.beaihub.com.br', {
        method: 'GET',
        timeout: 10000
      });
      console.log(`   ✅ Servidor acessível via GET: ${pingResponse.status} ${pingResponse.statusText}`);
    } catch (pingError) {
      console.log(`   ❌ Servidor não acessível via GET: ${pingError.message}`);
      return;
    }

    console.log('\n2️⃣ Testando endpoint específico do webhook...');
    
    // Teste 2: POST para o endpoint específico (simulando Evolution API)
    const evolutionWebhookData = {
      event: 'messages.upsert',
      instance: 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398',
      data: {
        messages: [{
          key: {
            remoteJid: '554999214230@s.whatsapp.net',
            fromMe: false,
            id: 'evolution_test_' + Date.now()
          },
          message: {
            conversation: 'Teste de conectividade Evolution API → Servidor'
          },
          messageTimestamp: Math.floor(Date.now() / 1000),
          messageType: 'conversation'
        }]
      }
    };

    try {
      console.log(`   📤 Enviando webhook para: ${webhookUrl}`);
      console.log(`   📋 Dados:`, JSON.stringify(evolutionWebhookData, null, 2));
      
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-API-Webhook-Test'
        },
        body: JSON.stringify(evolutionWebhookData),
        timeout: 15000
      });

      console.log(`   📊 Resposta: ${webhookResponse.status} ${webhookResponse.statusText}`);
      
      if (webhookResponse.ok) {
        const result = await webhookResponse.json();
        console.log(`   ✅ Webhook funcionando! Resposta:`, result);
      } else {
        const errorText = await webhookResponse.text();
        console.log(`   ❌ Erro no webhook: ${errorText}`);
      }
    } catch (webhookError) {
      console.log(`   ❌ Erro ao testar webhook: ${webhookError.message}`);
      
      if (webhookError.code === 'ECONNREFUSED') {
        console.log('   🔍 Problema: Servidor recusando conexão');
      } else if (webhookError.code === 'ETIMEDOUT') {
        console.log('   🔍 Problema: Timeout na conexão');
      } else if (webhookError.code === 'ENOTFOUND') {
        console.log('   🔍 Problema: DNS não resolve o domínio');
      } else if (webhookError.code === 'ECONNRESET') {
        console.log('   🔍 Problema: Conexão resetada pelo servidor');
      }
    }

    console.log('\n3️⃣ Testando com diferentes User-Agents...');
    
    // Teste 3: Tentar com User-Agent da Evolution API
    const userAgents = [
      'Evolution-API/2.3.1',
      'Mozilla/5.0 (Evolution-API)',
      'Evolution-API-Webhook',
      'WhatsApp-Webhook'
    ];

    for (const userAgent of userAgents) {
      try {
        console.log(`   🔄 Testando com User-Agent: ${userAgent}`);
        
        const uaResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent
          },
          body: JSON.stringify(evolutionWebhookData),
          timeout: 10000
        });

        console.log(`      📊 Status: ${uaResponse.status} ${uaResponse.statusText}`);
        
        if (uaResponse.ok) {
          const uaResult = await uaResponse.json();
          console.log(`      ✅ Funcionou com User-Agent: ${userAgent}`);
          break;
        }
      } catch (uaError) {
        console.log(`      ❌ Erro com User-Agent ${userAgent}: ${uaError.message}`);
      }
    }

    console.log('\n4️⃣ Análise do problema...');
    console.log('   🔍 Se o webhook funciona nos testes mas não da Evolution API:');
    console.log('      • Pode ser bloqueio por User-Agent');
    console.log('      • Pode ser bloqueio por IP da Evolution API');
    console.log('      • Pode ser problema de firewall');
    console.log('      • Pode ser problema de roteamento');
    
    console.log('\n   🔍 Se o webhook não funciona nos testes:');
    console.log('      • Problema no servidor');
    console.log('      • Rota não configurada');
    console.log('      • Middleware bloqueando');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

testEvolutionToServer();
