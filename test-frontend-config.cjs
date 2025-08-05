const fetch = require('node-fetch');

async function testFrontendConfig() {
  try {
    console.log('🔧 Testando configuração via frontend...\n');

    const baseUrl = 'http://localhost:5000';
    
    // Dados exatos que o frontend está enviando
    const configData = {
      rejectCall: true,
      msgCall: "I do not accept calls",
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      syncFullHistory: false,
      readStatus: true
    };

    console.log('📋 Dados que serão enviados pelo frontend:');
    console.log(JSON.stringify(configData, null, 2));
    console.log('\n');

    // 1. Fazer login primeiro
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br', // Email do cliente real
        password: '123456' // Substitua pela senha correta
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Erro no login:', errorText);
      return;
    }

    // Obter cookies de sessão
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado com sucesso');

    // 2. Testar endpoint de configuração
    console.log('\n🚀 Testando endpoint de configuração...');
    const instanceKey = 'deploy1';
    const configUrl = `${baseUrl}/api/client/whatsapp-instances/${instanceKey}/settings`;
    console.log('📍 URL:', configUrl);

    const configResponse = await fetch(configUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(configData)
    });

    console.log('\n📊 Resposta do servidor:');
    console.log('Status:', configResponse.status);
    console.log('Status Text:', configResponse.statusText);

    const responseText = await configResponse.text();
    console.log('Response Body:', responseText);

    if (configResponse.ok) {
      console.log('\n✅ Configuração aplicada com sucesso!');
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Dados da resposta:', JSON.stringify(responseJson, null, 2));
      } catch (e) {
        console.log('Resposta não é JSON válido');
      }
    } else {
      console.log('\n❌ Erro ao aplicar configuração');
      try {
        const errorJson = JSON.parse(responseText);
        console.log('Detalhes do erro:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('Erro não é JSON válido');
      }
    }

  } catch (error) {
    console.error('❌ Erro durante teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Executar teste
testFrontendConfig().then(() => {
  console.log('\n🏁 Teste finalizado');
}).catch(err => {
  console.error('💥 Falha no teste:', err);
});