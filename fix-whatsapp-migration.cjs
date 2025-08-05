const mysql = require('mysql2/promise');

async function fixWhatsAppMigration() {
  let connection;
  
  try {
    console.log('🔧 Corrigindo migração do WhatsApp...');
    
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sua_coluna',
    });
    
    console.log('✅ Conexão estabelecida!');
    
    // Verificar se a tabela whatsapp_api_settings existe
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'whatsapp_api_settings'
    `);
    
    if (tables.length === 0) {
      console.log('📝 Criando tabela whatsapp_api_settings...');
      
      await connection.execute(`
        CREATE TABLE whatsapp_api_settings (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          evolution_api_url VARCHAR(500) NOT NULL,
          global_token VARCHAR(500) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_whatsapp_api_active (is_active)
        )
      `);
      
      console.log('✅ Tabela whatsapp_api_settings criada!');
    } else {
      console.log('✅ Tabela whatsapp_api_settings já existe!');
    }
    
    // Verificar se a migração foi registrada
    const [migrations] = await connection.execute(`
      SELECT * FROM migrations WHERE id = '20250204130000_create_whatsapp_api_settings'
    `);
    
    if (migrations.length === 0) {
      console.log('📝 Registrando migração do WhatsApp...');
      await connection.execute(`
        INSERT INTO migrations (id, name, success) 
        VALUES ('20250204130000_create_whatsapp_api_settings', 'Create WhatsApp API Settings', TRUE)
      `);
      console.log('✅ Migração do WhatsApp registrada!');
    } else {
      console.log('✅ Migração do WhatsApp já registrada!');
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

fixWhatsAppMigration(); 