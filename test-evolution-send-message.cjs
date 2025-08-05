require('dotenv').config();
const fetch = require('node-fetch');

async function testEvolutionSendMessage() {
  console.log('🧪 Testando envio direto via Evolution API...');
  
  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798';
  const instanceKey = 'deploy1';
  const phoneNumber = '554999214230'; // Número sem @s.whatsapp.net
  
  const messageData = {
    number: phoneNumber,
    text: 'Teste direto da Evolution API via script'
  };

  console.log('📋 Dados da requisição:');
  console.log(`   URL: ${evolutionApiUrl}/message/sendText/${instanceKey}`);
  console.log(`   Token: ${globalToken.substring(0, 20)}...`);
  console.log(`   Dados:`, messageData);

  try {
    const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    console.log(`📊 Status da resposta: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log('✅ Sucesso! Resposta:', result);
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error.message);
  }
}

testEvolutionSendMessage().catch(console.error);