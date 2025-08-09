const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSuperRootAI() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('🤖 Testando configurações de IA do Super Root...\n');

    // Verificar se existem configurações de IA
    const [aiSettings] = await connection.execute(`
      SELECT setting_key, setting_value, setting_type
      FROM system_settings
      WHERE setting_key IN ('chatGptApiKey', 'ai_model', 'ai_temperature', 'ai_max_tokens', 'ai_system_prompt')
      ORDER BY setting_key
    `);

    console.log('📋 Configurações atuais de IA:');
    if (aiSettings.length > 0) {
      aiSettings.forEach(setting => {
        const value = setting.setting_key === 'chatGptApiKey' ? 
          (setting.setting_value ? '••••••••••••••••' : 'Não configurado') : 
          setting.setting_value;
        console.log(`   ${setting.setting_key}: ${value} (${setting.setting_type})`);
      });
    } else {
      console.log('   Nenhuma configuração encontrada');
    }

    // Verificar tabela de uso de IA
    const [aiUsageTable] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'ai_usage'
    `, [process.env.MYSQL_DATABASE]);

    console.log(`\n📊 Tabela ai_usage existe: ${aiUsageTable[0].count > 0 ? 'Sim' : 'Não'}`);

    if (aiUsageTable[0].count > 0) {
      const [usageStats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_requests,
          SUM(total_tokens) as total_tokens,
          SUM(cost) as total_cost,
          MAX(created_at) as last_used
        FROM ai_usage
      `);

      if (usageStats[0].total_requests > 0) {
        console.log('\n📈 Estatísticas de uso:');
        console.log(`   Total de requests: ${usageStats[0].total_requests}`);
        console.log(`   Total de tokens: ${usageStats[0].total_tokens || 0}`);
        console.log(`   Custo total: $${Number(usageStats[0].total_cost || 0).toFixed(4)}`);
        console.log(`   Último uso: ${usageStats[0].last_used || 'Nunca'}`);
      } else {
        console.log('\n📈 Nenhum uso de IA registrado ainda');
      }
    }

    // Verificar usuário super root
    const [superRootUsers] = await connection.execute(`
      SELECT id, email, first_name, last_name, role, active
      FROM users 
      WHERE role = 'super_root'
    `);

    console.log('\n👤 Usuários Super Root:');
    superRootUsers.forEach(user => {
      console.log(`   ✅ ${user.first_name} ${user.last_name} (${user.email}) - ${user.active ? 'Ativo' : 'Inativo'}`);
    });

    // Adicionar configurações padrão de IA se não existirem
    console.log('\n🔧 Adicionando configurações padrão de IA...');
    
    const defaultAISettings = [
      { key: 'ai_model', value: 'gpt-3.5-turbo', type: 'string' },
      { key: 'ai_temperature', value: '0.7', type: 'number' },
      { key: 'ai_max_tokens', value: '1000', type: 'number' },
      { key: 'ai_system_prompt', value: 'Você é um assistente útil e prestativo do sistema de franquias.', type: 'string' },
    ];

    for (const setting of defaultAISettings) {
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

    console.log('\n🎉 Teste de IA do Super Root concluído!');
    console.log('\n📋 Funcionalidades disponíveis:');
    console.log('1. Configurar API Key do OpenAI');
    console.log('2. Selecionar modelo de IA (GPT-3.5, GPT-4, etc.)');
    console.log('3. Ajustar temperatura (criatividade)');
    console.log('4. Definir máximo de tokens');
    console.log('5. Configurar prompt global do sistema');
    console.log('6. Testar conexão com OpenAI');
    console.log('7. Visualizar estatísticas de uso');
    console.log('\n🔐 Acesso: Apenas usuários com role "super_root"');
    console.log('🌐 Interface: /super-root/ai');

  } catch (error) {
    console.error('❌ Erro ao testar IA:', error);
  } finally {
    await connection.end();
  }
}

testSuperRootAI();