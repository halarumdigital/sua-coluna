const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkWhatsAppSettings() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT || 3306
    });

    console.log('🔗 Conectado ao banco de dados');

    // Check all WhatsApp API settings
    const [settings] = await connection.execute(`
      SELECT id, evolution_api_url, global_token, system_url, is_active, created_at
      FROM whatsapp_api_settings 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📋 Todas as configurações WhatsApp (${settings.length} encontradas):`);
    settings.forEach((setting, index) => {
      console.log(`${index + 1}. ID: ${setting.id}`);
      console.log(`   URL: ${setting.evolution_api_url}`);
      console.log(`   Token: ${setting.global_token ? '••••••••••••••••' : 'Não definido'}`);
      console.log(`   System URL: ${setting.system_url || 'Não definido'}`);
      console.log(`   Ativo: ${setting.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${setting.created_at}`);
      console.log('');
    });

    // Check active settings specifically
    const [activeSettings] = await connection.execute(`
      SELECT id, evolution_api_url, global_token, system_url, is_active, created_at
      FROM whatsapp_api_settings 
      WHERE is_active = 1
      ORDER BY created_at DESC
      LIMIT 1
    `);
    
    console.log(`\n✅ Configuração ativa atual:`);
    if (activeSettings.length > 0) {
      const active = activeSettings[0];
      console.log(`   ID: ${active.id}`);
      console.log(`   URL: ${active.evolution_api_url}`);
      console.log(`   Token: ${active.global_token ? '••••••••••••••••' : 'Não definido'}`);
      console.log(`   System URL: ${active.system_url || 'Não definido'}`);
      console.log(`   Ativo: ${active.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${active.created_at}`);
    } else {
      console.log('   ❌ Nenhuma configuração ativa encontrada!');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
checkWhatsAppSettings().catch(console.error);