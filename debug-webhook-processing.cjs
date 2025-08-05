const http = require('http');

async function debugWebhookProcessing() {
  console.log('🐛 Debug: Testando processamento completo do webhook...');
  
  // Testar com dados reais dos logs que você mostrou
  const realMessageData = {
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
        conversation: 'oi debug teste',
        messageContextInfo: {} 
      },
      messageType: 'conversation',
      messageTimestamp: Math.floor(Date.now() / 1000),
      instanceId: '35994e44-07db-4bc3-8a62-e3362d2e5823',
      source: 'web'
    }
  };
  
  const postData = JSON.stringify(realMessageData);
  
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/client/whatsapp-webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 15000
  };
  
  console.log('📱 Testando com dados reais do Evolution API...');
  console.log(`   Estrutura: ${JSON.stringify(realMessageData, null, 2).substring(0, 300)}...`);
  
  return new Promise((resolve) => {
    const req = http.request(options, (res) => {
      console.log(`\n✅ Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('📊 Resposta:', data);
        
        // Aguardar um pouco e verificar se logs de IA foram criados
        setTimeout(async () => {
          console.log('\n🔍 Verificando se IA foi processada...');
          try {
            const { exec } = require('child_process');
            exec('node monitor-ai-activity.cjs', (error, stdout, stderr) => {
              if (error) {
                console.log('❌ Erro ao verificar logs:', error.message);
              } else {
                console.log('\n📋 Resultado do processamento:');
                console.log(stdout);
              }
              resolve(true);
            });
          } catch (e) {
            console.log('⚠️  Não foi possível verificar logs:', e.message);
            resolve(true);
          }
        }, 5000);
      });
    });
    
    req.on('error', (error) => {
      console.log('\n❌ Erro na requisição:', error.message);
      resolve(false);
    });
    
    req.on('timeout', () => {
      console.log('\n⏰ Timeout na requisição');
      req.destroy();
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

debugWebhookProcessing().catch(console.error);