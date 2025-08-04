const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAISettings() {
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

    // Check if AI settings already exist
    const [existingSettings] = await connection.execute(
      'SELECT COUNT(*) as count FROM system_settings WHERE setting_key LIKE "ai_%"'
    );

    if (existingSettings[0].count > 0) {
      console.log('Configurações de IA já existem no banco de dados');
      return;
    }

    // Insert default AI settings
    const aiSettings = [
      {
        setting_key: 'ai_chatgpt_api_key',
        setting_value: '',
        setting_type: 'string'
      },
      {
        setting_key: 'ai_temperature',
        setting_value: '0.7',
        setting_type: 'number'
      },
      {
        setting_key: 'ai_max_tokens',
        setting_value: '1000',
        setting_type: 'number'
      },
      {
        setting_key: 'ai_model',
        setting_value: 'gpt-3.5-turbo',
        setting_type: 'string'
      },
      {
        setting_key: 'ai_system_prompt',
        setting_value: 'Você é um assistente útil e prestativo.',
        setting_type: 'string'
      }
    ];

    console.log('Inserindo configurações padrão de IA...');

    for (const setting of aiSettings) {
      await connection.execute(
        `INSERT INTO system_settings (id, setting_key, setting_value, setting_type, created_at, updated_at) 
         VALUES (UUID(), ?, ?, ?, NOW(), NOW())`,
        [setting.setting_key, setting.setting_value, setting.setting_type]
      );
      console.log(`✓ Configuração ${setting.setting_key} inserida`);
    }

    console.log('✅ Configurações de IA criadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar configurações de IA:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Execute the function
createAISettings();