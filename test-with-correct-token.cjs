const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testWithCorrectToken() {
  console.log('🧪 Testando com o token correto do banco...\n');

  try {
    const apiUrl = 'https://apizap.halarum.com.br';
    const correctToken = '94eff8b9da7b6c86e50b5c43334f6f69';
    
    console.log('🔧 Usando configurações do banco:');
    console.log('   URL:', apiUrl);
    console.log('   Token:', correctToken.substring(0, 10) + '...');
    
    // Testar criação de instância
    console.log('\n🚀 Testando criação de instância...');
    
    const instanceName = `deploy-test-${Date.now()}`;
    console.log('   Nome da instância:', instanceName);
    
    const requestBody = {
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    };
    
    console.log('   Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${apiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'apikey': correctToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('   Status:', response.status);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('   Resposta completa:', responseText);
    
    if (response.ok) {
      console.log('\n✅ SUCESSO! Instância criada com sucesso!');
      
      try {
        const responseJson = JSON.parse(responseText);
        console.log('   Dados da instância:', JSON.stringify(responseJson, null, 2));
      } catch (e) {
        console.log('   Resposta não é JSON válido');
      }
    } else {
      console.log('\n❌ Falha na criação da instância');
      
      try {
        const errorJson = JSON.parse(responseText);
        console.log('   Erro detalhado:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('   Erro (texto):', responseText);
      }
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWithCorrectToken();