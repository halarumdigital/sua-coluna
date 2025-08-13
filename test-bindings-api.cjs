const mysql = require('mysql2/promise');
require('dotenv').config();

async function testBindingsAPI() {
  console.log('🔍 Testando API de vinculações...');
  
  let connection;
  try {
    // Criar conexão com o banco
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar se a tabela existe
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'whatsapp_instance_agent_bindings'
    `, [process.env.MYSQL_DATABASE]);

    if (tables.length === 0) {
      console.log('❌ Tabela whatsapp_instance_agent_bindings não existe');
      return;
    }

    console.log('✅ Tabela whatsapp_instance_agent_bindings existe');

    // Verificar estrutura da tabela
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'whatsapp_instance_agent_bindings'
      ORDER BY ORDINAL_POSITION
    `, [process.env.MYSQL_DATABASE]);

    console.log('📋 Estrutura da tabela:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    });

    // Verificar dados na tabela
    const [bindings] = await connection.execute(`
      SELECT * FROM whatsapp_instance_agent_bindings
    `);

    console.log(`\n📊 Total de vinculações encontradas: ${bindings.length}`);

    if (bindings.length > 0) {
      console.log('\n🔗 Vinculações:');
      bindings.forEach((binding, index) => {
        console.log(`\n  Vinculação ${index + 1}:`);
        console.log(`    ID: ${binding.id}`);
        console.log(`    Instance ID: ${binding.instance_id}`);
        console.log(`    Agent ID: ${binding.agent_id}`);
        console.log(`    Ativo: ${binding.is_active ? 'Sim' : 'Não'}`);
        console.log(`    Criado em: ${binding.created_at}`);
        console.log(`    Atualizado em: ${binding.updated_at}`);
      });

      // Verificar se as instâncias existem
      for (const binding of bindings) {
        const [instances] = await connection.execute(`
          SELECT id, instance_name, instance_key, phone_number, status, is_active
          FROM admin_whatsapp_instances 
          WHERE id = ?
        `, [binding.instance_id]);

        if (instances.length === 0) {
          console.log(`❌ Instância ${binding.instance_id} não encontrada`);
        } else {
          console.log(`✅ Instância ${binding.instance_id} encontrada: ${instances[0].instance_name}`);
        }

        // Verificar se os agentes existem
        const [agents] = await connection.execute(`
          SELECT id, name, description, is_active
          FROM global_prompts 
          WHERE id = ?
        `, [binding.agent_id]);

        if (agents.length === 0) {
          console.log(`❌ Agente ${binding.agent_id} não encontrado`);
        } else {
          console.log(`✅ Agente ${binding.agent_id} encontrado: ${agents[0].name}`);
        }
      }
    }

    // Verificar tabelas relacionadas
    const [instanceCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM admin_whatsapp_instances
    `);
    console.log(`\n📱 Total de instâncias WhatsApp: ${instanceCount[0].count}`);

    const [agentCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM global_prompts
    `);
    console.log(`🤖 Total de agentes: ${agentCount[0].count}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testBindingsAPI();

