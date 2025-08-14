const mysql = require('mysql2/promise');
const { drizzle } = require('drizzle-orm/mysql2');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function createBindingsTable() {
  console.log('🚀 Criando tabelas de vinculações...');

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

    // Create whatsapp_instance_agent_bindings table (for admin)
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

    // Create client_whatsapp_instance_agent_bindings table (for clients)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_whatsapp_instance_agent_bindings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        instance_id VARCHAR(36) NOT NULL,
        agent_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES custom_ai_agents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_active_instance (instance_id, is_active)
      )
    `);

    console.log('✅ Tabela client_whatsapp_instance_agent_bindings criada com sucesso');

    // Check if tables were created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('whatsapp_instance_agent_bindings', 'client_whatsapp_instance_agent_bindings')
    `, [process.env.MYSQL_DATABASE]);

    if (tables.length > 0) {
      console.log('📋 Tabelas encontradas:');
      tables.forEach(table => {
        console.log(`   - ${table.TABLE_NAME}`);
      });
    } else {
      console.log('❌ Nenhuma tabela foi criada');
    }

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createBindingsTable();