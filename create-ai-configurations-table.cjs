const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAIConfigurationsTable() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: process.env.MYSQL_PORT || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna'
    });

    console.log('Conectado ao banco de dados MySQL');

    // Check if table already exists
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'ai_configurations'"
    );

    if (tables.length > 0) {
      console.log('Tabela ai_configurations já existe');
      return;
    }

    // Create AI configurations table
    const createTableQuery = `
      CREATE TABLE ai_configurations (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(200) NOT NULL,
        description TEXT,
        api_key VARCHAR(500),
        model VARCHAR(50) NOT NULL DEFAULT 'gpt-3.5-turbo',
        temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
        max_tokens INT NOT NULL DEFAULT 1000,
        system_prompt TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- CONSTRAINT fk_ai_config_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_temperature CHECK (temperature >= 0 AND temperature <= 2),
        CONSTRAINT chk_max_tokens CHECK (max_tokens > 0 AND max_tokens <= 4000)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Tabela ai_configurations criada com sucesso!');

    // Insert default configuration
    const insertDefaultConfig = `
      INSERT INTO ai_configurations (
        name, 
        display_name, 
        description, 
        model, 
        temperature, 
        max_tokens, 
        system_prompt, 
        is_active, 
        is_default
      ) VALUES (
        'default',
        'Configuração Padrão',
        'Configuração padrão do sistema para IA',
        'gpt-3.5-turbo',
        0.7,
        1000,
        'Você é um assistente útil e prestativo.',
        TRUE,
        TRUE
      )
    `;

    await connection.execute(insertDefaultConfig);
    console.log('✅ Configuração padrão inserida!');

    // Create index for better performance
    await connection.execute('CREATE INDEX idx_ai_config_active ON ai_configurations(is_active)');
    await connection.execute('CREATE INDEX idx_ai_config_default ON ai_configurations(is_default)');
    
    console.log('✅ Índices criados com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela ai_configurations:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Execute the function
createAIConfigurationsTable();