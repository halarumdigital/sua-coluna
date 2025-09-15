// Update token to the correct one from logs
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function updateToken() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });

  try {
    console.log('🔧 Atualizando token final...');

    const correctToken = '94eff8b9da7b6c86e50b5c43334f6f69'; // From your logs

    const [result] = await connection.execute(
      'UPDATE whatsapp_api_settings SET global_token = ? WHERE is_active = TRUE',
      [correctToken]
    );

    console.log(`✅ Token atualizado! Linhas afetadas: ${result.affectedRows}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await connection.end();
  }
}

updateToken().catch(console.error);