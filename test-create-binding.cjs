const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCreateBinding() {
  console.log('🧪 Testando criação de vinculação...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    // Get a sample user
    const [users] = await connection.execute(`
      SELECT id FROM users WHERE role = 'franchise' LIMIT 1
    `);

    if (users.length === 0) {
      console.log('❌ Nenhum usuário franchise encontrado');
      return;
    }

    const userId = users[0].id;
    console.log(`👤 Usuário encontrado: ${userId}`);

    // Get a sample instance
    const [instances] = await connection.execute(`
      SELECT id FROM whatsapp_instances LIMIT 1
    `);

    if (instances.length === 0) {
      console.log('❌ Nenhuma instância WhatsApp encontrada');
      return;
    }

    const instanceId = instances[0].id;
    console.log(`📱 Instância encontrada: ${instanceId}`);

    // Get a sample agent
    const [agents] = await connection.execute(`
      SELECT id FROM custom_ai_agents LIMIT 1
    `);

    if (agents.length === 0) {
      console.log('❌ Nenhum agente personalizado encontrado');
      return;
    }

    const agentId = agents[0].id;
    console.log(`🤖 Agente encontrado: ${agentId}`);

    // Try to create a binding
    console.log('\n🔗 Tentando criar vinculação...');
    const [result] = await connection.execute(`
      INSERT INTO client_whatsapp_instance_agent_bindings 
      (instance_id, agent_id, user_id, is_active) 
      VALUES (?, ?, ?, ?)
    `, [instanceId, agentId, userId, true]);

    console.log('✅ Vinculação criada com sucesso!');
    console.log(`   ID da vinculação: ${result.insertId}`);

    // Check if binding was created
    const [bindings] = await connection.execute(`
      SELECT * FROM client_whatsapp_instance_agent_bindings 
      WHERE id = ?
    `, [result.insertId]);

    if (bindings.length > 0) {
      const binding = bindings[0];
      console.log('\n📋 Vinculação criada:');
      console.log(`   • ID: ${binding.id}`);
      console.log(`   • Instance: ${binding.instance_id}`);
      console.log(`   • Agent: ${binding.agent_id}`);
      console.log(`   • User: ${binding.user_id}`);
      console.log(`   • Active: ${binding.is_active}`);
      console.log(`   • Created: ${binding.created_at}`);
    }

    // Clean up - remove the test binding
    console.log('\n🧹 Removendo vinculação de teste...');
    await connection.execute(`
      DELETE FROM client_whatsapp_instance_agent_bindings 
      WHERE id = ?
    `, [result.insertId]);

    console.log('✅ Vinculação de teste removida');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testCreateBinding();

