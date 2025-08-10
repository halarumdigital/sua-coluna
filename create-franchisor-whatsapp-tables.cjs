const mysql = require('mysql2/promise');
require('dotenv').config();

async function createFranchisorWhatsappTables() {
  console.log('🚀 Criando tabelas de WhatsApp do Franqueador...');
  
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna'
    });

    console.log('✅ Conectado ao banco de dados');

    // 1. Criar tabela de instâncias WhatsApp dos franqueadores
    console.log('📝 Criando tabela franchisor_whatsapp_instances...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS franchisor_whatsapp_instances (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchisor_id VARCHAR(36) NOT NULL,
        instance_name VARCHAR(100) NOT NULL,
        instance_key VARCHAR(100) UNIQUE NOT NULL,
        webhook VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
        qr_code TEXT,
        last_connection TIMESTAMP NULL,
        phone_number VARCHAR(20),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 1.1. Adicionar foreign key para franchisor_whatsapp_instances
    console.log('📝 Adicionando foreign key para franchisor_whatsapp_instances...');
    try {
      await connection.execute(`
        ALTER TABLE franchisor_whatsapp_instances 
        ADD CONSTRAINT fk_franchisor_whatsapp_instances_franchisor FOREIGN KEY (franchisor_id) REFERENCES franchisors(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchisor_whatsapp_instances_franchisor já existe ou erro:', error.message);
      }
    }

    // 2. Criar tabela de números de telefone dos franqueadores
    console.log('📝 Criando tabela franchisor_phone_numbers...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS franchisor_phone_numbers (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchisor_id VARCHAR(36) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        whatsapp_instance_id VARCHAR(36),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 2.1. Adicionar foreign keys para franchisor_phone_numbers
    console.log('📝 Adicionando foreign keys para franchisor_phone_numbers...');
    try {
      await connection.execute(`
        ALTER TABLE franchisor_phone_numbers 
        ADD CONSTRAINT fk_franchisor_phone_numbers_franchisor FOREIGN KEY (franchisor_id) REFERENCES franchisors(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchisor_phone_numbers_franchisor já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE franchisor_phone_numbers 
        ADD CONSTRAINT fk_franchisor_phone_numbers_whatsapp FOREIGN KEY (whatsapp_instance_id) REFERENCES franchisor_whatsapp_instances(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchisor_phone_numbers_whatsapp já existe ou erro:', error.message);
      }
    }

    // 3. Criar tabela de mapeamento entre números de telefone e prompts
    console.log('📝 Criando tabela phone_number_prompt_mapping...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS phone_number_prompt_mapping (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        phone_number_id VARCHAR(36) NOT NULL,
        phone_number_type VARCHAR(20) NOT NULL,
        prompt_id VARCHAR(36) NOT NULL,
        prompt_type VARCHAR(20) NOT NULL,
        priority INT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3.1. Adicionar foreign keys para phone_number_prompt_mapping
    console.log('📝 Adicionando foreign keys para phone_number_prompt_mapping...');
    try {
      await connection.execute(`
        ALTER TABLE phone_number_prompt_mapping 
        ADD CONSTRAINT fk_phone_prompt_mapping_phone FOREIGN KEY (phone_number_id) REFERENCES franchisor_phone_numbers(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_phone_prompt_mapping_phone já existe ou erro:', error.message);
      }
    }

    // 4. Criar índices para melhor performance
    console.log('📝 Criando índices...');
    try {
      await connection.execute(`
        CREATE INDEX idx_franchisor_whatsapp_instances_franchisor ON franchisor_whatsapp_instances(franchisor_id)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_franchisor_whatsapp_instances_franchisor já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_franchisor_whatsapp_instances_status ON franchisor_whatsapp_instances(status)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_franchisor_whatsapp_instances_status já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_franchisor_whatsapp_instances_active ON franchisor_whatsapp_instances(is_active)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_franchisor_whatsapp_instances_active já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_franchisor_phone_numbers_franchisor ON franchisor_phone_numbers(franchisor_id)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_franchisor_phone_numbers_franchisor já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_phone_prompt_mapping_phone ON phone_number_prompt_mapping(phone_number_id)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_phone_prompt_mapping_phone já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_phone_prompt_mapping_prompt ON phone_number_prompt_mapping(prompt_id)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_phone_prompt_mapping_prompt já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_phone_prompt_mapping_active ON phone_number_prompt_mapping(is_active)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_phone_prompt_mapping_active já existe ou erro:', error.message);
      }
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_phone_prompt_mapping_priority ON phone_number_prompt_mapping(priority)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate key name')) {
        console.log('⚠️  Índice idx_phone_prompt_mapping_priority já existe ou erro:', error.message);
      }
    }

    console.log('✅ Tabelas de WhatsApp do Franqueador criadas com sucesso!');
    console.log('');
    console.log('📋 Tabelas criadas:');
    console.log('   - franchisor_whatsapp_instances');
    console.log('   - franchisor_phone_numbers');
    console.log('   - phone_number_prompt_mapping');
    console.log('');
    console.log('🔗 Funcionalidades disponíveis:');
    console.log('   - Franqueadores podem criar instâncias da Evolution API');
    console.log('   - Franqueadores podem adicionar números de telefone');
    console.log('   - Franqueadores podem criar prompts globais');
    console.log('   - Sistema pode vincular números específicos a prompts específicos');
    console.log('   - Suporte a prioridades para múltiplos prompts por número');

  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados fechada');
    }
  }
}

// Executar a função
createFranchisorWhatsappTables();
