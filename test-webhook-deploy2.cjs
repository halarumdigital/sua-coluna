const fetch = require('node-fetch');

async function testWebhookDeploy2() {
  console.log('🧪 TESTANDO WEBHOOK DEPLOY2...\n');

  const webhookUrl = 'https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy2';
  
  // Dados exatos que a Evolution API está enviando (baseado nos logs)
  const webhookData = {
    "event": "messages.upsert",
    "instance": "deploy2",
    "data": [
      {
        "key": {
          "remoteJid": "554999214230@s.whatsapp.net",
          "fromMe": false,
          "id": "3F4CDAFAB0E7F7FE8405",
          "senderLid": "67065981456567@lid",
          "senderPn": undefined,
          "participant": undefined,
          "participantPn": undefined,
          "participantLid": undefined
        },
        "pushName": "Gilliard Damaceno",
        "status": "DELIVERY_ACK",
        "message": {
          "messageContextInfo": {
            "deviceListMetadata": [],
            "deviceListMetadataVersion": 2
          },
          "conversation": "oi"
        },
        "contextInfo": {
          "mentionedJid": [],
          "groupMentions": [],
          "expiration": 0,
          "ephemeralSettingTimestamp": { "low": 0, "high": 0, "unsigned": false },
          "disappearingMode": { "initiator": 0 }
        },
        "messageType": "conversation",
        "messageTimestamp": 1755216814,
        "instanceId": "7226638b-9c5d-446a-8c78-06c7fb95d680",
        "source": "desktop"
      }
    ],
    "destination": "https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy2",
    "date_time": "2025-08-14T21:13:35.053Z",
    "sender": "554991016846@s.whatsapp.net",
    "server_url": "https://evoapilabs.beaihub.com.br",
    "apikey": "25cab27e8bdeb30090a423f0c03844ff"
  };

  console.log('📋 Dados do webhook sendo enviados:');
  console.log(JSON.stringify(webhookData, null, 2));

  try {
    console.log('\n📤 Enviando webhook para:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Evolution-API-Test'
      },
      body: JSON.stringify(webhookData)
    });

    console.log(`📊 Status da resposta: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`✅ Resposta do servidor: ${responseText}`);
      
      try {
        const responseJson = JSON.parse(responseText);
        console.log(`📋 Resposta JSON:`, JSON.stringify(responseJson, null, 2));
      } catch (parseError) {
        console.log(`📝 Resposta não é JSON válido: ${responseText}`);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Erro do servidor: ${errorText}`);
    }

    // Aguardar um pouco para ver se há logs
    console.log('\n⏳ Aguardando 5 segundos para verificar logs...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Testar também com uma estrutura alternativa
    console.log('\n🔄 Testando estrutura alternativa...');
    const alternativeData = {
      "event": "messages.upsert",
      "instance": "deploy2",
      "data": {
        "messages": [
          {
            "key": {
              "remoteJid": "554999214230@s.whatsapp.net",
              "fromMe": false,
              "id": "TEST_" + Date.now()
            },
            "message": {
              "conversation": "teste alternativo"
            },
            "messageType": "conversation",
            "messageTimestamp": Math.floor(Date.now() / 1000)
          }
        ]
      }
    };

    const altResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(alternativeData)
    });

    console.log(`📊 Status da resposta alternativa: ${altResponse.status} ${altResponse.statusText}`);
    if (altResponse.ok) {
      const altResponseText = await altResponse.text();
      console.log(`✅ Resposta alternativa: ${altResponseText}`);
    }

  } catch (error) {
    console.error('❌ Erro ao testar webhook:', error);
  }

  console.log('\n🎯 TESTE COMPLETO!');
  console.log('\n📝 PRÓXIMOS PASSOS:');
  console.log('   1. Verifique os logs do servidor para erros');
  console.log('   2. Confirme se a instância deploy2 existe no banco');
  console.log('   3. Verifique se as configurações de AI estão ativas');
  console.log('   4. Teste o envio manual de uma mensagem');
}

testWebhookDeploy2();

