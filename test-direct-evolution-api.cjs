const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDirectEvolutionAPI() {
  console.log('🧪 Testando Evolution API diretamente...\n');

  try {
    // Configurações conhecidas
    const apiUrl = 'https://apizap.halarum.com.br';
    const token = 'B6D711FCDE4D4FD5936544120E713976'; // Token que você informou
    
    console.log('🔧 Configurações:');
    console.log('   URL:', apiUrl);
    console.log('   Token:', token.substring(0, 10) + '...');
    
    // 1. Testar endpoint básico da API (se houver)
    console.log('\n1️⃣ Testando conectividade com a API...');
    try {
      const pingResponse = await fetch(`${apiUrl}/`, {
        method: 'GET',
        headers: {
          'apikey': token
        }
      });
      console.log('   Status:', pingResponse.status);
      console.log('   Headers:', Object.fromEntries(pingResponse.headers.entries()));
    } catch (error) {
      console.log('   Erro na conectividade:', error.message);
    }

    // 2. Testar criação de instância com diferentes formatos
    console.log('\n2️⃣ Testando criação de instância...');
    
    const instanceName = `teste-${Date.now()}`;
    console.log('   Nome da instância:', instanceName);
    
    const requestBody = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };
    
    console.log('   Body da requisição:', JSON.stringify(requestBody, null, 2));
    
    const createResponse = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('   Status da resposta:', createResponse.status);
    console.log('   Headers da resposta:', Object.fromEntries(createResponse.headers.entries()));
    
    const responseText = await createResponse.text();
    console.log('   Resposta (texto):', responseText);
    
    if (createResponse.ok) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('   Resposta (JSON):', JSON.stringify(responseJson, null, 2));
      } catch (e) {
        console.log('   Resposta não é JSON válido');
      }
    } else {
      console.log('   ❌ Falha na criação da instância');
      
      // Tentar analisar o erro
      try {
        const errorJson = JSON.parse(responseText);
        console.log('   Erro detalhado:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('   Erro não é JSON:', responseText);
      }
    }

    // 3. Testar com outros headers se necessário
    console.log('\n3️⃣ Testando com Authorization header (como alternativa)...');
    
    const createResponse2 = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        instanceName: `teste-bearer-${Date.now()}`,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    });
    
    console.log('   Status com Bearer:', createResponse2.status);
    const response2Text = await createResponse2.text();
    console.log('   Resposta com Bearer:', response2Text);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testDirectEvolutionAPI();