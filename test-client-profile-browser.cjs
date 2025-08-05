const fetch = require('node-fetch');

async function testClientProfileInBrowser() {
  try {
    console.log('🌐 Testando API do perfil do cliente...');
    
    // Primeiro fazer login
    const loginData = {
      email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br',
      password: '123456'
    };
    
    console.log('📤 Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData),
      credentials: 'include'
    });
    
    const loginResult = await loginResponse.json();
    console.log('📥 Resultado do login:', loginResult);
    
    if (loginResponse.ok) {
      console.log('✅ Login realizado com sucesso!');
      
      // Pegar os cookies da sessão
      const cookies = loginResponse.headers.get('set-cookie');
      console.log('🍪 Cookies:', cookies);
      
      // Testar acessar o perfil do cliente
      console.log('\n🔍 Testando acesso ao perfil do cliente...');
      const profileResponse = await fetch('http://localhost:5000/api/client/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies || ''
        },
        credentials: 'include'
      });
      
      console.log('📊 Status da resposta:', profileResponse.status);
      console.log('📋 Headers da resposta:', Object.fromEntries(profileResponse.headers.entries()));
      
      const profileResult = await profileResponse.json();
      console.log('📥 Resposta do perfil:', JSON.stringify(profileResult, null, 2));
      
    } else {
      console.log('❌ Falha no login:', loginResult.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testClientProfileInBrowser(); 