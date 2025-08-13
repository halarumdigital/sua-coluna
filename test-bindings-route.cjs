const fetch = require('node-fetch');

async function testBindingsRoute() {
  console.log('🔍 Testando rota da API de vinculações...');
  
  try {
    // Simular uma requisição para a rota
    const response = await fetch('http://localhost:3001/api/admin/whatsapp-instance-agent-bindings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'session=test' // Simular cookie de sessão
      }
    });

    console.log('📊 Status da resposta:', response.status);
    console.log('📊 Headers:', response.headers.raw());

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Dados recebidos:', JSON.stringify(data, null, 2));
      console.log('📊 Total de vinculações:', data.length);
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na resposta:', errorText);
    }

  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testBindingsRoute();

