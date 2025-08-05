const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMigrationStatus() {
  let connection;
  
  try {
    console.log('🔍 Verificando status das migrações...');
    
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sua_coluna',
    });
    
    console.log('✅ Conexão estabelecida!');
    
    // Verificar se a tabela migrations existe
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'migrations'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela migrations não encontrada. Criando...');
      await connection.execute(`
        CREATE TABLE migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          success BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Tabela migrations criada!');
    }
    
    // Verificar migrações existentes
    const [migrations] = await connection.execute(`
      SELECT * FROM migrations ORDER BY created_at
    `);
    
    console.log('\n📋 Migrações encontradas:');
    migrations.forEach(migration => {
      const status = migration.success ? '✅' : '❌';
      console.log(`${status} ${migration.id} - ${migration.name}`);
    });
    
    // Verificar se a tabela whatsapp_api_settings existe
    const [whatsappTable] = await connection.execute(`
      SHOW TABLES LIKE 'whatsapp_api_settings'
    `);
    
    if (whatsappTable.length > 0) {
      console.log('\n✅ Tabela whatsapp_api_settings já existe!');
      
      // Verificar se a migração do WhatsApp foi registrada
      const whatsappMigration = migrations.find(m => m.id === '20250204130000_create_whatsapp_api_settings');
      
      if (!whatsappMigration) {
        console.log('📝 Registrando migração do WhatsApp...');
        await connection.execute(`
          INSERT INTO migrations (id, name, success) 
          VALUES ('20250204130000_create_whatsapp_api_settings', 'Create WhatsApp API Settings', TRUE)
        `);
        console.log('✅ Migração do WhatsApp registrada!');
      } else {
        console.log('✅ Migração do WhatsApp já registrada!');
      }
    } else {
      console.log('\n❌ Tabela whatsapp_api_settings não existe. Criando...');
      
      // Criar a tabela
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
      
      // Registrar a migração
      await connection.execute(`
        INSERT INTO migrations (id, name, success) 
        VALUES ('20250204130000_create_whatsapp_api_settings', 'Create WhatsApp API Settings', TRUE)
      `);
      
      console.log('✅ Tabela whatsapp_api_settings criada e migração registrada!');
    }
    
    console.log('\n🎉 Verificação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkMigrationStatus(); 