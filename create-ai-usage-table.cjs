const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAIUsageTable() {
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
      "SHOW TABLES LIKE 'ai_usage'"
    );

    if (tables.length > 0) {
      console.log('Tabela ai_usage já existe');
      return;
    }

    // Create AI usage table
    const createTableQuery = `
      CREATE TABLE ai_usage (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        model VARCHAR(50) NOT NULL,
        prompt_tokens INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        total_tokens INT NOT NULL DEFAULT 0,
        cost DECIMAL(10,6) NOT NULL DEFAULT 0,
        request_type VARCHAR(50) NOT NULL DEFAULT 'chat',
        success BOOLEAN NOT NULL DEFAULT TRUE,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_ai_usage_user (user_id),
        INDEX idx_ai_usage_date (created_at),
        INDEX idx_ai_usage_model (model)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createTableQuery);
    console.log('✅ Tabela ai_usage criada com sucesso!');

    // Insert some sample data for testing
    const sampleData = [
      {
        model: 'gpt-3.5-turbo',
        prompt_tokens: 50,
        completion_tokens: 100,
        total_tokens: 150,
        cost: 0.0003,
        request_type: 'chat',
        success: true
      },
      {
        model: 'gpt-4',
        prompt_tokens: 75,
        completion_tokens: 125,
        total_tokens: 200,
        cost: 0.006,
        request_type: 'chat',
        success: true
      }
    ];

    for (const data of sampleData) {
      await connection.execute(
        `INSERT INTO ai_usage (model, prompt_tokens, completion_tokens, total_tokens, cost, request_type, success) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.model, data.prompt_tokens, data.completion_tokens, data.total_tokens, data.cost, data.request_type, data.success]
      );
    }

    console.log('✅ Dados de exemplo inseridos!');

  } catch (error) {
    console.error('❌ Erro ao criar tabela ai_usage:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Execute the function
createAIUsageTable();