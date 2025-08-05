const mysql = require('mysql2/promise');
require('dotenv').config();

async function createWhatsAppTable() {
  let connection;
  
  try {
    console.log('🔧 Criando tabela do WhatsApp...');
    
    // Configurações do arquivo .env
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };
    
    console.log('📡 Conectando ao banco de dados...');
    console.log(`Host: ${config.host}:${config.port}`);
    console.log(`Database: ${config.database}`);
    console.log(`User: ${config.user}`);
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida!');
    
    // Verificar se a tabela já existe
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'whatsapp_api_settings'
    `);
    
    if (tables.length > 0) {
      console.log('✅ Tabela whatsapp_api_settings já existe!');
    } else {
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
      
      console.log('✅ Tabela whatsapp_api_settings criada com sucesso!');
    }
    
    // Verificar se a tabela migrations existe
    const [migrationsTable] = await connection.execute(`
      SHOW TABLES LIKE 'migrations'
    `);
    
    if (migrationsTable.length > 0) {
      // Verificar se a migração já foi registrada
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
    } else {
      console.log('⚠️ Tabela migrations não encontrada. Criando...');
      await connection.execute(`
        CREATE TABLE migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          success BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await connection.execute(`
        INSERT INTO migrations (id, name, success) 
        VALUES ('20250204130000_create_whatsapp_api_settings', 'Create WhatsApp API Settings', TRUE)
      `);
      
      console.log('✅ Tabela migrations criada e migração registrada!');
    }
    
    console.log('\n🎉 Tabela do WhatsApp criada/verificada com sucesso!');
    console.log('✅ A página de configurações do WhatsApp está pronta para uso.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n💡 Dicas para resolver:');
    console.log('1. Verifique se o MySQL está rodando');
    console.log('2. Verifique se o banco existe');
    console.log('3. Verifique se o usuário tem permissões');
    console.log('4. Verifique as configurações no arquivo .env');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createWhatsAppTable(); 