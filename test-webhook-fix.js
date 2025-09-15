// Test script to verify webhook fix
import fetch from 'node-fetch';
import https from 'https';

// Disable SSL verification
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function testWebhookFix() {
  console.log('🧪 Testing webhook fix...\n');

  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '94eff8b9da7b6c86e50b5c43334f6f69';
  const instanceKey = 'deploy-gilliard';

  try {
    // 1. Check current webhook configuration
    console.log('🔍 Checking current webhook configuration...');
    const configResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      agent
    });

    if (configResponse.ok) {
      const config = await configResponse.json();
      console.log('📋 Current webhook configuration:');
      console.log(JSON.stringify(config, null, 2));
      
      // Check if our events are configured
      const expectedEvents = [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'SEND_MESSAGE',
        'CHATS_UPSERT',
        'CHATS_UPDATE',
        'CHATS_SET'
      ];
      
      const configuredEvents = config.webhook?.events || [];
      const missingEvents = expectedEvents.filter(event => !configuredEvents.includes(event));
      
      if (missingEvents.length === 0) {
        console.log('✅ All required events are configured!');
      } else {
        console.log('❌ Missing events:', missingEvents);
        console.log('🔧 Running configuration script...');
        
        // Run the configuration script
        const { exec } = require('child_process');
        exec('node configure-webhook-events.js', (error, stdout, stderr) => {
          if (error) {
            console.error('❌ Error running configuration script:', error);
            return;
          }
          console.log('📝 Configuration script output:');
          console.log(stdout);
          if (stderr) {
            console.log('⚠️ Configuration script errors:');
            console.log(stderr);
          }
        });
      }
    } else {
      console.log('❌ Failed to get webhook configuration');
    }

    // 2. Check instance status
    console.log('\n🔍 Checking instance status...');
    const statusResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      agent
    });

    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('📋 Instance status:', JSON.stringify(status, null, 2));
      
      const connectionState = status.instance?.state || status.state;
      if (connectionState === 'open') {
        console.log('✅ Instance is connected!');
      } else {
        console.log(`⚠️ Instance is not connected (state: ${connectionState})`);
      }
    } else {
      console.log('❌ Failed to get instance status');
    }

    // 3. Test webhook endpoint
    console.log('\n🔍 Testing webhook endpoint...');
    const webhookUrl = 'https://suacoluna.gilliard.dev.br/api/franchise/whatsapp-webhook/deploy-gilliard';
    
    const testWebhookData = {
      event: 'chats.update',
      data: {
        chats: [{
          id: '5541999999999@s.whatsapp.net',
          remoteJid: '5541999999999@s.whatsapp.net',
          messages: [{
            key: {
              remoteJid: '5541999999999@s.whatsapp.net',
              fromMe: false,
              id: 'test-message-123'
            },
            message: {
              conversation: 'Test message for webhook'
            },
            messageTimestamp: Math.floor(Date.now() / 1000)
          }]
        }]
      }
    };

    console.log('📋 Sending test webhook data:');
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
    console.log('1. ✅ Webhook configuration checked');
    console.log('2. ✅ Instance status checked');
    console.log('3. ✅ Webhook endpoint tested');
    console.log('\n📝 Next Steps:');
    console.log('1. Send a real WhatsApp message to the instance');
    console.log('2. Check the server logs for webhook processing');
    console.log('3. Verify that the AI agent responds automatically');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

testWebhookFix().catch(console.error);
