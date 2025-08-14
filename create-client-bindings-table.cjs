const mysql = require('mysql2/promise');
require('dotenv').config();

async function createClientBindingsTable() {
  console.log('🚀 Criando tabela client_whatsapp_instance_agent_bindings...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    // Create client_whatsapp_instance_agent_bindings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS client_whatsapp_instance_agent_bindings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        instance_id VARCHAR(36) NOT NULL,
        agent_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabela client_whatsapp_instance_agent_bindings criada com sucesso');

    // Add foreign keys separately to avoid constraint issues
    try {
      await connection.execute(`
        ALTER TABLE client_whatsapp_instance_agent_bindings
        ADD CONSTRAINT fk_client_bindings_instance
        FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key para instance_id adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Foreign key para instance_id já existe');
      } else {
        console.log('⚠️  Erro ao adicionar foreign key para instance_id:', error.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE client_whatsapp_instance_agent_bindings
        ADD CONSTRAINT fk_client_bindings_agent
        FOREIGN KEY (agent_id) REFERENCES custom_ai_agents(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key para agent_id adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Foreign key para agent_id já existe');
      } else {
        console.log('⚠️  Erro ao adicionar foreign key para agent_id:', error.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE client_whatsapp_instance_agent_bindings
        ADD CONSTRAINT fk_client_bindings_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key para user_id adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Foreign key para user_id já existe');
      } else {
        console.log('⚠️  Erro ao adicionar foreign key para user_id:', error.message);
      }
    }

    // Add unique constraint
    try {
      await connection.execute(`
        ALTER TABLE client_whatsapp_instance_agent_bindings
        ADD CONSTRAINT unique_active_instance
        UNIQUE (instance_id, is_active)
      `);
      console.log('✅ Constraint unique_active_instance adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️  Constraint unique_active_instance já existe');
      } else {
        console.log('⚠️  Erro ao adicionar constraint unique_active_instance:', error.message);
      }
    }

    // Check if table was created
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'client_whatsapp_instance_agent_bindings'
    `, [process.env.MYSQL_DATABASE]);

    if (tables.length > 0) {
      console.log('✅ Tabela confirmada no banco de dados');
      
      // Show table structure
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
    } else {
      console.log('❌ Tabela não foi criada');
    }

  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createClientBindingsTable();

