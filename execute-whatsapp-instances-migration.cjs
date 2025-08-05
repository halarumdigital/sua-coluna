const mysql = require('mysql2/promise');
require('dotenv').config();

async function executeMigration() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    
    // Usar configuração padrão do sistema
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    };
    
    console.log(`🔄 Conectando em: ${config.host}:${config.port}/${config.database}`);
    
    try {
      connection = await mysql.createConnection(config);
      console.log('✅ Conectado com sucesso!');
    } catch (error) {
      console.log(`❌ Erro de conexão: ${error.message}`);
      
      // Tentar configurações alternativas
      const altConfigs = [
        { ...config, database: 'management_system' },
        { ...config, host: '127.0.0.1' },
        { ...config, host: 'localhost', database: 'management_system' }
      ];
      
      for (let i = 0; i < altConfigs.length; i++) {
        const altConfig = altConfigs[i];
        console.log(`🔄 Tentativa ${i + 2}: ${altConfig.host}:${altConfig.port}/${altConfig.database}`);
        
        try {
          connection = await mysql.createConnection(altConfig);
          console.log('✅ Conectado com sucesso (configuração alternativa)!');
          break;
        } catch (altError) {
          console.log(`❌ Falha na tentativa ${i + 2}: ${altError.message}`);
        }
      }
    }
    
    if (!connection) {
      console.log('❌ Não foi possível conectar ao banco de dados');
      return;
    }

    // Verificar se a tabela já existe
    console.log('\n📋 Verificando se a tabela whatsapp_instances já existe...');
    const [existingTables] = await connection.execute("SHOW TABLES LIKE 'whatsapp_instances'");
    
    if (existingTables.length > 0) {
      console.log('✅ Tabela whatsapp_instances já existe!');
      
      // Mostrar estrutura
      const [structure] = await connection.execute('DESCRIBE whatsapp_instances');
      console.log('\n🏗️ Estrutura atual da tabela:');
      structure.forEach(row => {
        console.log(`  - ${row.Field}: ${row.Type} (${row.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
      
      await connection.end();
      return;
    }

    console.log('❌ Tabela whatsapp_instances não existe. Criando...');

    // Executar a criação da tabela diretamente (sem foreign key primeiro)
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS whatsapp_instances (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        client_id VARCHAR(36) NOT NULL,
        instance_name VARCHAR(100) NOT NULL,
        instance_key VARCHAR(100) UNIQUE NOT NULL,
        webhook VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
        qr_code TEXT,
        last_connection TIMESTAMP NULL,
        phone_number VARCHAR(20),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_whatsapp_instances_client (client_id),
        INDEX idx_whatsapp_instances_status (status),
        INDEX idx_whatsapp_instances_active (is_active)
      )
    `;

    console.log('\n🔧 Executando criação da tabela...');
    await connection.execute(createTableSQL);
    console.log('✅ Tabela whatsapp_instances criada com sucesso!');

    // Adicionar foreign key constraint separadamente
    console.log('\n🔗 Adicionando foreign key constraint...');
    try {
      await connection.execute(`
        ALTER TABLE whatsapp_instances 
        ADD CONSTRAINT fk_whatsapp_instances_client 
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint adicionada!');
    } catch (fkError) {
      console.log('⚠️ Aviso: Não foi possível adicionar foreign key constraint:', fkError.message);
      console.log('   A tabela foi criada sem a constraint (pode ser adicionada manualmente depois)');
    }

    // Verificar se foi criada
    const [newTables] = await connection.execute("SHOW TABLES LIKE 'whatsapp_instances'");
    
    if (newTables.length > 0) {
      console.log('✅ Verificação confirmada: tabela existe!');
      
      // Mostrar estrutura
      const [structure] = await connection.execute('DESCRIBE whatsapp_instances');
      console.log('\n🏗️ Estrutura da nova tabela:');
      structure.forEach(row => {
        console.log(`  - ${row.Field}: ${row.Type} (${row.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });

      // Registrar migração na tabela migrations se ela existir
      try {
        const [migrationTables] = await connection.execute("SHOW TABLES LIKE 'migrations'");
        if (migrationTables.length > 0) {
          console.log('\n📝 Registrando migração...');
          const migrationId = '20250204140000_create_whatsapp_instances';
          await connection.execute(`
            INSERT INTO migrations (id, name, success, error_message, created_at) 
            VALUES (?, 'create_whatsapp_instances', true, NULL, NOW())
            ON DUPLICATE KEY UPDATE success = true, error_message = NULL
          `, [migrationId]);
          console.log('✅ Migração registrada!');
        }
      } catch (migrationError) {
        console.log('⚠️ Erro ao registrar migração (não é crítico):', migrationError.message);
      }
    }

    console.log('\n🎉 Migração executada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a migração:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

executeMigration();