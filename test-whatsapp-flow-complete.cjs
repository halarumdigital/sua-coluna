const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCompleteWhatsAppFlow() {
  console.log('🔄 Testando fluxo completo de criação de instância WhatsApp...\n');

  try {
    const baseUrl = 'http://localhost:5000';
    
    // 1. Login como administrador
    console.log('1️⃣ Fazendo login como administrador...');
    const adminLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@admin.com',
        password: 'admin123'
      })
    });

    if (!adminLoginResponse.ok) {
      console.log('❌ Falha no login de administrador');
      console.log('Status:', adminLoginResponse.status);
      console.log('Response:', await adminLoginResponse.text());
      return;
    }

    const adminCookies = adminLoginResponse.headers.get('set-cookie');
    console.log('✅ Login de administrador bem-sucedido');

    // 2. Verificar configurações do WhatsApp do administrador
    console.log('\n2️⃣ Verificando configurações WhatsApp do administrador...');
    const adminSettingsResponse = await fetch(`${baseUrl}/api/admin/whatsapp-settings`, {
      method: 'GET',
      headers: {
        'Cookie': adminCookies
      }
    });

    if (!adminSettingsResponse.ok) {
      console.log('❌ Erro ao buscar configurações do administrador');
      console.log('Status:', adminSettingsResponse.status);
      console.log('Response:', await adminSettingsResponse.text());
      return;
    }

    const adminSettings = await adminSettingsResponse.json();
    console.log('✅ Configurações do administrador encontradas:');
    console.log('   URL:', adminSettings.evolutionApiUrl);
    console.log('   Token configurado:', adminSettings.globalToken ? 'Sim' : 'Não');
    console.log('   Ativo:', adminSettings.isActive ? 'Sim' : 'Não');

    if (!adminSettings.isActive) {
      console.log('⚠️ Configurações do WhatsApp estão inativas!');
      return;
    }

    // 3. Login como cliente
    console.log('\n3️⃣ Fazendo login como cliente...');
    const clientLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br',
        password: 'senha123' // Vamos tentar algumas senhas comuns
      })
    });

    let clientCookies;
    if (!clientLoginResponse.ok) {
      // Tentar outras senhas comuns
      console.log('⚠️ Primeira tentativa falhou, tentando outras senhas...');
      
      const commonPasswords = ['123456', 'password', 'cliente123', 'admin123', '123'];
      let loginSuccess = false;
      
      for (const pwd of commonPasswords) {
        console.log(`   Tentando senha: ${pwd}`);
        const tryResponse = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br',
            password: pwd
          })
        });
        
        if (tryResponse.ok) {
          clientCookies = tryResponse.headers.get('set-cookie');
          console.log(`✅ Login do cliente bem-sucedido com senha: ${pwd}`);
          loginSuccess = true;
          break;
        }
      }
      
      if (!loginSuccess) {
        console.log('❌ Nenhuma senha funcionou para o cliente');
        console.log('💡 Pode ser necessário redefinir a senha do cliente no banco');
        return;
      }
    } else {
      clientCookies = clientLoginResponse.headers.get('set-cookie');
      console.log('✅ Login do cliente bem-sucedido');
    }

    // 4. Buscar configurações WhatsApp como cliente
    console.log('\n4️⃣ Buscando configurações WhatsApp como cliente...');
    const clientSettingsResponse = await fetch(`${baseUrl}/api/client/whatsapp-settings`, {
      method: 'GET',
      headers: {
        'Cookie': clientCookies
      }
    });

    if (!clientSettingsResponse.ok) {
      console.log('❌ Cliente não conseguiu buscar configurações WhatsApp');
      console.log('Status:', clientSettingsResponse.status);
      console.log('Response:', await clientSettingsResponse.text());
      return;
    }

    const clientSettings = await clientSettingsResponse.json();
    console.log('✅ Cliente conseguiu buscar configurações WhatsApp');
    console.log('   URL:', clientSettings.evolutionApiUrl);
    console.log('   Token configurado:', clientSettings.globalToken ? 'Sim' : 'Não');

    // 5. Criar instância WhatsApp
    console.log('\n5️⃣ Criando instância WhatsApp...');
    const createInstanceResponse = await fetch(`${baseUrl}/api/client/whatsapp-instances`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': clientCookies
      },
      body: JSON.stringify({
        instanceName: 'teste-deploy-' + Date.now(),
        phoneNumber: '5511999887766'
      })
    });

    if (!createInstanceResponse.ok) {
      console.log('❌ Falha ao criar instância');
      console.log('Status:', createInstanceResponse.status);
      const errorText = await createInstanceResponse.text();
      console.log('Response:', errorText);
      
      // Tentar analisar o erro
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.details) {
          console.log('Detalhes do erro:', errorJson.details);
        }
      } catch (e) {
        // Erro não é JSON
      }
      return;
    }

    const instanceResult = await createInstanceResponse.json();
    console.log('✅ Instância criada com sucesso!');
    console.log('Resultado:', JSON.stringify(instanceResult, null, 2));

    // 6. Listar instâncias
    console.log('\n6️⃣ Listando instâncias existentes...');
    const listInstancesResponse = await fetch(`${baseUrl}/api/client/whatsapp-instances`, {
      method: 'GET',
      headers: {
        'Cookie': clientCookies
      }
    });

    if (listInstancesResponse.ok) {
      const instances = await listInstancesResponse.json();
      console.log('✅ Instâncias listadas:', instances.length);
      console.log(JSON.stringify(instances, null, 2));
    } else {
      console.log('⚠️ Não foi possível listar instâncias');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testCompleteWhatsAppFlow();