const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSuperRootSettings() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('🔧 Testando configurações do Super Root...\n');

    // Verificar se existem configurações do sistema
    const [settings] = await connection.execute(`
      SELECT setting_key, setting_value, setting_type
      FROM system_settings
      WHERE setting_key IN ('system_name', 'systemName', 'system_logo', 'logo', 'primary_color', 'systemColor')
      ORDER BY setting_key
    `);

    console.log('📋 Configurações atuais do sistema:');
    if (settings.length > 0) {
      settings.forEach(setting => {
        console.log(`   ${setting.setting_key}: ${setting.setting_value} (${setting.setting_type})`);
      });
    } else {
      console.log('   Nenhuma configuração encontrada');
    }

    // Adicionar algumas configurações padrão se não existirem
    console.log('\n🔧 Adicionando configurações padrão...');
    
    const defaultSettings = [
      { key: 'system_name', value: 'Sistema de Franquias', type: 'string' },
      { key: 'systemName', value: 'Sistema de Franquias', type: 'string' },
      { key: 'system_subtitle', value: 'Gestão Completa de Franquias', type: 'string' },
      { key: 'systemSubtitle', value: 'Gestão Completa de Franquias', type: 'string' },
      { key: 'system_description', value: 'Sistema completo para gestão de franquias e franqueadores', type: 'string' },
      { key: 'systemDescription', value: 'Sistema completo para gestão de franquias e franqueadores', type: 'string' },
      { key: 'primary_color', value: '#6366f1', type: 'string' },
      { key: 'systemColor', value: '#6366f1', type: 'string' },
    ];

    for (const setting of defaultSettings) {
      try {
        await connection.execute(`
          INSERT INTO system_settings (setting_key, setting_value, setting_type)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            setting_value = VALUES(setting_value),
            setting_type = VALUES(setting_type),
            updated_at = CURRENT_TIMESTAMP
        `, [setting.key, setting.value, setting.type]);
        console.log(`✅ Configuração ${setting.key} adicionada/atualizada`);
      } catch (error) {
        console.log(`⚠️  Erro ao adicionar configuração ${setting.key}:`, error.message);
      }
    }

    // Verificar configurações após inserção
    console.log('\n📋 Configurações após atualização:');
    const [updatedSettings] = await connection.execute(`
      SELECT setting_key, setting_value, setting_type
      FROM system_settings
      WHERE setting_key IN ('system_name', 'systemName', 'system_logo', 'logo', 'primary_color', 'systemColor', 'system_subtitle', 'systemSubtitle')
      ORDER BY setting_key
    `);

    updatedSettings.forEach(setting => {
      console.log(`   ${setting.setting_key}: ${setting.setting_value} (${setting.setting_type})`);
    });

    console.log('\n🎉 Configurações do Super Root preparadas!');
    console.log('\n📋 Funcionalidades disponíveis:');
    console.log('1. Alterar nome do sistema');
    console.log('2. Upload de logo');
    console.log('3. Upload de favicon');
    console.log('4. Alterar cor principal do sistema');
    console.log('5. Configurar subtítulo e descrição');
    console.log('\n🔐 Acesso: Apenas usuários com role "super_root"');

  } catch (error) {
    console.error('❌ Erro ao testar configurações:', error);
  } finally {
    await connection.end();
  }
}

testSuperRootSettings();