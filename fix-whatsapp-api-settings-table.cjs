require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixWhatsappApiSettingsTable() {
  console.log('🔧 Corrigindo estrutura da tabela whatsapp_api_settings...');
  
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
  
  try {
    // 1. Verificar estrutura atual
    console.log('📋 Verificando estrutura atual...');
    const [currentColumns] = await conn.execute('DESCRIBE whatsapp_api_settings');
    const columnNames = currentColumns.map(col => col.Field);
    console.log('Colunas atuais:', columnNames);
    
    // 2. Adicionar colunas faltantes
    const columnsToAdd = [
      {
        name: 'evolution_api_url',
        definition: 'VARCHAR(500) NOT NULL DEFAULT ""',
        check: !columnNames.includes('evolution_api_url')
      },
      {
        name: 'global_token', 
        definition: 'VARCHAR(500) NOT NULL DEFAULT ""',
        check: !columnNames.includes('global_token')
      },
      {
        name: 'is_active',
        definition: 'BOOLEAN NOT NULL DEFAULT TRUE',
        check: !columnNames.includes('is_active')
      }
    ];
    
    for (const column of columnsToAdd) {
      if (column.check) {
        console.log(`✅ Adicionando coluna: ${column.name}`);
        await conn.execute(`ALTER TABLE whatsapp_api_settings ADD COLUMN ${column.name} ${column.definition}`);
      } else {
        console.log(`⚠️  Coluna ${column.name} já existe`);
      }
    }
    
    // 3. Verificar se há dados para atualizar
    const [existingData] = await conn.execute('SELECT * FROM whatsapp_api_settings');
    
    if (existingData.length > 0) {
      console.log('\n📊 Dados existentes encontrados. Vou configurar com dados padrão...');
      
      // Configurar dados padrão baseado nos logs que você mostrou
      await conn.execute(`
        UPDATE whatsapp_api_settings 
        SET 
          evolution_api_url = 'https://apizap.halarum.com.br',
          global_token = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798',
          is_active = TRUE
        WHERE evolution_api_url = '' OR evolution_api_url IS NULL
      `);
      
      console.log('✅ Dados configurados com base nos logs da Evolution API');
    }
    
    // 4. Verificar resultado final
    console.log('\n📋 Estrutura final da tabela:');
    const [finalColumns] = await conn.execute('DESCRIBE whatsapp_api_settings');
    finalColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    console.log('\n📊 Dados finais:');
    const [finalData] = await conn.execute('SELECT * FROM whatsapp_api_settings');
    finalData.forEach((setting, index) => {
      console.log(`   ${index + 1}. ID: ${setting.id}`);
      console.log(`      Evolution API URL: ${setting.evolution_api_url}`);
      console.log(`      Global Token: ${setting.global_token ? 'Configurado' : 'Não configurado'}`);
      console.log(`      Ativo: ${setting.is_active ? 'Sim' : 'Não'}`);
    });
    
    await conn.end();
    console.log('\n🎉 Estrutura da tabela corrigida com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await conn.end();
  }
}

fixWhatsappApiSettingsTable().catch(console.error);