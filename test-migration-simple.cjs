const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
  try {
    console.log('Testando conexão com o banco...');
    console.log('Host:', process.env.MYSQL_HOST);
    console.log('Database:', process.env.MYSQL_DATABASE);
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Check current table structure
    const [columns] = await connection.execute(`
      DESCRIBE clients
    `);
    
    console.log('Estrutura atual da tabela clients:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testConnection();