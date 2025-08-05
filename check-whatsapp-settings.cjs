require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSettings() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
  
  console.log('🔍 Verificando configurações do WhatsApp API...');
  
  // Verificar estrutura da tabela
  const [columns] = await conn.execute('DESCRIBE whatsapp_api_settings');
  console.log('📋 Colunas da tabela whatsapp_api_settings:');
  columns.forEach(col => {
    console.log(`   - ${col.Field}: ${col.Type}`);
  });
  
  // Verificar dados
  const [settings] = await conn.execute('SELECT * FROM whatsapp_api_settings');
  console.log(`\n📊 Total de registros: ${settings.length}`);
  
  if (settings.length > 0) {
    console.log('📋 Dados encontrados:');
    settings.forEach((setting, index) => {
      console.log(`   ${index + 1}. ID: ${setting.id}`);
      console.log(`      API URL: ${setting.api_url || 'undefined'}`);
      console.log(`      API Key: ${setting.api_key ? 'Configurada' : 'Não configurada'}`);
      console.log(`      Ativo: ${setting.is_active ? 'Sim' : 'Não'}`);
      console.log(`      Criado em: ${setting.created_at}`);
    });
  }
  
  await conn.end();
}

checkSettings().catch(console.error);