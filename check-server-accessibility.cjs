const fetch = require('node-fetch');

async function checkServerAccessibility() {
  console.log('🔍 Verificando acessibilidade do servidor...');

  const baseUrl = 'https://labs.beaihub.com.br';
  const webhookPath = '/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const fullUrl = baseUrl + webhookPath;

  console.log(`🌐 URL completa: ${fullUrl}`);

  // Teste 1: Verificar se o servidor responde
  try {
    console.log('\n📡 Teste 1: Verificando conectividade básica...');
    const response = await fetch(baseUrl, {
      method: 'GET',
      timeout: 10000
    });
    console.log(`✅ Servidor acessível: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`❌ Servidor não acessível: ${error.message}`);
    return;
  }

  // Teste 2: Verificar se a rota do webhook existe
  try {
    console.log('\n📡 Teste 2: Verificando rota do webhook...');
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Evolution-API-Test'
      },
      body: JSON.stringify({
        event: 'test',
        instance: 'test'
      }),
      timeout: 10000
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      console.log('❌ Rota não encontrada - problema na configuração da rota');
    } else if (response.status >= 200 && response.status < 300) {
      console.log('✅ Rota acessível');
    } else {
      console.log(`⚠️ Resposta inesperada: ${response.status}`);
    }
    
    const responseText = await response.text();
    console.log(`📋 Resposta: ${responseText}`);
    
  } catch (error) {
    console.log(`❌ Erro ao testar webhook: ${error.message}`);
  }

  // Teste 3: Verificar outras rotas da API
  try {
    console.log('\n📡 Teste 3: Verificando outras rotas da API...');
    const testRoutes = [
      '/api/system/settings',
      '/api/auth/user'
    ];
    
    for (const route of testRoutes) {
      try {
        const response = await fetch(baseUrl + route, {
          method: 'GET',
          timeout: 5000
        });
        console.log(`   ${route}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`   ${route}: ❌ ${error.message}`);
      }
    }
  } catch (error) {
    console.log(`❌ Erro nos testes de rota: ${error.message}`);
  }

  // Teste 4: Simular webhook da Evolution API
  try {
    console.log('\n📡 Teste 4: Simulando webhook da Evolution API...');
    
    const evolutionWebhookData = {
      event: 'messages.upsert',
      instance: 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398',
      key: {
        remoteJid: '554999214230@s.whatsapp.net',
        fromMe: false,
        id: '3EB0D3B65EECB2B726E26B'
      },
      pushName: 'Gilliard Damaceno',
      status: 'DELIVERY_ACK',
      message: {
        conversation: 'oi2'
      },
      messageType: 'conversation',
      messageTimestamp: 1755173261
    };

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Evolution-API/2.3.1'
      },
      body: JSON.stringify(evolutionWebhookData),
      timeout: 15000
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    const responseData = await response.text();
    console.log(`📋 Resposta: ${responseData}`);

    if (response.ok) {
      console.log('✅ Webhook simulado funcionou!');
      console.log('💡 O problema pode ser:');
      console.log('   1. Firewall bloqueando a Evolution API');
      console.log('   2. Problema de DNS da Evolution API');
      console.log('   3. Timeout na Evolution API');
    } else {
      console.log('❌ Webhook simulado falhou');
    }

  } catch (error) {
    console.log(`❌ Erro no webhook simulado: ${error.message}`);
  }
}

checkServerAccessibility().catch(console.error);