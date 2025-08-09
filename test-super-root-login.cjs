const axios = require('axios');

async function testSuperRootLogin() {
  try {
    console.log('🔐 Testando login do Super Root...');

    // Fazer login
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'superroot@sistema.com',
      password: 'superroot123'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Login realizado com sucesso!');
    console.log('Status:', loginResponse.status);
    console.log('Data:', loginResponse.data);

    // Verificar se o usuário está autenticado
    const userResponse = await axios.get('http://localhost:5000/api/auth/user', {
      withCredentials: true,
      headers: {
        'Cookie': loginResponse.headers['set-cookie']?.join('; ') || ''
      }
    });

    console.log('\n👤 Dados do usuário:');
    console.log('Status:', userResponse.status);
    console.log('User:', userResponse.data);

    // Testar acesso às rotas do super root
    const plansResponse = await axios.get('http://localhost:5000/api/super-root/plans', {
      withCredentials: true,
      headers: {
        'Cookie': loginResponse.headers['set-cookie']?.join('; ') || ''
      }
    });

    console.log('\n📦 Planos disponíveis:');
    console.log('Status:', plansResponse.status);
    console.log('Plans:', plansResponse.data);

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testSuperRootLogin();