const fetch = require('node-fetch');
require('dotenv').config();

console.log('🔍 MONITORANDO WEBHOOK EM TEMPO REAL');
console.log('====================================');
console.log('📱 Envie uma mensagem para 5549991016846 para testar');
console.log('⏰ Aguardando webhooks...\n');

// Função para simular um webhook de mensagem
async function simulateMessage() {
  console.log('🧪 Simulando mensagem de teste...');
  
  const webhookData = {
    event: 'messages.upsert',
    instance: 'deploy1',
    data: {
      key: {
        remoteJid: '554999214230@s.whatsapp.net',
        fromMe: false,
        id: 'TEST_MESSAGE_' + Date.now()
      },
      message: {
        conversation: 'Olá, preciso de ajuda com dores na coluna'
      },
      messageType: 'conversation',
      messageTimestamp: Math.floor(Date.now() / 1000),
      pushName: 'Teste Usuario'
    }
  };

  try {
    const response = await fetch('http://localhost:5000/api/client/whatsapp-webhook/deploy1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    const result = await response.text();
    console.log(`📊 Status: ${response.status}`);
    console.log(`📋 Resposta: ${result}`);
    
    if (response.ok) {
      console.log('✅ Webhook processado com sucesso!');
    } else {
      console.log('❌ Erro no webhook');
    }
  } catch (error) {
    console.error('❌ Erro ao chamar webhook:', error.message);
  }
}

// Verificar configurações primeiro
async function checkConfigurations() {
  console.log('🔍 Verificando configurações...');
  
  try {
    const response = await fetch('http://localhost:5000/api/system/settings', {
      credentials: 'include'
    });
    
    if (response.ok) {
      console.log('✅ Servidor local respondendo');
    } else {
      console.log('❌ Problema com servidor local');
    }
  } catch (error) {
    console.log('❌ Servidor local não está respondendo:', error.message);
    return false;
  }
  
  return true;
}

async function main() {
  const serverOk = await checkConfigurations();
  
  if (!serverOk) {
    console.log('\n💡 Execute "npm run dev" em outra janela para iniciar o servidor');
    return;
  }
  
  console.log('\n🧪 Testando webhook com mensagem simulada...\n');
  await simulateMessage();
  
  console.log('\n📱 Agora envie uma mensagem REAL para 5549991016846');
  console.log('⏰ Monitorando por 60 segundos...');
  
  // Monitorar por 60 segundos
  let count = 0;
  const interval = setInterval(() => {
    count++;
    process.stdout.write(`\r⏱️  Aguardando... ${count}s`);
    
    if (count >= 60) {
      clearInterval(interval);
      console.log('\n\n⏰ Tempo limite atingido');
      console.log('💡 Se não houve atividade, verifique:');
      console.log('   1. Se o webhook está configurado corretamente na Evolution API');
      console.log('   2. Se mensagens estão chegando como "messages.upsert"');
      console.log('   3. Se o agente está processando as mensagens');
    }
  }, 1000);
}

main().catch(console.error);