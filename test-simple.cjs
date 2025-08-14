const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSimple() {
  console.log('Testando conexao...');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('Conectado ao banco');
    
    const [settings] = await connection.execute(
      'SELECT id, evolution_api_url, is_active FROM whatsapp_api_settings WHERE is_active = true LIMIT 1'
    );
    
    if (settings.length > 0) {
      console.log('Configuracao encontrada:', settings[0]);
    } else {
      console.log('Nenhuma configuracao ativa');
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testSimple();
