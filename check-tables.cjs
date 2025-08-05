require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkTables() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
  
  console.log('🔍 Verificando tabelas WhatsApp...');
  const [tables] = await conn.execute('SHOW TABLES LIKE "%whatsapp%"');
  console.log('Tabelas encontradas:', tables);
  
  await conn.end();
}

checkTables().catch(console.error);