const fetch = require('node-fetch');

async function testInstanceCreation() {
  console.log('🧪 Testando criação de instância do WhatsApp...\n');

  try {
    // 1. Login como administrador
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

    // 3. Testar criação de instância diretamente na Evolution API
    console.log('3️⃣ Testando criação de instância na Evolution API...');
    
    const instanceData = {
      instanceName: 'test-instance-' + Date.now(),
      phoneNumber: '5511999999999',
      webhook: 'http://localhost:5000/api/client/whatsapp-webhook',
      webhookByEvents: true,
      events: ['connection.update', 'messages.upsert', 'messages.update', 'messages.delete']
    };

    console.log('📤 Enviando requisição para:', `${settings.evolutionApiUrl}/instance/create`);
    console.log('📋 Dados:', JSON.stringify(instanceData, null, 2));

    const createResponse = await fetch(`${settings.evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.globalToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(instanceData)
    });

    if (createResponse.ok) {
      const result = await createResponse.json();
      console.log('✅ Instância criada com sucesso na Evolution API!');
      console.log('📋 Resposta:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await createResponse.text();
      console.log('❌ Falha ao criar instância na Evolution API');
      console.log(`   Status: ${createResponse.status}`);
      console.log(`   Resposta: ${errorText}`);
      
      // Tentar parsear como JSON se possível
      try {
        const errorJson = JSON.parse(errorText);
        console.log('📋 Erro detalhado:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('📋 Erro como texto:', errorText);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }

  console.log('\n🏁 Teste concluído!');
}

testInstanceCreation().catch(console.error); 