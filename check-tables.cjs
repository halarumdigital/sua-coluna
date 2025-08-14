const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTables() {
  console.log('🔍 Verificando tabelas do banco de dados...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conectado ao banco de dados');

    // Listar todas as tabelas
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('\n📋 Tabelas disponíveis:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });

    // Procurar tabelas relacionadas a AI/settings
    const aiTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('ai') || tableName.includes('setting') || tableName.includes('config');
    });

    if (aiTables.length > 0) {
      console.log('\n🤖 Tabelas relacionadas a AI/Settings:');
      aiTables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`${index + 1}. ${tableName}`);
      });
    }

    // Procurar tabelas relacionadas a WhatsApp
    const whatsappTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('whatsapp');
    });

    if (whatsappTables.length > 0) {
      console.log('\n📱 Tabelas relacionadas a WhatsApp:');
      whatsappTables.forEach((table, index) => {
        const tableName = Object.values(table)[0];
        console.log(`${index + 1}. ${tableName}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkTables().catch(console.error);