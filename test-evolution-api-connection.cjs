const fetch = require('node-fetch');

async function testEvolutionApiConnection() {
  console.log('🔍 Testando conexão com a Evolution API...\n');

  try {
    // 1. Login como administrador para pegar as configurações
    console.log('1️⃣ Fazendo login como administrador...');
    
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
      }),
    });

    if (!loginResponse.ok) {
      console.log('❌ Falha no login do administrador');
      return;
    }

    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('✅ Login realizado com sucesso\n');

    // 2. Buscar configurações do WhatsApp
    console.log('2️⃣ Buscando configurações do WhatsApp...');
    
    const settingsResponse = await fetch('http://localhost:5000/api/admin/whatsapp-settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': setCookieHeader
      },
    });

    if (!settingsResponse.ok) {
      console.log('❌ Falha ao buscar configurações do WhatsApp');
      return;
    }

    const settings = await settingsResponse.json();
    console.log('✅ Configurações encontradas:');
    console.log(`   URL: ${settings.evolutionApiUrl}`);
    console.log(`   Token: ${settings.globalToken ? '***' : 'Não configurado'}`);
    console.log(`   Ativo: ${settings.isActive}\n`);

    // 3. Testar diferentes endpoints da Evolution API
    const endpoints = [
      { path: '/', method: 'GET', description: 'Status da API' },
      { path: '/instance/fetchInstances', method: 'GET', description: 'Listar instâncias' },
      { path: '/instance/connectionState', method: 'GET', description: 'Estado da conexão' },
      { path: '/instance/info', method: 'GET', description: 'Informações da API' }
    ];

    for (const endpoint of endpoints) {
      console.log(`3️⃣ Testando ${endpoint.description}...`);
      console.log(`   URL: ${settings.evolutionApiUrl}${endpoint.path}`);
      
      try {
        const response = await fetch(`${settings.evolutionApiUrl}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Authorization': `Bearer ${settings.globalToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Sucesso: ${JSON.stringify(data, null, 2)}`);
        } else {
          const errorText = await response.text();
          console.log(`   ❌ Erro: ${errorText}`);
        }
        console.log('');
      } catch (error) {
        console.log(`   ❌ Erro de conexão: ${error.message}`);
        console.log('');
      }
    }

    // 4. Testar sem token para ver se a API responde
    console.log('4️⃣ Testando API sem token...');
    try {
      const response = await fetch(`${settings.evolutionApiUrl}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`   Status: ${response.status}`);
      const data = await response.text();
      console.log(`   Resposta: ${data}`);
      console.log('');
    } catch (error) {
      console.log(`   ❌ Erro de conexão: ${error.message}`);
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }

  console.log('🏁 Teste concluído!');
}

testEvolutionApiConnection().catch(console.error); 