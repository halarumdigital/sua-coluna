const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAISettings() {
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

    // Check system_settings for AI configurations
    console.log('\n=== Configurações de IA em system_settings ===');
    const [aiSystemSettings] = await connection.execute(
      'SELECT setting_key, setting_value, setting_type FROM system_settings WHERE setting_key LIKE "ai_%" ORDER BY setting_key'
    );

    if (aiSystemSettings.length > 0) {
      aiSystemSettings.forEach(setting => {
        console.log(`${setting.setting_key}: ${setting.setting_value} (${setting.setting_type})`);
      });
    } else {
      console.log('Nenhuma configuração de IA encontrada em system_settings');
    }

    // Check ai_configurations table
    console.log('\n=== Configurações de IA em ai_configurations ===');
    const [aiConfigurations] = await connection.execute(
      'SELECT name, display_name, model, temperature, max_tokens, is_active, is_default FROM ai_configurations ORDER BY name'
    );

    if (aiConfigurations.length > 0) {
      aiConfigurations.forEach(config => {
        console.log(`${config.name} (${config.display_name}): ${config.model}, temp: ${config.temperature}, tokens: ${config.max_tokens}, ativo: ${config.is_active}, padrão: ${config.is_default}`);
      });
    } else {
      console.log('Nenhuma configuração encontrada em ai_configurations');
    }

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro ao verificar configurações de IA:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Execute the function
checkAISettings();