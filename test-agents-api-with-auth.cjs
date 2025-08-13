const fetch = require('node-fetch');
require('dotenv').config();

async function testAgentsAPIWithAuth() {
  console.log('🔍 Testando API de agentes WhatsApp com autenticação...');

  try {
    // First, login to get session
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'producao@nataliaefranciscotelasltda.com.br',
        password: 'senha123'
      })
    });

    console.log('📊 Login status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      console.log('❌ Falha no login');
      const loginText = await loginResponse.text();
      console.log('Login response:', loginText);
      return;
    }

    // Get cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Cookies recebidos:', cookies ? 'Sim' : 'Não');

    // Now test the agents API with authentication
    const agentsResponse = await fetch('http://localhost:5000/api/admin/whatsapp-agents', {
      method: 'GET',
      headers: {
        'Cookie': cookies || '',
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status da resposta de agentes:', agentsResponse.status);
    console.log('📊 Status text:', agentsResponse.statusText);

    const responseText = await agentsResponse.text();
    console.log('📄 Resposta completa:', responseText.substring(0, 500));

    if (agentsResponse.ok) {
      try {
        const agents = JSON.parse(responseText);
        console.log('✅ Agentes encontrados:', agents.length);
        console.log('🤖 Primeiro agente:', agents[0] || 'Nenhum');
      } catch (parseError) {
        console.log('❌ Erro ao fazer parse do JSON:', parseError.message);
      }
    } else {
      console.log('❌ Erro na requisição:', agentsResponse.status, responseText);
    }

  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

// Run the test
testAgentsAPIWithAuth().catch(console.error);