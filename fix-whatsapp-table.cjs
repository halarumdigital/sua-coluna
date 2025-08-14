const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixWhatsAppTable() {
  console.log('🔧 Corrigindo tabela whatsapp_instances...\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('✅ Conectado ao banco de dados\n');
    
    // 1. Adicionar coluna franchise_id se não existir
    console.log('➕ Adicionando coluna franchise_id...');
    try {
      await connection.execute(`
        ALTER TABLE whatsapp_instances 
        ADD COLUMN franchise_id VARCHAR(36) AFTER id
      `);
      console.log('✅ Coluna franchise_id adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Coluna franchise_id já existe');
      } else {
        throw error;
      }
    }
    
    // 2. Remover coluna client_id
    console.log('🗑️  Removendo coluna client_id...');
    try {
      await connection.execute(`
        ALTER TABLE whatsapp_instances 
        DROP COLUMN client_id
      `);
      console.log('✅ Coluna client_id removida');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️  Coluna client_id não existe ou não pode ser removida');
      } else {
        throw error;
      }
    }
    
    // 3. Remover índice antigo se existir
    console.log('🗑️  Removendo índice antigo...');
    try {
      await connection.execute(`
        DROP INDEX idx_whatsapp_instances_client ON whatsapp_instances
      `);
      console.log('✅ Índice antigo removido');
    } catch (error) {
      if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('ℹ️  Índice antigo não existe');
      } else {
        throw error;
      }
    }
    
    // 4. Adicionar novo índice para franchise_id
    console.log('➕ Adicionando novo índice...');
    try {
      await connection.execute(`
        ALTER TABLE whatsapp_instances 
        ADD INDEX idx_whatsapp_instances_franchise (franchise_id)
      `);
      console.log('✅ Novo índice adicionado');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Índice já existe');
      } else {
        throw error;
      }
    }
    
    // 5. Definir franchise_id como NOT NULL
    console.log('🔒 Definindo franchise_id como NOT NULL...');
    try {
      await connection.execute(`
        ALTER TABLE whatsapp_instances 
        MODIFY COLUMN franchise_id VARCHAR(36) NOT NULL
      `);
      console.log('✅ Coluna franchise_id definida como NOT NULL');
    } catch (error) {
      console.log('⚠️  Erro ao definir NOT NULL:', error.message);
    }
    
    console.log('\n🎯 Tabela whatsapp_instances corrigida com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

fixWhatsAppTable();
