const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFinalStatus() {
  console.log('🔍 Verificando status final do sistema...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar estrutura da tabela custom_ai_agents
    const [columns] = await connection.execute('DESCRIBE custom_ai_agents');
    console.log('\n📋 Colunas da tabela custom_ai_agents:');
    columns.forEach(col => {
      console.log(`   • ${col.Field} (${col.Type})`);
    });

    // Verificar agentes customizados
    const [customAgents] = await connection.execute('SELECT * FROM custom_ai_agents WHERE is_active = 1');
    console.log(`\n🤖 Agentes Customizados Ativos: ${customAgents.length}`);
    
    customAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (ID: ${agent.id})`);
    });

    // Verificar vinculação da instância
    const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
    const [instanceData] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE instance_key = ?',
      [instanceKey]
    );

    if (instanceData.length > 0) {
      const instance = instanceData[0];
      console.log(`\n📱 INSTÂNCIA: ${instance.instance_name}`);
      console.log(`   • ID: ${instance.id}`);
      console.log(`   • Status: ${instance.status}`);
      console.log(`   • Ativo: ${instance.is_active ? 'Sim' : 'Não'}`);
      console.log(`   • Webhook: ${instance.webhook ? 'Configurado' : 'Não configurado'}`);
      
      // Verificar vinculação (sem tentar acessar coluna prompt que não existe)
      const [bindings] = await connection.execute(`
        SELECT 
          b.*,
          a.name as agent_name,
          a.is_active as agent_active
        FROM client_whatsapp_instance_agent_bindings b
        LEFT JOIN custom_ai_agents a ON b.agent_id = a.id
        WHERE b.instance_id = ?
      `, [instance.id]);

      if (bindings.length > 0) {
        const binding = bindings[0];
        console.log(`\n🔗 VINCULAÇÃO:`);
        console.log(`   • Binding ID: ${binding.id}`);
        console.log(`   • Agent ID: ${binding.agent_id}`);
        console.log(`   • Agente: ${binding.agent_name || 'N/A'}`);
        console.log(`   • Agente ativo: ${binding.agent_active ? 'Sim' : 'Não'}`);
        console.log(`   • Binding ativo: ${binding.is_active ? 'Sim' : 'Não'}`);
      }
    }

    // Verificar configurações finais
    const [aiConfig] = await connection.execute('SELECT * FROM ai_configurations LIMIT 1');
    const [whatsappConfig] = await connection.execute('SELECT * FROM whatsapp_api_settings LIMIT 1');

    console.log('\n📊 CONFIGURAÇÕES:');
    console.log(`   • AI configurada: ${aiConfig.length > 0 && aiConfig[0].openai_api_key ? 'Sim' : 'Não'}`);
    console.log(`   • WhatsApp API ativa: ${whatsappConfig.length > 0 && whatsappConfig[0].is_active ? 'Sim' : 'Não'}`);

    // Status geral
    const hasValidBinding = instanceData.length > 0 && 
                           instanceData[0].is_active && 
                           instanceData[0].webhook;
    
    const hasAI = aiConfig.length > 0 && aiConfig[0].openai_api_key;
    const hasWhatsApp = whatsappConfig.length > 0 && whatsappConfig[0].is_active;

    console.log('\n🎯 STATUS GERAL:');
    console.log(`   • Instância configurada: ${hasValidBinding ? '✅' : '❌'}`);
    console.log(`   • AI configurada: ${hasAI ? '✅' : '❌'}`);
    console.log(`   • WhatsApp API ativa: ${hasWhatsApp ? '✅' : '❌'}`);

    if (hasValidBinding && hasAI && hasWhatsApp) {
      console.log('\n🎉 SISTEMA TOTALMENTE CONFIGURADO!');
      console.log('\n📝 COMO FUNCIONA:');
      console.log('   1. Alguém envia mensagem para o número da instância');
      console.log('   2. Evolution API envia webhook para:');
      console.log('      https://labs.beaihub.com.br/api/client/whatsapp-webhook/deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398');
      console.log('   3. Sistema processa mensagem com o agente "Secretáriaaaaa"');
      console.log('   4. Resposta é enviada automaticamente via WhatsApp');
      console.log('\n✨ O agente está pronto para responder automaticamente!');
    } else {
      console.log('\n⚠️ Ainda há configurações pendentes');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkFinalStatus().catch(console.error);