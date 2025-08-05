const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixMigrationRegistration() {
  let connection;
  
  try {
    console.log('🔧 Corrigindo registro da migração...');
    
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida!');
    
    // Verificar estrutura da tabela migrations
    const [columns] = await connection.execute(`
      DESCRIBE migrations
    `);
    
    console.log('📋 Estrutura da tabela migrations:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });
    
    // Verificar se a migração já existe
    const [existingMigrations] = await connection.execute(`
      SELECT * FROM migrations WHERE id = '20250204130000_create_whatsapp_api_settings'
    `);
    
    if (existingMigrations.length === 0) {
      console.log('📝 Registrando migração do WhatsApp...');
      
      // Tentar inserir com checksum se o campo existir
      try {
        await connection.execute(`
          INSERT INTO migrations (id, name, success, checksum) 
          VALUES ('20250204130000_create_whatsapp_api_settings', 'Create WhatsApp API Settings', TRUE, 'whatsapp_migration_checksum')
        `);
        console.log('✅ Migração registrada com checksum!');
      } catch (error) {
        if (error.message.includes('checksum')) {
          // Se checksum não existir, inserir sem ele
          await connection.execute(`
            INSERT INTO migrations (id, name, success) 
            VALUES ('20250204130000_create_whatsapp_api_settings', 'Create WhatsApp API Settings', TRUE)
          `);
          console.log('✅ Migração registrada sem checksum!');
        } else {
          throw error;
        }
      }
    } else {
      console.log('✅ Migração do WhatsApp já registrada!');
    }
    
    // Verificar se a tabela whatsapp_api_settings existe
    const [whatsappTable] = await connection.execute(`
      SHOW TABLES LIKE 'whatsapp_api_settings'
    `);
    
    if (whatsappTable.length > 0) {
      console.log('✅ Tabela whatsapp_api_settings existe!');
      
      // Verificar estrutura da tabela
      const [whatsappColumns] = await connection.execute(`
        DESCRIBE whatsapp_api_settings
      `);
      
      console.log('📋 Estrutura da tabela whatsapp_api_settings:');
      whatsappColumns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
    }
    
    console.log('\n🎉 Correção concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixMigrationRegistration(); 