const fetch = require('node-fetch');
require('dotenv').config();

async function fixWebhookEvents() {
  console.log('🔧 Reconfigurando eventos do webhook...');
  
  try {
    // Configuração do webhook com TODOS os eventos necessários
    const webhookConfig = {
      webhook: {
        enabled: true,
        url: 'https://suacoluna.gilliard.dev.br/api/client/whatsapp-webhook/deploy1',
        headers: {
          'Content-Type': 'application/json'
        },
        webhookByEvents: true,  // IMPORTANTE: Ativar webhook por eventos
        webhookBase64: false,   // Não precisa de base64 para texto
        events: [
          'MESSAGES_UPSERT',     // Mensagens recebidas - PRINCIPAL
          'MESSAGES_UPDATE',     // Atualizações de mensagens
          'MESSAGES_DELETE',     // Mensagens deletadas
          'SEND_MESSAGE',        // Mensagens enviadas
          'CONNECTION_UPDATE',   // Atualizações de conexão
          'CONTACTS_UPDATE',     // Atualizações de contatos
          'GROUPS_UPSERT',       // Grupos criados/atualizados
          'GROUP_UPDATE',        // Atualizações de grupos
          'GROUP_PARTICIPANTS_UPDATE', // Participantes de grupo
          'PRESENCE_UPDATE',     // Status de presença
          'CHATS_SET',          // Configuração de chats
          'CHATS_UPSERT',       // Chats criados/atualizados
          'CHATS_UPDATE',       // Atualizações de chats
          'CHATS_DELETE',       // Chats deletados
          'CALL'                // Chamadas
        ]
      }
    };

    console.log('📋 Configuração do webhook:');
    console.log('   URL:', webhookConfig.webhook.url);
    console.log('   Eventos:', webhookConfig.webhook.events.length);
    console.log('   Por eventos:', webhookConfig.webhook.webhookByEvents);

    // Fazer a requisição para Evolution API
    const response = await fetch('https://apizap.halarum.com.br/webhook/set/deploy1', {
      method: 'POST',
      headers: {
        'apikey': '74DCEF06-5FAE-4B1E-B090-F023D3CC9798',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na Evolution API:');
      console.error('   Status:', response.status);
      console.error('   Resposta:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Webhook reconfigurado com sucesso!');
    console.log('📊 Resposta:', JSON.stringify(result, null, 2));

    // Verificar a configuração
    console.log('\n🔍 Verificando configuração...');
    const checkResponse = await fetch('https://apizap.halarum.com.br/webhook/find/deploy1', {
      method: 'GET',
      headers: {
        'apikey': '74DCEF06-5FAE-4B1E-B090-F023D3CC9798',
        'Content-Type': 'application/json'
      }
    });

    if (checkResponse.ok) {
      const checkResult = await checkResponse.json();
      console.log('✅ Verificação da configuração:');
      console.log('   URL:', checkResult.webhook?.url);
      console.log('   Ativo:', checkResult.webhook?.enabled);
      console.log('   Por eventos:', checkResult.webhook?.webhookByEvents);
      console.log('   Eventos configurados:', checkResult.webhook?.events?.length || 0);
      
      if (checkResult.webhook?.events) {
        console.log('📋 Eventos ativos:');
        checkResult.webhook.events.forEach(event => {
          console.log(`   - ${event}`);
        });
      }
    } else {
      console.log('❌ Erro ao verificar configuração');
    }

    return true;

  } catch (error) {
    console.error('❌ Erro ao reconfigurar webhook:', error.message);
    return false;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixWebhookEvents().then(success => {
    if (success) {
      console.log('\n🎉 RECONFIGURAÇÃO CONCLUÍDA!');
      console.log('📱 Agora envie uma mensagem para 5549991016846 para testar');
      console.log('🤖 O agente deve responder automaticamente');
    } else {
      console.log('\n❌ Falha na reconfiguração');
      console.log('💡 Verifique as credenciais e tente novamente');
    }
  });
}

module.exports = { fixWebhookEvents };