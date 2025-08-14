const fetch = require('node-fetch');

async function testLogs() {
  console.log('🔍 Testando se os logs do servidor estão funcionando...');

  const testUrl = 'https://labs.beaihub.com.br/api/test-webhook-logs';
  
  try {
    const response = await fetch(testUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: 'log test',
        timestamp: new Date().toISOString()
      })
    });

    console.log(`📊 Status: ${response.status}`);
    const responseData = await response.json();
    console.log(`📋 Resposta:`, responseData);

    if (response.ok) {
      console.log('✅ Endpoint de teste funcionou!');
      console.log('💡 Agora verifique os logs do servidor para ver se apareceu:');
      console.log('   🚨 TEST WEBHOOK ENDPOINT HIT!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testLogs().catch(console.error);