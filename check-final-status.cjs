const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFinalStatus() {
  console.log('🔍 VERIFICAÇÃO FINAL DO SISTEMA WHATSAPP...\n');

  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Conectado ao banco de dados\n');

    // 1. Verificar configurações de AI
    console.log('1️⃣ CONFIGURAÇÕES DE AI:');
    const [aiSettings] = await connection.execute(`
      SELECT setting_key, setting_value 
      FROM system_settings 
      WHERE setting_key LIKE 'ai_%'
    `);

    const aiConfig = {};
    aiSettings.forEach(setting => {
      aiConfig[setting.setting_key] = setting.setting_value;
    });

    console.log(`   • API Key OpenAI: ${aiConfig.ai_chatgpt_api_key ? '✅ Configurada' : '❌ Não configurada'}`);
    console.log(`   • Modelo: ${aiConfig.ai_model || '❌ Não configurado'}`);
    console.log(`   • Temperature: ${aiConfig.ai_temperature || '❌ Não configurado'}`);
    console.log(`   • Max Tokens: ${aiConfig.ai_max_tokens || '❌ Não configurado'}`);
    console.log(`   • System Prompt: ${aiConfig.ai_system_prompt ? '✅ Configurado' : '❌ Não configurado'}\n`);

    // 2. Verificar instância WhatsApp
    console.log('2️⃣ INSTÂNCIA WHATSAPP:');
    const [instances] = await connection.execute(`
      SELECT id, instance_name, instance_key, status, is_active, client_id, webhook
      FROM whatsapp_instances 
      WHERE instance_name = 'deploy1'
    `);

    if (instances.length > 0) {
      const instance = instances[0];
      console.log(`   • Nome: ${instance.instance_name}`);
      console.log(`   • Chave: ${instance.instance_key}`);
      console.log(`   • Status: ${instance.status}`);
      console.log(`   • Ativa: ${instance.is_active ? '✅ Sim' : '❌ Não'}`);
      console.log(`   • Cliente ID: ${instance.client_id || '❌ Não vinculado'}`);
      console.log(`   • Webhook: ${instance.webhook ? '✅ Configurado' : '❌ Não configurado'}\n`);
    } else {
      console.log('   ❌ Instância deploy1 não encontrada\n');
    }

    // 3. Verificar agente vinculado
    console.log('3️⃣ AGENTE VINCULADO:');
    if (instances.length > 0) {
      const [bindings] = await connection.execute(`
        SELECT b.id, b.instance_id, b.agent_id, b.is_active,
               a.name as agent_name, a.is_active as agent_active
        FROM client_whatsapp_instance_agent_bindings b
        LEFT JOIN custom_ai_agents a ON b.agent_id = a.id
        WHERE b.instance_id = ?
      `, [instances[0].id]);

      if (bindings.length > 0) {
        const binding = bindings[0];
        console.log(`   • Binding ID: ${binding.id}`);
        console.log(`   • Agente: ${binding.agent_name || '❌ Nome não encontrado'}`);
        console.log(`   • Agente Ativo: ${binding.agent_active ? '✅ Sim' : '❌ Não'}`);
        console.log(`   • Binding Ativo: ${binding.is_active ? '✅ Sim' : '❌ Não'}\n`);
      } else {
        console.log('   ❌ Nenhum agente vinculado à instância\n');
      }
    }

    // 4. Verificar cliente
    console.log('4️⃣ CLIENTE:');
    if (instances.length > 0 && instances[0].client_id) {
      const [clients] = await connection.execute(`
        SELECT id, name, is_active, user_id
        FROM clients 
        WHERE id = ?
      `, [instances[0].client_id]);

      if (clients.length > 0) {
        const client = clients[0];
        console.log(`   • Nome: ${client.name}`);
        console.log(`   • Ativo: ${client.is_active ? '✅ Sim' : '❌ Não'}`);
        console.log(`   • User ID: ${client.user_id}\n`);
      } else {
        console.log('   ❌ Cliente não encontrado\n');
      }
    } else {
      console.log('   ❌ Instância não tem cliente vinculado\n');
    }

    // 5. Verificar configurações da API WhatsApp
    console.log('5️⃣ API WHATSAPP:');
    const [whatsappSettings] = await connection.execute(`
      SELECT id, evolution_api_url, global_token, is_active
      FROM whatsapp_api_settings 
      WHERE is_active = 1
    `);

    if (whatsappSettings.length > 0) {
      const settings = whatsappSettings[0];
      console.log(`   • URL: ${settings.evolution_api_url}`);
      console.log(`   • Token: ${settings.global_token ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`   • Ativa: ${settings.is_active ? '✅ Sim' : '❌ Não'}\n`);
    } else {
      console.log('   ❌ Configurações da API WhatsApp não encontradas\n');
    }

    // 6. Resumo final
    console.log('🎯 RESUMO FINAL:');
    
    const hasApiKey = !!aiConfig.ai_chatgpt_api_key;
    const hasInstance = instances.length > 0 && instances[0].is_active;
    const hasWebhook = instances.length > 0 && !!instances[0].webhook;
    const hasAgent = instances.length > 0 && (await connection.execute(`
      SELECT COUNT(*) as count FROM client_whatsapp_instance_agent_bindings 
      WHERE instance_id = ? AND is_active = 1
    `, [instances[0].id]))[0][0].count > 0;
    const hasClient = instances.length > 0 && !!instances[0].client_id;
    const hasWhatsappApi = whatsappSettings.length > 0;

    console.log(`   • API Key OpenAI: ${hasApiKey ? '✅' : '❌'}`);
    console.log(`   • Instância Ativa: ${hasInstance ? '✅' : '❌'}`);
    console.log(`   • Webhook Configurado: ${hasWebhook ? '✅' : '❌'}`);
    console.log(`   • Agente Vinculado: ${hasAgent ? '✅' : '❌'}`);
    console.log(`   • Cliente Vinculado: ${hasClient ? '✅' : '❌'}`);
    console.log(`   • API WhatsApp: ${hasWhatsappApi ? '✅' : '❌'}`);

    if (hasApiKey && hasInstance && hasWebhook && hasAgent && hasClient && hasWhatsappApi) {
      console.log('\n🎉 SISTEMA TOTALMENTE FUNCIONAL!');
      console.log('\n📝 PARA TESTAR:');
      console.log('   1. Envie uma mensagem para o WhatsApp');
      console.log('   2. Verifique os logs do servidor');
      console.log('   3. O agente deve responder automaticamente');
    } else {
      console.log('\n⚠️ PROBLEMAS IDENTIFICADOS:');
      if (!hasApiKey) console.log('   • API Key do OpenAI não configurada');
      if (!hasInstance) console.log('   • Instância WhatsApp não ativa');
      if (!hasWebhook) console.log('   • Webhook não configurado');
      if (!hasAgent) console.log('   • Agente não vinculado à instância');
      if (!hasClient) console.log('   • Cliente não vinculado à instância');
      if (!hasWhatsappApi) console.log('   • API WhatsApp não configurada');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkFinalStatus();