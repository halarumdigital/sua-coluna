const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFranchisorWhatsappTables() {
  console.log('🔍 Verificando tabelas de WhatsApp do Franqueador...');
  
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna'
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar tabela franchisor_whatsapp_instances
    console.log('\n📱 Verificando tabela franchisor_whatsapp_instances...');
    const [instancesResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'franchisor_whatsapp_instances'
    `, [process.env.MYSQL_DATABASE]);
    
    if (instancesResult[0].count > 0) {
      console.log('✅ Tabela franchisor_whatsapp_instances existe');
      
      // Verificar estrutura
      const [structureResult] = await connection.execute(`
        DESCRIBE franchisor_whatsapp_instances
      `);
      console.log('📋 Estrutura da tabela:');
      structureResult.forEach(row => {
        console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
      });
    } else {
      console.log('❌ Tabela franchisor_whatsapp_instances não encontrada');
    }

    // Verificar tabela franchisor_phone_numbers
    console.log('\n📞 Verificando tabela franchisor_phone_numbers...');
    const [phoneResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'franchisor_phone_numbers'
    `, [process.env.MYSQL_DATABASE]);
    
    if (phoneResult[0].count > 0) {
      console.log('✅ Tabela franchisor_phone_numbers existe');
      
      // Verificar estrutura
      const [structureResult] = await connection.execute(`
        DESCRIBE franchisor_phone_numbers
      `);
      console.log('📋 Estrutura da tabela:');
      structureResult.forEach(row => {
        console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
      });
    } else {
      console.log('❌ Tabela franchisor_phone_numbers não encontrada');
    }

    // Verificar tabela phone_number_prompt_mapping
    console.log('\n🔗 Verificando tabela phone_number_prompt_mapping...');
    const [mappingResult] = await connection.execute(`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'phone_number_prompt_mapping'
    `, [process.env.MYSQL_DATABASE]);
    
    if (mappingResult[0].count > 0) {
      console.log('✅ Tabela phone_number_prompt_mapping existe');
      
      // Verificar estrutura
      const [structureResult] = await connection.execute(`
        DESCRIBE phone_number_prompt_mapping
      `);
      console.log('📋 Estrutura da tabela:');
      structureResult.forEach(row => {
        console.log(`   - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
      });
    } else {
      console.log('❌ Tabela phone_number_prompt_mapping não encontrada');
    }

    // Verificar foreign keys
    console.log('\n🔗 Verificando foreign keys...');
    const [fkResult] = await connection.execute(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? 
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME IN ('franchisor_whatsapp_instances', 'franchisor_phone_numbers', 'phone_number_prompt_mapping')
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `, [process.env.MYSQL_DATABASE]);
    
    if (fkResult.length > 0) {
      console.log('✅ Foreign keys encontradas:');
      fkResult.forEach(fk => {
        console.log(`   - ${fk.CONSTRAINT_NAME}: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    } else {
      console.log('❌ Nenhuma foreign key encontrada');
    }

    console.log('\n🎉 Verificação das tabelas de WhatsApp do Franqueador concluída!');

  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão com banco de dados fechada');
    }
  }
}

checkFranchisorWhatsappTables();
