require('dotenv').config();
const mysql = require('mysql2/promise');

async function activateSettings() {
  console.log('🔧 Ativando configurações do WhatsApp...');
  
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
  
  await conn.execute(`
    UPDATE whatsapp_api_settings 
    SET is_active = TRUE 
    WHERE evolution_api_url = 'https://apizap.halarum.com.br'
  `);
  
  console.log('✅ Configuração ativada!');
  
  // Verificar resultado
  const [settings] = await conn.execute('SELECT * FROM whatsapp_api_settings WHERE is_active = TRUE');
  console.log(`📊 ${settings.length} configuração(ões) ativa(s) encontrada(s)`);
  
  await conn.end();
}

activateSettings().catch(console.error);