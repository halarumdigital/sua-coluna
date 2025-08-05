const fetch = require('node-fetch');

async function testAuthSession() {
  try {
    console.log('🧪 Testando autenticação e sessão...');

    // 1. Fazer login
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.log('❌ Erro no login:', error);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login realizado:', loginData.user);

    // 2. Verificar sessão do usuário
    console.log('\n👤 Verificando sessão do usuário...');
    const userResponse = await fetch('http://localhost:5000/api/auth/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ Sessão válida:', userData);
    } else {
      const error = await userResponse.text();
      console.log('❌ Erro na sessão:', error);
    }

    // 3. Testar endpoint de conversas
    console.log('\n💬 Testando endpoint de conversas...');
    const conversationsResponse = await fetch('http://localhost:5000/api/client/conversations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();
      console.log('✅ Conversas carregadas:', conversations.length);
      console.log('📊 Dados:', conversations);
    } else {
      const error = await conversationsResponse.text();
      console.log('❌ Erro nas conversas:', error);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Aguardar um pouco para o servidor inicializar
setTimeout(() => {
  testAuthSession();
}, 3000); 