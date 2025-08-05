require('dotenv').config();
const mysql = require('mysql2/promise');

async function testAIAutoReplyStatus() {
  console.log('🤖 Testando status da resposta automática de IA...');
  
  // Configuração do banco de dados
  const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sua_coluna',
    port: parseInt(process.env.MYSQL_PORT || '3306')
  };

  try {
    console.log('🔌 Tentando conectar ao banco de dados...');
    console.log('📋 Configuração:', JSON.stringify(dbConfig, null, 2));
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');

    // 1. Verificar configurações do WhatsApp API
    console.log('\n📱 Verificando configurações do WhatsApp API...');
    const [whatsappSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings ORDER BY id DESC LIMIT 1'
    );
    
    if (whatsappSettings.length === 0) {
      console.log('❌ Nenhuma configuração do WhatsApp API encontrada');
      return;
    }
    
    const settings = whatsappSettings[0];
    console.log(`✅ Configuração encontrada: ${settings.api_url}`);
    console.log(`   API Key: ${settings.api_key ? '✅ Configurada' : '❌ Não configurada'}`);

    // 2. Verificar instâncias ativas
    console.log('\n📞 Verificando instâncias do WhatsApp...');
    const [instances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE status = "open"'
    );
    
    if (instances.length === 0) {
      console.log('❌ Nenhuma instância ativa encontrada');
      return;
    }
    
    console.log(`✅ ${instances.length} instância(s) ativa(s) encontrada(s)`);
    for (const instance of instances) {
      console.log(`   - ${instance.instance_key} (${instance.phone_number})`);
      console.log(`   - Status: ${instance.status}`);
      console.log(`   - Webhook: ${instance.webhook || 'Não configurado'}`);
    }

    // 3. Verificar configurações de IA
    console.log('\n🧠 Verificando configurações de IA...');
    const [aiSettings] = await connection.execute(
      'SELECT * FROM ai_configurations ORDER BY id DESC LIMIT 1'
    );
    
    if (aiSettings.length === 0) {
      console.log('❌ Nenhuma configuração de IA encontrada');
      return;
    }
    
    const aiConfig = aiSettings[0];
    console.log(`✅ Configuração de IA encontrada:`);
    console.log(`   - Modelo: ${aiConfig.model}`);
    console.log(`   - Temperatura: ${aiConfig.temperature}`);
    console.log(`   - Max Tokens: ${aiConfig.max_tokens}`);
    console.log(`   - API Key: ${aiConfig.openai_api_key ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log(`   - Prompt do Sistema: ${aiConfig.system_prompt ? '✅ Configurado' : '❌ Não configurado'}`);

    // 4. Verificar clientes
    console.log('\n👥 Verificando clientes...');
    const [clients] = await connection.execute(
      'SELECT c.*, u.email FROM clients c JOIN users u ON c.user_id = u.id'
    );
    
    console.log(`✅ ${clients.length} cliente(s) encontrado(s)`);
    for (const client of clients) {
      console.log(`   - ${client.name} (${client.email})`);
    }

    // 5. Simular processamento de mensagem
    console.log('\n🔄 Simulando processamento de mensagem...');
    const testMessage = {
      key: {
        remoteJid: '554999214230@s.whatsapp.net',
        fromMe: false,
        id: 'TEST_MESSAGE_ID'
      },
      pushName: 'Test User',
      message: { conversation: 'oi' },
      messageType: 'conversation',
      instanceId: instances[0].instance_key
    };

    console.log(`   📨 Mensagem de teste: "${testMessage.message.conversation}"`);
    console.log(`   👤 De: ${testMessage.pushName} (${testMessage.key.remoteJid})`);
    console.log(`   📱 Instância: ${testMessage.instanceId}`);

    // 6. Verificar se o webhook está configurado corretamente
    console.log('\n🔗 Verificando configuração do webhook...');
    const activeInstance = instances[0];
    if (activeInstance.webhook) {
      console.log(`✅ Webhook configurado: ${activeInstance.webhook}`);
      
      // Verificar se a URL é pública
      if (activeInstance.webhook.includes('localhost')) {
        console.log('⚠️  ATENÇÃO: Webhook usa localhost - pode causar problemas');
      } else {
        console.log('✅ Webhook usa URL pública');
      }
    } else {
      console.log('❌ Webhook não configurado');
    }

    // 7. Verificar logs recentes (se existir tabela de logs)
    console.log('\n📋 Verificando logs recentes...');
    try {
      const [logs] = await connection.execute(
        'SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 5'
      );
      
      if (logs.length > 0) {
        console.log(`✅ ${logs.length} log(s) recente(s) encontrado(s)`);
        for (const log of logs) {
          console.log(`   - ${log.created_at}: ${log.prompt_tokens} tokens ($${log.cost})`);
        }
      } else {
        console.log('ℹ️  Nenhum log de uso de IA encontrado');
      }
    } catch (error) {
      console.log('ℹ️  Tabela de logs não encontrada ou não acessível');
    }

    // 8. Resumo do status
    console.log('\n📊 RESUMO DO STATUS:');
    console.log(`   ✅ WhatsApp API: ${settings.api_url ? 'Configurado' : 'Não configurado'}`);
    console.log(`   ✅ Instâncias ativas: ${instances.length}`);
    console.log(`   ✅ Configuração de IA: ${aiConfig.openai_api_key ? 'Pronta' : 'Incompleta'}`);
    console.log(`   ✅ Webhook: ${activeInstance.webhook ? 'Configurado' : 'Não configurado'}`);
    
    if (settings.api_url && instances.length > 0 && aiConfig.openai_api_key && activeInstance.webhook) {
      console.log('\n🎉 SISTEMA PRONTO PARA RESPOSTA AUTOMÁTICA!');
      console.log('   O agente deve responder automaticamente às mensagens recebidas.');
    } else {
      console.log('\n⚠️  SISTEMA INCOMPLETO');
      console.log('   Algumas configurações estão faltando para a resposta automática funcionar.');
    }

    await connection.end();
    console.log('\n✅ Teste concluído!');
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testAIAutoReplyStatus().catch(console.error); 