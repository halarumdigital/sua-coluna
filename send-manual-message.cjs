const fetch = require('node-fetch');
require('dotenv').config();

async function sendManualMessage() {
  console.log('📱 Enviando mensagem manual para testar resposta automática...');

  // Configurações da Evolution API (baseadas no que vimos nos logs)
  const evolutionApiUrl = 'https://evoapilabs.beaihub.com.br';
  const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
  const apiKey = '25cab27e8bdeb30090a423f0c03844ff'; // Do log da Evolution API
  
  // Número para enviar (pode ser o seu próprio número para teste)
  const phoneNumber = '554999214230'; // Número que apareceu no log
  const message = 'Teste de resposta automática - ' + new Date().toLocaleTimeString();

  try {
    console.log(`📤 Enviando mensagem para: ${phoneNumber}`);
    console.log(`📋 Mensagem: ${message}`);
    console.log(`🔗 URL: ${evolutionApiUrl}/message/sendText/${instanceKey}`);

    const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: phoneNumber,
        text: message
      })
    });

    console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ Erro: ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`✅ Mensagem enviada com sucesso:`, result);
    
    console.log('\n⏳ Aguardando resposta automática...');
    console.log('💡 Monitore os logs do servidor para ver:');
    console.log('   1. Webhook sendo recebido');
    console.log('   2. Processamento da mensagem');
    console.log('   3. Geração da resposta com IA');
    console.log('   4. Envio da resposta automática');
    
    console.log('\n📱 Se tudo estiver funcionando, você deve receber uma resposta automática do agente "Secretáriaaaaa"');

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error.message);
  }
}

sendManualMessage().catch(console.error);