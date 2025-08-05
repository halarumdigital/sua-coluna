const fetch = require('node-fetch');

async function testWhatsAppInstanceCreation() {
  console.log('🧪 Testando criação de instância do WhatsApp...\n');

  try {
         // Test 1: Simular login de administrador
     console.log('1️⃣ Simulando login de administrador...');
     
     const adminLoginResponse = await fetch('http://localhost:5000/api/auth/login', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
               body: JSON.stringify({
          email: 'admin@admin.com',
          password: 'admin123'
        }),
     });

     let adminCookies = '';
     if (adminLoginResponse.ok) {
       const setCookieHeader = adminLoginResponse.headers.get('set-cookie');
       if (setCookieHeader) {
         adminCookies = setCookieHeader;
       }
       console.log('✅ Login de administrador realizado com sucesso\n');
     } else {
       console.log('❌ Falha no login de administrador\n');
       return;
     }

     // Test 2: Verificar se as configurações do administrador estão disponíveis
     console.log('2️⃣ Verificando configurações do administrador...');
     
     const adminSettingsResponse = await fetch('http://localhost:5000/api/admin/whatsapp-settings', {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
         'Cookie': adminCookies
       },
     });

    if (adminSettingsResponse.ok) {
      const adminSettings = await adminSettingsResponse.json();
      console.log('✅ Configurações do administrador encontradas:');
      console.log(`   URL: ${adminSettings.evolutionApiUrl}`);
      console.log(`   Token: ${adminSettings.globalToken ? '***' : 'Não configurado'}`);
      console.log(`   Ativo: ${adminSettings.isActive}\n`);
    } else {
      console.log('❌ Configurações do administrador não encontradas\n');
      return;
    }

         // Test 3: Simular login de cliente
     console.log('3️⃣ Simulando login de cliente...');
    
               const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'client@example.com',
        password: 'password123'
      }),
    });

    let cookies = '';
    if (loginResponse.ok) {
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        cookies = setCookieHeader;
      }
      console.log('✅ Login simulado com sucesso\n');
    } else {
      console.log('❌ Falha no login simulado\n');
      return;
    }

         // Test 4: Testar criação de instância
     console.log('4️⃣ Testando criação de instância...');
    
               const createInstanceResponse = await fetch('http://localhost:5000/api/client/whatsapp-instances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify({
        instanceName: 'test-instance',
        phoneNumber: '5511999999999'
      }),
    });

    if (createInstanceResponse.ok) {
      const result = await createInstanceResponse.json();
      console.log('✅ Instância criada com sucesso:');
      console.log(`   Nome: ${result.instance.instanceName}`);
      console.log(`   Telefone: ${result.instance.phoneNumber}`);
      console.log(`   Status: ${result.instance.status}\n`);
    } else {
      const error = await createInstanceResponse.json();
      console.log('❌ Falha ao criar instância:');
      console.log(`   Erro: ${error.message}`);
      if (error.details) {
        console.log(`   Detalhes: ${JSON.stringify(error.details, null, 2)}`);
      }
      console.log('');
    }

         // Test 5: Verificar instâncias existentes
     console.log('5️⃣ Verificando instâncias existentes...');
    
               const instancesResponse = await fetch('http://localhost:5000/api/client/whatsapp-instances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
    });

    if (instancesResponse.ok) {
      const instances = await instancesResponse.json();
      console.log(`✅ ${instances.length} instância(s) encontrada(s)\n`);
    } else {
      console.log('❌ Falha ao buscar instâncias\n');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }

  console.log('🏁 Teste concluído!');
}

// Executar o teste
testWhatsAppInstanceCreation().catch(console.error); 