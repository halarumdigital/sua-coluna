const fetch = require('node-fetch');

async function testClientLogin() {
  try {
    console.log('🔐 Testando login do cliente...');
    
    // Dados do cliente encontrado
    const loginData = {
      email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br',
      password: '123456' // Senha padrão, pode precisar ser ajustada
    };
    
    console.log('📤 Enviando requisição de login...');
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });
    
    const result = await response.json();
    console.log('📥 Resposta do servidor:', result);
    
    if (response.ok) {
      console.log('✅ Login realizado com sucesso!');
      console.log('👤 Usuário:', result.user);
      
      // Testar acessar o perfil do cliente
      console.log('\n🔍 Testando acesso ao perfil do cliente...');
      const profileResponse = await fetch('http://localhost:5000/api/client/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': response.headers.get('set-cookie') || ''
        }
      });
      
      const profileResult = await profileResponse.json();
      console.log('📥 Resposta do perfil:', profileResult);
      
    } else {
      console.log('❌ Falha no login:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testClientLogin(); 