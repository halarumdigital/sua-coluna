const fetch = require('node-fetch');
require('dotenv').config();

async function debugWebhookDelivery() {
  console.log('🔍 DEBUGANDO ENTREGA DO WEBHOOK: Verificando por que não está chegando...\n');

  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  
  try {
    console.log('1️⃣ Testando conectividade com o servidor...');
    
    // Teste básico de conectividade
    try {
      const pingResponse = await fetch('https://labs.beaihub.com.br', {
        method: 'GET',
        timeout: 10000
      });
      console.log(`   ✅ Servidor acessível: ${pingResponse.status} ${pingResponse.statusText}`);
    } catch (pingError) {
      console.log(`   ❌ Servidor não acessível: ${pingError.message}`);
      return;
    }

    console.log('\n2️⃣ Testando endpoint específico do webhook...');
    
    // Teste do endpoint específico
    try {
      const webhookTestResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Evolution-API-Webhook-Test'
        },
        body: JSON.stringify({
          event: 'messages.upsert',
          instance: 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398',
          data: {
            messages: [{
              key: {
                remoteJid: '554999214230@s.whatsapp.net',
                fromMe: false,
                id: 'debug_test_' + Date.now()
              },
              message: {
                conversation: 'Teste de debug - mensagem não está chegando'
              },
              messageTimestamp: Math.floor(Date.now() / 1000),
              messageType: 'conversation'
            }]
          }
        }),
        timeout: 15000
      });

      console.log(`   📊 Resposta do webhook: ${webhookTestResponse.status} ${webhookTestResponse.statusText}`);
      
      if (webhookTestResponse.ok) {
        const result = await webhookTestResponse.json();
        console.log(`   ✅ Webhook funcionando! Resposta:`, result);
      } else {
        const errorText = await webhookTestResponse.text();
        console.log(`   ❌ Erro no webhook: ${errorText}`);
      }
    } catch (webhookError) {
      console.log(`   ❌ Erro ao testar webhook: ${webhookError.message}`);
      
      if (webhookError.code === 'ECONNREFUSED') {
        console.log('   🔍 Possível problema: Servidor recusando conexão');
      } else if (webhookError.code === 'ETIMEDOUT') {
        console.log('   🔍 Possível problema: Timeout na conexão');
      } else if (webhookError.code === 'ENOTFOUND') {
        console.log('   🔍 Possível problema: DNS não resolve o domínio');
      }
    }

    console.log('\n3️⃣ Verificando logs do servidor...');
    console.log('   📝 Verifique se há erros nos logs do servidor em:');
    console.log('      - Console onde o servidor está rodando');
    console.log('      - Logs de erro do servidor');
    console.log('      - Logs de acesso (se configurado)');

    console.log('\n4️⃣ Possíveis causas do problema:');
    console.log('   🔴 Servidor não está rodando');
    console.log('   🔴 Porta incorreta ou bloqueada');
    console.log('   🔴 Firewall bloqueando conexões');
    console.log('   🔴 Erro no código do servidor');
    console.log('   🔴 Problema de DNS');
    console.log('   🔴 SSL/TLS configurado incorretamente');

    console.log('\n5️⃣ Próximos passos para debug:');
    console.log('   1. Verifique se o servidor está rodando');
    console.log('   2. Teste localmente: curl -X POST http://localhost:3000/api/client/whatsapp-webhook/...');
    console.log('   3. Verifique logs do servidor');
    console.log('   4. Teste conectividade de rede');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

debugWebhookDelivery();
