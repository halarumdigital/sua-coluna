const http = require('http');

async function testWebhookDirect() {
  console.log('🧪 Testando webhook diretamente com mensagem simulada...');
  
  // Dados da mensagem baseados nos logs que você mostrou
  const messageData = {
    event: 'messages.upsert',
    instance: 'deploy1',
    data: {
      key: {
        remoteJid: '554999214230@s.whatsapp.net',
        fromMe: false,
        id: '3EB0F2A1621CEE8553A0B9',
        senderLid: '67065981456567@lid'
      },
      pushName: 'Gilliard Damaceno',
      status: 'DELIVERY_ACK',
      message: { 
        conversation: 'oi teste agente',
        messageContextInfo: {} 
      },
      contextInfo: undefined,
      messageType: 'conversation',
      messageTimestamp: Math.floor(Date.now() / 1000),
      instanceId: '35994e44-07db-4bc3-8a62-e3362d2e5823',
      source: 'web'
    },
    server_url: 'https://apizap.halarum.com.br',
    date_time: new Date().toISOString(),
    sender: '554991016846@s.whatsapp.net',
    apikey: '74DCEF06-5FAE-4B1E-B090-F023D3CC9798'
  };
  
  const postData = JSON.stringify(messageData);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/whatsapp-webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 10000
  };
  
  console.log('📱 Enviando mensagem simulada para o webhook...');
  console.log(`   Evento: ${messageData.event}`);
  console.log(`   Instância: ${messageData.instance}`);
  console.log(`   Texto: ${messageData.data.message.conversation}`);
  console.log(`   De: ${messageData.data.key.remoteJid}`);
  
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`\n✅ Webhook respondeu com status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📊 Resposta do webhook:', data);
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log('\n❌ Erro ao chamar webhook:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('\n⏰ Timeout na chamada do webhook');
      req.destroy();
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

async function runTest() {
  const success = await testWebhookDirect();
  
  if (success) {
    console.log('\n🎯 Teste concluído!');
    console.log('💡 Agora verifique:');
    console.log('   1. Se há logs no console do servidor');
    console.log('   2. Se a mensagem foi processada');
    console.log('   3. Se o agente tentou responder');
    
    // Aguardar um pouco e verificar logs de AI
    console.log('\n⏰ Aguardando 3 segundos para verificar logs...');
    setTimeout(async () => {
      try {
        const { exec } = require('child_process');
        exec('node monitor-ai-activity.cjs', (error, stdout, stderr) => {
          if (error) {
            console.log('❌ Erro ao verificar logs:', error.message);
          } else {
            console.log('\n📋 Status da atividade de IA:');
            console.log(stdout);
          }
        });
      } catch (e) {
        console.log('⚠️  Não foi possível verificar logs automaticamente');
      }
    }, 3000);
  } else {
    console.log('\n❌ Falha no teste do webhook');
  }
}

runTest().catch(console.error);