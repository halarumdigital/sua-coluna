require('dotenv').config();
const mysql = require('mysql2/promise');

async function addSystemUrlField() {
  console.log('🔧 Adicionando campo system_url na tabela whatsapp_api_settings...');
  
  const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Verificar se a coluna já existe
    console.log('📋 Verificando se coluna system_url já existe...');
    const [columns] = await connection.execute(`
      DESCRIBE whatsapp_api_settings
    `);
    
    const hasSystemUrl = columns.some(col => col.Field === 'system_url');
    
    if (hasSystemUrl) {
      console.log('✅ Coluna system_url já existe!');
    } else {
      console.log('📝 Adicionando coluna system_url...');
      await connection.execute(`
        ALTER TABLE whatsapp_api_settings 
        ADD COLUMN system_url VARCHAR(255) NULL
      `);
      console.log('✅ Coluna system_url adicionada com sucesso!');
    }
    
    // Atualizar com URL padrão se estiver vazio
    console.log('🔧 Configurando URL padrão...');
    const defaultSystemUrl = 'https://suacoluna.gilliard.dev.br';
    
    await connection.execute(`
      UPDATE whatsapp_api_settings 
      SET system_url = ? 
      WHERE system_url IS NULL OR system_url = ''
    `, [defaultSystemUrl]);
    
    console.log(`✅ URL padrão configurada: ${defaultSystemUrl}`);
    
    // Verificar resultado final
    const [settings] = await connection.execute('SELECT * FROM whatsapp_api_settings');
    console.log('\n📊 Configurações atuais:');
    settings.forEach((setting, index) => {
      console.log(`   ${index + 1}. Evolution API URL: ${setting.evolution_api_url}`);
      console.log(`      Sistema URL: ${setting.system_url}`);
      console.log(`      Token: ${setting.global_token ? 'Configurado' : 'Não configurado'}`);
      console.log(`      Ativo: ${setting.is_active ? 'Sim' : 'Não'}`);
      console.log('');
    });
    
    await connection.end();
    console.log('🎉 Campo system_url configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar campo system_url:', error.message);
  }
}

addSystemUrlField().catch(console.error);