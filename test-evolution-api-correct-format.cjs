const fetch = require('node-fetch');

async function testEvolutionApiCorrectFormat() {
  console.log('🔍 Testando Evolution API com formato correto...\n');

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

    // 3. Testar diferentes formatos de autenticação
    const authFormats = [
      { 
        name: 'Bearer Token',
        headers: {
          'Authorization': `Bearer ${settings.globalToken}`,
          'Content-Type': 'application/json'
        }
      },
      { 
        name: 'API Key Header',
        headers: {
          'apikey': settings.globalToken,
          'Content-Type': 'application/json'
        }
      },
      { 
        name: 'X-API-Key',
        headers: {
          'X-API-Key': settings.globalToken,
          'Content-Type': 'application/json'
        }
      },
      { 
        name: 'Query Parameter',
        headers: {
          'Content-Type': 'application/json'
        },
        urlSuffix: `?apikey=${settings.globalToken}`
      }
    ];

    for (const format of authFormats) {
      console.log(`3️⃣ Testando formato: ${format.name}...`);
      
      try {
        const url = format.urlSuffix 
          ? `${settings.evolutionApiUrl}/instance/fetchInstances${format.urlSuffix}`
          : `${settings.evolutionApiUrl}/instance/fetchInstances`;
          
        const response = await fetch(url, {
          method: 'GET',
          headers: format.headers
        });

        console.log(`   URL: ${url}`);
        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Sucesso: ${JSON.stringify(data, null, 2)}`);
          console.log(`   🎉 Formato correto encontrado: ${format.name}`);
          return;
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

    // 4. Testar criação de instância com diferentes formatos
    console.log('4️⃣ Testando criação de instância com diferentes formatos...');
    
    const instanceData = {
      instanceName: 'test-instance-' + Date.now(),
      phoneNumber: '5511999999999',
      webhook: 'http://localhost:5000/api/client/whatsapp-webhook',
      webhookByEvents: true,
      events: ['connection.update', 'messages.upsert', 'messages.update', 'messages.delete']
    };

    for (const format of authFormats) {
      console.log(`   Testando criação com: ${format.name}...`);
      
      try {
        const url = format.urlSuffix 
          ? `${settings.evolutionApiUrl}/instance/create${format.urlSuffix}`
          : `${settings.evolutionApiUrl}/instance/create`;
          
        const response = await fetch(url, {
          method: 'POST',
          headers: format.headers,
          body: JSON.stringify(instanceData)
        });

        console.log(`   Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`   ✅ Sucesso na criação: ${JSON.stringify(data, null, 2)}`);
          console.log(`   🎉 Formato correto para criação: ${format.name}`);
          return;
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

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }

  console.log('🏁 Teste concluído!');
}

testEvolutionApiCorrectFormat().catch(console.error); 