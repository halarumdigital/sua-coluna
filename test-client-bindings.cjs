const mysql = require('mysql2/promise');
require('dotenv').config();

async function testClientBindings() {
  console.log('🧪 Testando funcionalidade de vinculações de clientes...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    // Check if table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'client_whatsapp_instance_agent_bindings'
    `, [process.env.MYSQL_DATABASE]);

    if (tables.length === 0) {
      console.log('❌ Tabela client_whatsapp_instance_agent_bindings não existe');
      return;
    }

    console.log('✅ Tabela client_whatsapp_instance_agent_bindings existe');

    // Check table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'client_whatsapp_instance_agent_bindings'
      ORDER BY ORDINAL_POSITION
    `, [process.env.MYSQL_DATABASE]);

    console.log('\n📋 Estrutura da tabela:');
    columns.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
    });

    // Check if there are any existing bindings
    const [bindings] = await connection.execute(`
      SELECT COUNT(*) as count FROM client_whatsapp_instance_agent_bindings
    `);

    console.log(`\n🔗 Vinculações existentes: ${bindings[0].count}`);

    if (bindings[0].count > 0) {
      const [existingBindings] = await connection.execute(`
        SELECT * FROM client_whatsapp_instance_agent_bindings LIMIT 5
      `);

      console.log('\n📋 Vinculações existentes:');
      existingBindings.forEach(binding => {
        console.log(`   • ID: ${binding.id}, Instance: ${binding.instance_id}, Agent: ${binding.agent_id}, User: ${binding.user_id}, Active: ${binding.is_active}`);
      });
    }

    // Check foreign key constraints
    const [constraints] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'client_whatsapp_instance_agent_bindings'
        AND REFERENCED_TABLE_NAME IS NOT NULL
    `, [process.env.MYSQL_DATABASE]);

    console.log('\n🔗 Foreign Keys:');
    if (constraints.length > 0) {
      constraints.forEach(constraint => {
        console.log(`   • ${constraint.CONSTRAINT_NAME}: ${constraint.COLUMN_NAME} -> ${constraint.REFERENCED_TABLE_NAME}.${constraint.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('   • Nenhuma foreign key encontrada');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testClientBindings();

