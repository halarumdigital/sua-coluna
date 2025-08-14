const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function findOpenAIToken() {
  console.log('🔍 Procurando token da OpenAI em todas as tabelas...');

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

    // Lista de tabelas para verificar
    const tablesToCheck = [
      'ai_configurations',
      'system_settings',
      'ai_settings',
      'custom_ai_agents'
    ];

    for (const tableName of tablesToCheck) {
      try {
        console.log(`\n🔍 Verificando tabela: ${tableName}`);
        
        // Primeiro, verificar se a tabela existe
        const [tableExists] = await connection.execute(`SHOW TABLES LIKE '${tableName}'`);
        
        if (tableExists.length === 0) {
          console.log(`   ❌ Tabela ${tableName} não existe`);
          continue;
        }

        // Verificar estrutura da tabela
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.log(`   📋 Colunas: ${columns.map(col => col.Field).join(', ')}`);

        // Procurar por colunas que podem conter API key
        const apiKeyColumns = columns.filter(col => 
          col.Field.toLowerCase().includes('api_key') || 
          col.Field.toLowerCase().includes('openai') ||
          col.Field.toLowerCase().includes('chatgpt')
        );

        if (apiKeyColumns.length > 0) {
          console.log(`   🔑 Colunas de API Key encontradas: ${apiKeyColumns.map(col => col.Field).join(', ')}`);
          
          // Verificar dados na tabela
          const [data] = await connection.execute(`SELECT * FROM ${tableName}`);
          console.log(`   📊 Registros na tabela: ${data.length}`);
          
          if (data.length > 0) {
            data.forEach((row, index) => {
              console.log(`   📝 Registro ${index + 1}:`);
              Object.keys(row).forEach(key => {
                if (key.toLowerCase().includes('api_key') || 
                    key.toLowerCase().includes('openai') ||
                    key.toLowerCase().includes('chatgpt')) {
                  const value = row[key] ? row[key].toString().substring(0, 20) + '...' : 'null';
                  console.log(`      • ${key}: ${value}`);
                }
              });
            });
          }
        } else {
          console.log(`   ⚠️ Nenhuma coluna de API Key encontrada`);
        }

      } catch (error) {
        console.log(`   ❌ Erro ao verificar ${tableName}: ${error.message}`);
      }
    }

    // Verificar especificamente a tabela ai_configurations que você mostrou na imagem
    console.log('\n🎯 VERIFICAÇÃO ESPECÍFICA - ai_configurations:');
    try {
      const [aiConfigs] = await connection.execute('SELECT * FROM ai_configurations');
      console.log(`   📊 Total de registros: ${aiConfigs.length}`);
      
      if (aiConfigs.length > 0) {
        aiConfigs.forEach((config, index) => {
          console.log(`   📝 Configuração ${index + 1}:`);
          console.log(`      • ID: ${config.id}`);
          console.log(`      • User ID: ${config.user_id || 'N/A'}`);
          console.log(`      • OpenAI API Key: ${config.openai_api_key ? config.openai_api_key.substring(0, 20) + '...' : 'Não configurado'}`);
          console.log(`      • Modelo: ${config.model || 'N/A'}`);
          console.log(`      • Max Tokens: ${config.max_tokens || 'N/A'}`);
          console.log(`      • Temperature: ${config.temperature || 'N/A'}`);
          console.log(`      • Ativo: ${config.is_active ? 'Sim' : 'Não'}`);
          console.log('');
        });

        // Verificar se existe uma configuração ativa com API key
        const activeConfig = aiConfigs.find(config => config.is_active && config.openai_api_key);
        if (activeConfig) {
          console.log('✅ CONFIGURAÇÃO ATIVA ENCONTRADA!');
          console.log(`   • ID: ${activeConfig.id}`);
          console.log(`   • API Key: Configurada`);
          console.log(`   • Modelo: ${activeConfig.model}`);
        } else {
          console.log('❌ Nenhuma configuração ativa com API key encontrada');
        }
      }
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }

    // Verificar system_settings também
    console.log('\n🎯 VERIFICAÇÃO ESPECÍFICA - system_settings:');
    try {
      const [systemSettings] = await connection.execute(
        "SELECT * FROM system_settings WHERE setting_key LIKE '%api%' OR setting_key LIKE '%openai%' OR setting_key LIKE '%chatgpt%'"
      );
      
      console.log(`   📊 Configurações relacionadas a API: ${systemSettings.length}`);
      
      systemSettings.forEach((setting, index) => {
        const value = setting.setting_value && setting.setting_key.includes('api_key') 
          ? setting.setting_value.substring(0, 20) + '...' 
          : setting.setting_value;
        console.log(`   ${index + 1}. ${setting.setting_key} = ${value}`);
      });
    } catch (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

findOpenAIToken().catch(console.error);