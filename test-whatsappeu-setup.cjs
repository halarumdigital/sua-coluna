const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function testWhatsAppEUSetup() {
  console.log('🔍 Verificando configuração da instância whatsappeu...');

  let connection;
  try {
    // Create connection using .env variables
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conectado ao banco de dados');

    // Buscar a instância whatsappeu
    const [instances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE instance_key = ?',
      ['deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398']
    );

    if (instances.length === 0) {
      console.log('❌ Instância deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398 não encontrada');
      return;
    }

    const instance = instances[0];
    console.log('🎯 INSTÂNCIA WHATSAPP:');
    console.log(`   • ID: ${instance.id}`);
    console.log(`   • Nome: ${instance.instance_name || 'N/A'}`);
    console.log(`   • Cliente ID: ${instance.client_id}`);
    console.log(`   • Status: ${instance.status}`);
    console.log(`   • Ativo: ${instance.is_active ? 'Sim' : 'Não'}`);
    console.log(`   • Webhook: ${instance.webhook || 'Não configurado'}`);

    // Verificar cliente
    if (instance.client_id) {
      const [clients] = await connection.execute('SELECT * FROM clients WHERE id = ?', [instance.client_id]);
      if (clients.length > 0) {
        const client = clients[0];
        console.log(`   • Cliente: ${client.name} (User ID: ${client.user_id})`);
      }
    } else {
      console.log(`   • Cliente: Não vinculado`);
    }

    // Verificar configurações de AI
    const [aiSettings] = await connection.execute('SELECT * FROM ai_configurations LIMIT 1');
    if (aiSettings.length > 0) {
      const settings = aiSettings[0];
      console.log('\n🤖 CONFIGURAÇÕES DE AI:');
      console.log(`   • API Key configurada: ${settings.openai_api_key ? 'Sim' : 'Não'}`);
      console.log(`   • Modelo: ${settings.model || 'N/A'}`);
      console.log(`   • Max Tokens: ${settings.max_tokens || 'N/A'}`);
      console.log(`   • Temperature: ${settings.temperature || 'N/A'}`);
    } else {
      console.log('\n❌ Configurações de AI não encontradas');
    }

    // Verificar configurações da Evolution API
    const [whatsappSettings] = await connection.execute('SELECT * FROM whatsapp_api_settings LIMIT 1');
    if (whatsappSettings.length > 0) {
      const settings = whatsappSettings[0];
      console.log('\n📱 CONFIGURAÇÕES WHATSAPP API:');
      console.log(`   • URL da API: ${settings.evolution_api_url || 'N/A'}`);
      console.log(`   • Token configurado: ${settings.global_token ? 'Sim' : 'Não'}`);
      console.log(`   • Ativo: ${settings.is_active ? 'Sim' : 'Não'}`);
    } else {
      console.log('\n❌ Configurações da WhatsApp API não encontradas');
    }

    // Verificar vinculações usando as tabelas corretas
    const possibleBindingTables = [
      'client_whatsapp_instance_agent_bindings',
      'whatsapp_instance_agent_bindings'
    ];

    let bindingsFound = false;
    for (const tableName of possibleBindingTables) {
      try {
        const [bindings] = await connection.execute(`
          SELECT 
            b.*,
            p.name as agent_name,
            p.prompt as agent_prompt
          FROM ${tableName} b
          LEFT JOIN global_prompts p ON b.agent_id = p.id
          WHERE b.instance_id = ?
        `, [instance.id]);

        if (bindings.length > 0) {
          console.log(`\n🔗 VINCULAÇÕES ENCONTRADAS (${tableName}):`);
          bindings.forEach((binding, index) => {
            console.log(`${index + 1}. Agente: ${binding.agent_name}`);
            console.log(`   • Binding ID: ${binding.id}`);
            console.log(`   • Ativo: ${binding.is_active ? 'Sim' : 'Não'}`);
            console.log(`   • Agent ID: ${binding.agent_id}`);
          });
          bindingsFound = true;
          break;
        }
      } catch (error) {
        // Tabela não existe, continuar tentando
        continue;
      }
    }

    if (!bindingsFound) {
      console.log('\n❌ Nenhuma vinculação encontrada');
    }

    // Status geral do sistema
    console.log('\n📊 STATUS DO SISTEMA:');
    console.log(`   • Instância existe: ✅`);
    console.log(`   • Instância ativa: ${instance.is_active ? '✅' : '❌'}`);
    console.log(`   • Webhook configurado: ${instance.webhook ? '✅' : '❌'}`);
    console.log(`   • AI configurada: ${aiSettings.length > 0 && aiSettings[0].openai_api_key ? '✅' : '❌'}`);
    console.log(`   • WhatsApp API configurada: ${whatsappSettings.length > 0 && whatsappSettings[0].is_active ? '✅' : '❌'}`);
    console.log(`   • Vinculação existe: ${bindingsFound ? '✅' : '❌'}`);

    if (instance.is_active && instance.webhook && aiSettings.length > 0 && whatsappSettings.length > 0 && bindingsFound) {
      console.log('\n🎉 SISTEMA PRONTO PARA RESPONDER AUTOMATICAMENTE!');
      console.log('\n📝 COMO TESTAR:');
      console.log('   1. Envie uma mensagem para o número da instância whatsappeu');
      console.log('   2. O webhook receberá a mensagem');
      console.log('   3. O agente processará e responderá automaticamente');
    } else {
      console.log('\n⚠️ SISTEMA NÃO ESTÁ COMPLETAMENTE CONFIGURADO');
      console.log('   Verifique os itens marcados com ❌ acima');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
testWhatsAppEUSetup().catch(console.error);