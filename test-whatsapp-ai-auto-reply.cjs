const mysql = require('mysql2/promise');
require('dotenv').config();

async function testWhatsAppAIAutoReply() {
  let connection;
  
  try {
    console.log('🧪 Testando resposta automática do WhatsApp com AI...\n');

    // Criar conexão com o banco
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };

    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao banco de dados');

    // 1. Verificar configurações de AI
    console.log('\n1️⃣ Verificando configurações de AI...');
    const [aiSettings] = await connection.execute(
      'SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE "ai_%"'
    );

    if (aiSettings.length === 0) {
      console.log('❌ Nenhuma configuração de AI encontrada');
      return;
    }

    const aiConfig = {};
    aiSettings.forEach(setting => {
      aiConfig[setting.setting_key] = setting.setting_value;
    });

    console.log('📋 Configurações de AI:');
    console.log('  API Key configurada:', aiConfig.ai_chatgpt_api_key ? 'Sim' : 'Não');
    console.log('  Modelo:', aiConfig.ai_model || 'gpt-3.5-turbo');
    console.log('  Temperatura:', aiConfig.ai_temperature || '0.7');
    console.log('  Max Tokens:', aiConfig.ai_max_tokens || '1000');
    console.log('  System Prompt:', (aiConfig.ai_system_prompt || 'Você é um assistente útil e prestativo.').substring(0, 50) + '...');

    // 2. Verificar configurações do WhatsApp
    console.log('\n2️⃣ Verificando configurações do WhatsApp...');
    const [whatsappSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    );

    if (whatsappSettings.length === 0) {
      console.log('❌ Nenhuma configuração ativa do WhatsApp encontrada');
      return;
    }

    const whatsappConfig = whatsappSettings[0];
    console.log('📋 Configurações do WhatsApp:');
    console.log('  Evolution API URL:', whatsappConfig.evolution_api_url);
    console.log('  Token configurado:', whatsappConfig.global_token ? 'Sim' : 'Não');
    console.log('  Ativo:', whatsappConfig.is_active ? 'Sim' : 'Não');

    // 3. Verificar instâncias do WhatsApp
    console.log('\n3️⃣ Verificando instâncias do WhatsApp...');
    const [instances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE is_active = 1'
    );

    if (instances.length === 0) {
      console.log('❌ Nenhuma instância ativa do WhatsApp encontrada');
      return;
    }

    console.log(`📋 Encontradas ${instances.length} instância(s) ativa(s):`);
    instances.forEach((instance, index) => {
      console.log(`  ${index + 1}. ${instance.instance_name} (${instance.instance_key})`);
      console.log(`     Status: ${instance.status}`);
      console.log(`     Telefone: ${instance.phone_number || 'Não configurado'}`);
      console.log(`     Cliente ID: ${instance.client_id}`);
    });

    // 4. Verificar clientes
    console.log('\n4️⃣ Verificando clientes...');
    const [clients] = await connection.execute(
      'SELECT c.*, u.email FROM clients c JOIN users u ON c.user_id = u.id'
    );

    if (clients.length === 0) {
      console.log('❌ Nenhum cliente ativo encontrado');
      return;
    }

    console.log(`📋 Encontrados ${clients.length} cliente(s) ativo(s):`);
    clients.forEach((client, index) => {
      console.log(`  ${index + 1}. ${client.name} (${client.email})`);
      console.log(`     ID: ${client.id}`);
      console.log(`     User ID: ${client.user_id}`);
    });

    // 5. Simular uma mensagem recebida
    console.log('\n5️⃣ Simulando processamento de mensagem...');
    
    const testInstance = instances[0];
    const testClient = clients.find(c => c.id === testInstance.client_id);
    
    if (!testClient) {
      console.log('❌ Cliente não encontrado para a instância de teste');
      return;
    }

    const mockMessageData = {
      data: {
        message: {
          key: {
            remoteJid: '5511999999999@s.whatsapp.net'
          },
          message: {
            conversation: 'Olá, preciso de ajuda com um produto.'
          }
        }
      }
    };

    console.log('📱 Mensagem de teste:');
    console.log('  De: 5511999999999');
    console.log('  Texto: "Olá, preciso de ajuda com um produto."');
    console.log('  Instância: ' + testInstance.instance_key);

    // 6. Verificar se o sistema está pronto
    console.log('\n6️⃣ Status do sistema:');
    console.log('  ✅ Configurações de AI:', aiConfig.ai_chatgpt_api_key ? 'Configuradas' : 'Não configuradas');
    console.log('  ✅ Configurações do WhatsApp:', whatsappConfig.global_token ? 'Configuradas' : 'Não configuradas');
    console.log('  ✅ Instâncias ativas:', instances.length);
    console.log('  ✅ Clientes ativos:', clients.length);

    if (!aiConfig.ai_chatgpt_api_key) {
      console.log('\n⚠️  ATENÇÃO: API key do ChatGPT não está configurada!');
      console.log('   Configure a API key nas configurações de AI do sistema.');
    }

    if (!whatsappConfig.global_token) {
      console.log('\n⚠️  ATENÇÃO: Token do WhatsApp não está configurado!');
      console.log('   Configure o token nas configurações do WhatsApp.');
    }

    if (aiConfig.ai_chatgpt_api_key && whatsappConfig.global_token) {
      console.log('\n✅ Sistema pronto para resposta automática!');
      console.log('   Quando uma mensagem for recebida via webhook, o sistema irá:');
      console.log('   1. Extrair o número e texto da mensagem');
      console.log('   2. Gerar resposta usando AI com as configurações salvas');
      console.log('   3. Enviar resposta automaticamente via WhatsApp');
      console.log('   4. Registrar o uso da AI no banco de dados');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

// Executar teste
if (require.main === module) {
  testWhatsAppAIAutoReply().catch(console.error);
}

module.exports = { testWhatsAppAIAutoReply }; 