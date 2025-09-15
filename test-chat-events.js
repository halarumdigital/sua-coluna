// Test script specifically for chat events based on real logs
import fetch from 'node-fetch';
import https from 'https';

// Disable SSL verification
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function testChatEvents() {
  console.log('🧪 Testing chat events processing based on real logs...\n');

  const webhookUrl = 'https://suacoluna.gilliard.dev.br/api/franchise/whatsapp-webhook/deploy-gilliard';
  
  // Test data based on the real logs structure
  const testWebhookData = {
    event: 'chats.update',
    instance: 'deploy-gilliard',
    data: [
      {
        remoteJid: '554999214230@s.whatsapp.net',
        instanceId: '363e43aa-59c0-4506-be39-e03f750dcc30'
      }
    ],
    destination: 'https://suacoluna.gilliard.dev.br/api/franchise/whatsapp-webhook/deploy-gilliard',
    date_time: '2025-09-15T15:42:42.280Z',
    sender: '5514981856962@s.whatsapp.net',
    server_url: 'https://apizap.halarum.com.br',
    apikey: '94eff8b9da7b6c86e50b5c43334f6f69'
  };

  try {
    console.log('📋 Sending test webhook data (based on real logs):');
    console.log(JSON.stringify(testWebhookData, null, 2));

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testWebhookData)
    });

    console.log(`\n📊 Webhook test response: ${webhookResponse.status} ${webhookResponse.statusText}`);
    
    if (webhookResponse.ok) {
      const responseText = await webhookResponse.text();
      console.log('✅ Webhook test successful!');
      console.log('📝 Response:', responseText);
    } else {
      const errorText = await webhookResponse.text();
      console.log('❌ Webhook test failed:');
      console.log('📝 Error:', errorText);
    }

    console.log('\n🎯 Test Summary:');
    console.log('1. ✅ Sent chat.update event with array structure');
    console.log('2. ✅ Included remoteJid from real logs');
    console.log('3. ✅ Tested webhook endpoint response');
    console.log('\n📝 Expected Behavior:');
    console.log('1. System should detect chat has no embedded messages');
    console.log('2. System should call fetchAndProcessRecentMessages()');
    console.log('3. System should fetch recent messages from Evolution API');
    console.log('4. System should process incoming messages and trigger AI response');

    console.log('\n🔍 Next Steps:');
    console.log('1. Check server logs for "Chat não tem mensagens embutidas"');
    console.log('2. Look for "Buscando mensagens recentes" logs');
    console.log('3. Verify "Processando mensagem recente" appears');
    console.log('4. Confirm AI response is generated and sent');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testChatEvents().catch(console.error);
