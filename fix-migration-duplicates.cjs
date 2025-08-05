const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixMigrationDuplicates() {
  try {
    console.log('Corrigindo duplicatas na tabela de migrations...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Check current migrations table
    console.log('Verificando tabela de migrations...');
    const [migrations] = await connection.execute('SELECT * FROM migrations ORDER BY executed_at');
    
    console.log('Migrations encontradas:');
    migrations.forEach((migration, index) => {
      console.log(`${index + 1}. ID: ${migration.id}, Nome: ${migration.name}, Sucesso: ${migration.success}`);
    });
    
    // Remove failed migrations
    console.log('\nRemoving failed migrations...');
    const [deleteResult] = await connection.execute('DELETE FROM migrations WHERE success = FALSE');
    console.log(`✅ ${deleteResult.affectedRows} migration(s) com falha removida(s)`);
    
    // Check for duplicates
    const [duplicates] = await connection.execute(`
      SELECT id, COUNT(*) as count 
      FROM migrations 
      GROUP BY id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('\nDuplicatas encontradas:');
      duplicates.forEach(dup => {
        console.log(`- ${dup.id}: ${dup.count} entradas`);
      });
      
      // Remove duplicates, keeping only the first one
      for (const dup of duplicates) {
        console.log(`Removendo duplicatas de ${dup.id}...`);
        await connection.execute(`
          DELETE m1 FROM migrations m1
          INNER JOIN migrations m2 
          WHERE m1.id = m2.id 
          AND m1.executed_at > m2.executed_at
          AND m1.id = ?
        `, [dup.id]);
      }
      console.log('✅ Duplicatas removidas');
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }
    
    // Show final state
    console.log('\nEstado final da tabela migrations:');
    const [finalMigrations] = await connection.execute('SELECT * FROM migrations ORDER BY executed_at');
    finalMigrations.forEach((migration, index) => {
      console.log(`${index + 1}. ID: ${migration.id}, Nome: ${migration.name}, Sucesso: ${migration.success}`);
    });
    
    await connection.end();
    console.log('✅ Correção concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

fixMigrationDuplicates();