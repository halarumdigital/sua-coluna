const mysql = require('mysql2/promise');
require('dotenv').config();

async function addWhatsappApiTable() {
  try {
    console.log('Adicionando tabela whatsapp_api_settings...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Create WhatsApp API settings table
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
    
    // Check if migrations table exists and add migration record
    try {
      await connection.execute(`
        INSERT IGNORE INTO migrations (id, name, checksum, success) 
        VALUES ('20250204130000_create_whatsapp_api_settings', 'Create WhatsApp API Settings Table', 'manual_execution', TRUE)
      `);
      console.log('✅ Migration registrada!');
    } catch (migrationError) {
      console.log('ℹ️ Tabela de migrations não encontrada, continuando...');
    }
    
    await connection.end();
    console.log('✅ Processo concluído!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

addWhatsappApiTable();