const http = require('http');

async function testServerStatus() {
  console.log('🔍 Verificando se o servidor está rodando...');
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };
  
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`✅ Servidor respondeu com status: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📊 Resposta:', data);
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Servidor não está rodando ou não acessível');
      console.log('🔧 Erro:', error.message);
      console.log('💡 Execute "npm run dev" para iniciar o servidor');
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('⏰ Timeout - servidor pode estar sobrecarregado');
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Testar também o webhook específico
async function testWebhookEndpoint() {
  console.log('\n🔗 Testando endpoint do webhook...');
  
  const options = {
    hostname: 'localhost', 
    port: 5000,
    path: '/api/client/whatsapp-webhook/deploy1',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 5000
  };
  
  const testData = JSON.stringify({
    event: 'messages.upsert',
    instance: 'deploy1',
    data: {
      key: {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
        id: 'TEST_MESSAGE'
      },
      message: { conversation: 'teste' },
      messageType: 'conversation'
    }
  });
  
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`✅ Webhook respondeu com status: ${res.statusCode}`);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📊 Resposta do webhook:', data);
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Webhook não acessível');
      console.log('🔧 Erro:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('⏰ Timeout no webhook');
      req.destroy();
      resolve(false);
    });
    
    req.write(testData);
    req.end();
  });
}

async function runTests() {
  const serverRunning = await testServerStatus();
  
  if (serverRunning) {
    await testWebhookEndpoint();
  }
  
  console.log('\n📋 Próximos passos:');
  if (!serverRunning) {
    console.log('1. Execute: npm run dev');
    console.log('2. Aguarde o servidor iniciar');
    console.log('3. Teste novamente enviando mensagem no WhatsApp');
  } else {
    console.log('1. Servidor está rodando ✅');
    console.log('2. Verifique logs do servidor por erros');
    console.log('3. Teste enviar uma mensagem no WhatsApp');
  }
}

runTests().catch(console.error);