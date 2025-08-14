const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
  console.log('🔍 Verificando estrutura das tabelas...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    // Check whatsapp_instances table
    console.log('\n📱 Verificando tabela whatsapp_instances...');
    try {
      const [instancesColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'whatsapp_instances'
        ORDER BY ORDINAL_POSITION
      `, [process.env.MYSQL_DATABASE]);

      if (instancesColumns.length > 0) {
        console.log('✅ Tabela whatsapp_instances existe');
        console.log('   Colunas:');
        instancesColumns.forEach(col => {
          console.log(`     • ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.COLUMN_KEY === 'PRI' ? '(PRIMARY KEY)' : ''}`);
        });
      } else {
        console.log('❌ Tabela whatsapp_instances não existe');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar whatsapp_instances:', error.message);
    }

    // Check custom_ai_agents table
    console.log('\n🤖 Verificando tabela custom_ai_agents...');
    try {
      const [agentsColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'custom_ai_agents'
        ORDER BY ORDINAL_POSITION
      `, [process.env.MYSQL_DATABASE]);

      if (agentsColumns.length > 0) {
        console.log('✅ Tabela custom_ai_agents existe');
        console.log('   Colunas:');
        agentsColumns.forEach(col => {
          console.log(`     • ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.COLUMN_KEY === 'PRI' ? '(PRIMARY KEY)' : ''}`);
        });
      } else {
        console.log('❌ Tabela custom_ai_agents não existe');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar custom_ai_agents:', error.message);
    }

    // Check users table
    console.log('\n👤 Verificando tabela users...');
    try {
      const [usersColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
        ORDER BY ORDINAL_POSITION
      `, [process.env.MYSQL_DATABASE]);

      if (usersColumns.length > 0) {
        console.log('✅ Tabela users existe');
        console.log('   Colunas:');
        usersColumns.forEach(col => {
          console.log(`     • ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.COLUMN_KEY === 'PRI' ? '(PRIMARY KEY)' : ''}`);
        });
      } else {
        console.log('❌ Tabela users não existe');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar users:', error.message);
    }

    // Check if client_whatsapp_instance_agent_bindings table exists
    console.log('\n🔗 Verificando tabela client_whatsapp_instance_agent_bindings...');
    try {
      const [bindingsColumns] = await connection.execute(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'client_whatsapp_instance_agent_bindings'
        ORDER BY ORDINAL_POSITION
      `, [process.env.MYSQL_DATABASE]);

      if (bindingsColumns.length > 0) {
        console.log('✅ Tabela client_whatsapp_instance_agent_bindings existe');
        console.log('   Colunas:');
        bindingsColumns.forEach(col => {
          console.log(`     • ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${col.IS_NULLABLE === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.COLUMN_KEY === 'PRI' ? '(PRIMARY KEY)' : ''}`);
        });
      } else {
        console.log('❌ Tabela client_whatsapp_instance_agent_bindings não existe');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar client_whatsapp_instance_agent_bindings:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTableStructure();

