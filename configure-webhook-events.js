// Configure webhook to receive message events
import fetch from 'node-fetch';
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

// Disable SSL verification
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

const agent = new https.Agent({
  rejectUnauthorized: false
});

async function configureWebhookEvents() {
  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '94eff8b9da7b6c86e50b5c43334f6f69'; // From your logs
  const instanceKey = 'halarum-principal';  // Usando a instância correta
  const webhookUrl = 'https://suacoluna.gilliard.dev.br/api/franchise/whatsapp-webhook/halarum-principal';

  console.log('🔧 Configurando webhook para receber eventos de mensagem e chat...\n');

  try {
    // Configure webhook with all message and chat events
    const webhookConfig = {
      webhook: {
        enabled: true,
        url: webhookUrl,
        events: [
          'MESSAGES_UPSERT'  // Apenas MESSAGES_UPSERT para evitar webhooks duplicados
        ],
        webhookByEvents: true,
        webhookBase64: true  // IMPORTANTE: true para incluir base64 de áudios/imagens no webhook
      }
    };

    console.log('📋 Configuração do webhook:');
    console.log(JSON.stringify(webhookConfig, null, 2));

    const response = await fetch(`${evolutionApiUrl}/webhook/set/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig),
      agent
    });

    console.log(`\n📊 Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const result = await response.text();
      console.log('✅ Webhook configurado com sucesso:');
      console.log(result);
    } else {
      const error = await response.text();
      console.log('❌ Erro ao configurar webhook:');
      console.log(error);
    }

    // Verify the configuration
    console.log('\n🔍 Verificando configuração...');
    const verifyResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      method: 'GET',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      agent
    });

    if (verifyResponse.ok) {
      const config = await verifyResponse.json();
      console.log('📋 Configuração atual do webhook:');
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log('❌ Não foi possível verificar a configuração');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

configureWebhookEvents().catch(console.error);
