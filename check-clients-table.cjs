const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkClientsTable() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    };
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado com sucesso!');

    // Verificar se a tabela clients existe
    console.log('\n📋 Verificando tabela clients...');
    const [tables] = await connection.execute("SHOW TABLES LIKE 'clients'");
    
    if (tables.length === 0) {
      console.log('❌ Tabela clients não encontrada!');
      
      // Mostrar todas as tabelas disponíveis
      console.log('\n📋 Tabelas disponíveis:');
      const [allTables] = await connection.execute('SHOW TABLES');
      allTables.forEach(table => {
        console.log(`  - ${Object.values(table)[0]}`);
      });
      
      await connection.end();
      return;
    }

    console.log('✅ Tabela clients encontrada!');

    // Verificar estrutura da tabela clients
    console.log('\n🏗️ Estrutura da tabela clients:');
    const [structure] = await connection.execute('DESCRIBE clients');
    structure.forEach(row => {
      console.log(`  - ${row.Field}: ${row.Type} (${row.Null === 'YES' ? 'NULL' : 'NOT NULL'}) ${row.Key ? `[${row.Key}]` : ''}`);
    });

    // Verificar índices da tabela clients
    console.log('\n📊 Índices da tabela clients:');
    const [indexes] = await connection.execute('SHOW INDEX FROM clients');
    indexes.forEach(index => {
      console.log(`  - ${index.Key_name}: ${index.Column_name}`);
    });

    await connection.end();
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkClientsTable();