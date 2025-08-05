const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');

async function createWhatsappApiTable() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'management_system',
    port: process.env.MYSQL_PORT || 3306,
  });

  try {
    console.log('Criando tabela whatsapp_api_settings...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_api_settings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        evolution_api_url VARCHAR(500) NOT NULL,
        global_token VARCHAR(500) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_whatsapp_api_active (is_active),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ Tabela whatsapp_api_settings criada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createWhatsappApiTable().catch(console.error);