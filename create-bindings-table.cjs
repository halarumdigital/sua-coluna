const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function createBindingsTable() {
  console.log('🚀 Criando tabela de vinculações...');

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

    const db = drizzle(connection);

    // Create whatsapp_instance_agent_bindings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_instance_agent_bindings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        instance_id VARCHAR(36) NOT NULL,
        agent_id VARCHAR(36) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES admin_whatsapp_instances(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES global_prompts(id) ON DELETE CASCADE,
        UNIQUE KEY unique_active_instance (instance_id, is_active)
      )
    `);

    console.log('✅ Tabela whatsapp_instance_agent_bindings criada com sucesso');

    // Check if table was created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'whatsapp_instance_agent_bindings'
    `, [process.env.MYSQL_DATABASE]);

    if (tables.length > 0) {
      console.log('✅ Tabela confirmada no banco de dados');
      
      // Show table structure
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'whatsapp_instance_agent_bindings'
        ORDER BY ORDINAL_POSITION
      `, [process.env.MYSQL_DATABASE]);

      console.log('\n📋 Estrutura da tabela:');
      columns.forEach(col => {
        console.log(`   • ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createBindingsTable().catch(console.error);