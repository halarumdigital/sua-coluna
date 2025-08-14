const mysql = require('mysql2/promise');
require('dotenv').config();

async function createTestAgent() {
  console.log('🤖 Criando agente de teste para usuário franchise...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    // Usuário franchise
    const franchiseUserId = '204f5cad-719e-11f0-8aab-2ae8d4b3399a';
    
    // Verificar se já existe algum agente
    const [existingAgents] = await connection.execute(`
      SELECT id, name FROM custom_ai_agents WHERE user_id = ?
    `, [franchiseUserId]);

    if (existingAgents.length > 0) {
      console.log('✅ Usuário já tem agentes:');
      existingAgents.forEach(agent => {
        console.log(`   • ${agent.name} (${agent.id})`);
      });
      return;
    }

    // Criar agente de teste
    console.log('💡 Criando agente "Secretária Virtual"...');
    
    await connection.execute(`
      INSERT INTO custom_ai_agents (
        id, user_id, name, description, system_prompt, 
        temperature, max_tokens, is_active, created_at, updated_at
      ) VALUES (
        UUID(), ?, ?, ?, ?,
        ?, ?, ?, NOW(), NOW()
      )
    `, [
      franchiseUserId,
      'Secretária Virtual',
      'Agente para atendimento automático de clientes',
      'Você é uma secretária virtual profissional e atenciosa. Sua função é ajudar clientes com informações sobre produtos, pedidos e atendimento. Sempre seja educada, prestativa e eficiente.',
      0.7,
      1000,
      true
    ]);

    console.log('✅ Agente "Secretária Virtual" criado com sucesso!');

    // Verificar se foi criado
    const [newAgent] = await connection.execute(`
      SELECT id, name, is_active FROM custom_ai_agents WHERE user_id = ?
    `, [franchiseUserId]);

    if (newAgent.length > 0) {
      console.log(`📋 Agente verificado: ${newAgent[0].name} (${newAgent[0].id}) - Ativo: ${newAgent[0].is_active}`);
    }

    console.log('\n🎯 Agora o usuário pode:');
    console.log('   1. ✅ Ver instâncias dos clientes da sua franquia');
    console.log('   2. ✅ Ver agentes personalizados');
    console.log('   3. ✅ Criar vinculações entre instâncias e agentes');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createTestAgent();
