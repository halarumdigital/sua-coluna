const mysql = require('mysql2/promise');

async function testDatabase() {
  try {
    // Conectar ao banco de dados
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sua_coluna'
    });

    console.log('Conectado ao banco de dados');

    // Verificar se a tabela clients existe
    const [tables] = await connection.execute("SHOW TABLES LIKE 'clients'");
    console.log('Tabela clients existe:', tables.length > 0);

    if (tables.length > 0) {
      // Verificar estrutura da tabela
      const [columns] = await connection.execute("DESCRIBE clients");
      console.log('Colunas da tabela clients:');
      columns.forEach(col => {
        console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });

      // Verificar se há clientes na tabela
      const [clients] = await connection.execute("SELECT COUNT(*) as count FROM clients");
      console.log('Número de clientes:', clients[0].count);

      // Se há clientes, mostrar o primeiro
      if (clients[0].count > 0) {
        const [firstClient] = await connection.execute("SELECT * FROM clients LIMIT 1");
        console.log('Primeiro cliente:', firstClient[0]);
      }
    }

    await connection.end();
    console.log('Teste concluído');

  } catch (error) {
    console.error('Erro no teste:', error.message);
  }
}

testDatabase();