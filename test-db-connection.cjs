const mysql = require('mysql2/promise');

async function testConnection() {
  let connection;
  
  try {
    console.log('🔍 Testando conexão com o banco de dados...');
    
    // Tentar diferentes configurações
    const configs = [
      {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sua_coluna'
      },
      {
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'sua_coluna'
      },
      {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sua_coluna',
        port: 3306
      }
    ];
    
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      console.log(`\n🔄 Tentativa ${i + 1}: ${config.host}:${config.port || 3306}`);
      
      try {
        connection = await mysql.createConnection(config);
        console.log('✅ Conexão estabelecida!');
        
        // Testar se conseguimos executar uma query
        const [result] = await connection.execute('SELECT 1 as test');
        console.log('✅ Query de teste executada com sucesso!');
        
        // Verificar se a tabela migrations existe
        const [tables] = await connection.execute(`
          SHOW TABLES LIKE 'migrations'
        `);
        
        if (tables.length > 0) {
          console.log('✅ Tabela migrations encontrada!');
          
          // Verificar migrações existentes
          const [migrations] = await connection.execute(`
            SELECT * FROM migrations ORDER BY created_at
          `);
          
          console.log('\n📋 Migrações encontradas:');
          migrations.forEach(migration => {
            const status = migration.success ? '✅' : '❌';
            console.log(`${status} ${migration.id} - ${migration.name}`);
          });
        } else {
          console.log('❌ Tabela migrations não encontrada');
        }
        
        break;
        
      } catch (error) {
        console.log(`❌ Falha na tentativa ${i + 1}: ${error.message}`);
        if (connection) {
          await connection.end();
          connection = null;
        }
      }
    }
    
    if (!connection) {
      console.log('\n❌ Não foi possível conectar ao banco de dados');
      return;
    }
    
    console.log('\n🎉 Teste de conexão concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testConnection(); 