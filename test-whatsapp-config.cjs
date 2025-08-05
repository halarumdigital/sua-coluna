const fetch = require('node-fetch');

async function testWhatsAppConfig() {
  try {
    console.log('🔧 Testando configuração do WhatsApp...\n');

    // Configurações de teste
    const baseUrl = 'http://localhost:5000';
    const instanceKey = 'deploy1'; // Substitua pela sua instanceKey real
    const settings = {
      rejectCall: true,
      msgCall: "I do not accept calls",
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      syncFullHistory: false,
      readStatus: true
    };

    console.log('📋 Dados que serão enviados:');
    console.log(JSON.stringify(settings, null, 2));
    console.log('\n');

    // Fazer login primeiro (usar um usuário de teste)
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'teste@teste.com', // Use um email válido
        password: '123456' // Use uma senha válida
      })
    });

    if (!loginResponse.ok) {
      console.error('❌ Erro no login:', await loginResponse.text());
      return;
    }

    // Obter cookies de sessão
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado com sucesso');

    // Testar endpoint de configuração
    console.log('\n🚀 Testando endpoint de configuração...');
    const configUrl = `${baseUrl}/api/client/whatsapp-instances/${instanceKey}/settings`;
    console.log('📍 URL:', configUrl);

    const configResponse = await fetch(configUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(settings)
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
testWhatsAppConfig().then(() => {
  console.log('\n🏁 Teste finalizado');
}).catch(err => {
  console.error('💥 Falha no teste:', err);
});