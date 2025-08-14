const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMigrationStatus() {
  console.log('🔍 Verificando status das migrações...\n');
  
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('✅ Conectado ao banco de dados\n');
    
    // Verificar se a tabela de migrações existe
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'migrations'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Tabela de migrações não existe');
      return;
    }
    
    console.log('✅ Tabela de migrações existe\n');
    
    // Verificar migrações executadas
    const [migrations] = await connection.execute(
      'SELECT * FROM migrations ORDER BY executed_at DESC'
    );
    
    if (migrations.length === 0) {
      console.log('❌ Nenhuma migração encontrada');
      return;
    }
    
    console.log(`📋 ${migrations.length} migrações encontradas:`);
    migrations.forEach((migration, index) => {
      console.log(`${index + 1}. ID: ${migration.id}`);
      console.log(`   Nome: ${migration.name}`);
      console.log(`   Executada em: ${migration.executed_at}`);
      console.log(`   Hash: ${migration.hash}`);
      console.log();
    });
    
    // Verificar se a migração de correção foi executada
    const fixMigration = migrations.find(m => m.id === '20250213000000_fix_whatsapp_instances_schema');
    
    if (fixMigration) {
      console.log('✅ Migração de correção foi executada');
    } else {
      console.log('❌ Migração de correção NÃO foi executada');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

checkMigrationStatus();