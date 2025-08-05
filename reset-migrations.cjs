const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetMigrations() {
  try {
    console.log('Resetando tabela de migrations...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Drop and recreate migrations table
    console.log('Removendo tabela de migrations...');
    await connection.execute('DROP TABLE IF EXISTS migrations');
    
    console.log('Recriando tabela de migrations...');
    await connection.execute(`
      CREATE TABLE migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        error_message TEXT
      )
    `);
    
    console.log('✅ Tabela de migrations resetada com sucesso!');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

resetMigrations();