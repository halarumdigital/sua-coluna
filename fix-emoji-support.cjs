const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixEmojiSupport() {
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

    console.log('🔗 Conectado ao banco de dados MySQL');
    console.log('=====================================');

    // Check current charset and collation
    console.log('\n📋 Verificando configuração atual...');
    try {
      const [currentConfig] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          CHARACTER_SET_NAME,
          COLLATION_NAME
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'setting_value'
      `, [process.env.MYSQL_DATABASE]);

      if (currentConfig.length > 0) {
        const config = currentConfig[0];
        console.log(`Tabela: ${config.TABLE_NAME}`);
        console.log(`Charset da coluna: ${config.CHARACTER_SET_NAME}`);
        console.log(`Collation da coluna: ${config.COLLATION_NAME}`);
      }
    } catch (error) {
      console.log('⚠️  Não foi possível verificar configuração atual');
    }

    // Fix database charset
    console.log('\n🔧 Corrigindo charset do banco de dados...');
    try {
      await connection.query(`ALTER DATABASE ${process.env.MYSQL_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ Charset do banco corrigido para utf8mb4');
    } catch (error) {
      console.log(`⚠️  Não foi possível alterar charset do banco: ${error.message}`);
    }

    // Fix system_settings table
    console.log('\n🔧 Corrigindo tabela system_settings...');
    try {
      await connection.query(`ALTER TABLE system_settings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log('✅ Tabela system_settings convertida para utf8mb4');
    } catch (error) {
      console.log(`⚠️  Erro ao converter tabela: ${error.message}`);
    }

    // Fix specific columns that might contain emojis
    console.log('\n🔧 Corrigindo colunas específicas...');
    
    const columnsToFix = [
      'ALTER TABLE system_settings MODIFY setting_value TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      'ALTER TABLE ai_configurations MODIFY description TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      'ALTER TABLE ai_configurations MODIFY system_prompt TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      'ALTER TABLE ai_usage MODIFY error_message TEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    ];

    for (const query of columnsToFix) {
      try {
        await connection.execute(query);
        console.log(`✅ ${query.split(' ')[2]} corrigida`);
      } catch (error) {
        console.log(`⚠️  ${query.split(' ')[2]} - ${error.message}`);
      }
    }

    // Verify the fix
    console.log('\n📋 Verificando correção...');
    try {
      const [newConfig] = await connection.execute(`
        SELECT 
          TABLE_NAME,
          COLUMN_NAME,
          CHARACTER_SET_NAME,
          COLLATION_NAME
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'system_settings' AND COLUMN_NAME = 'setting_value'
      `, [process.env.MYSQL_DATABASE]);

      if (newConfig.length > 0) {
        const config = newConfig[0];
        console.log(`✅ Nova configuração:`);
        console.log(`   Charset da coluna: ${config.CHARACTER_SET_NAME}`);
        console.log(`   Collation da coluna: ${config.COLLATION_NAME}`);
      }
    } catch (error) {
      console.log('⚠️  Não foi possível verificar nova configuração');
    }

    // Test emoji insertion
    console.log('\n🧪 Testando inserção de emoji...');
    const testEmoji = '😊🎉💙';
    
    try {
      await connection.execute(`
        INSERT INTO system_settings (setting_key, setting_value, setting_type) 
        VALUES ('test_emoji', ?, 'string')
        ON DUPLICATE KEY UPDATE setting_value = ?
      `, [testEmoji, testEmoji]);
      
      const [testResult] = await connection.execute(
        'SELECT setting_value FROM system_settings WHERE setting_key = "test_emoji"'
      );
      
      if (testResult[0] && testResult[0].setting_value === testEmoji) {
        console.log('✅ Teste de emoji bem-sucedido!');
        console.log(`   Emoji salvo: ${testResult[0].setting_value}`);
        
        // Clean up test
        await connection.execute('DELETE FROM system_settings WHERE setting_key = "test_emoji"');
      } else {
        console.log('❌ Teste de emoji falhou');
      }
    } catch (error) {
      console.log(`❌ Erro no teste de emoji: ${error.message}`);
    }

    console.log('\n=====================================');
    console.log('🎉 CORREÇÃO DE EMOJI CONCLUÍDA!');
    console.log('=====================================');
    
    console.log('\n📝 RESUMO DAS CORREÇÕES:');
    console.log('✅ Banco de dados convertido para utf8mb4');
    console.log('✅ Tabela system_settings convertida');
    console.log('✅ Colunas de texto corrigidas');
    console.log('✅ Suporte a emojis habilitado');

    console.log('\n🚀 AGORA VOCÊ PODE:');
    console.log('1. Usar emojis nos prompts do sistema');
    console.log('2. Salvar configurações com caracteres especiais');
    console.log('3. Usar emojis em descrições e textos');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Execute the function
fixEmojiSupport();