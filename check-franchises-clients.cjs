const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFranchisesClients() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: process.env.MYSQL_PORT || 3306
    });

    console.log('🔗 Conectado ao banco de dados');

    // Check franchises table structure
    const [franchiseColumns] = await connection.execute(`
      DESCRIBE franchises
    `);
    
    console.log('\n📋 Estrutura da tabela franchises:');
    franchiseColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check all franchises
    const [franchises] = await connection.execute(`
      SELECT *
      FROM franchises 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n🏢 Todas as franquias (${franchises.length} encontradas):`);
    franchises.forEach((franchise, index) => {
      console.log(`${index + 1}. Franquia:`);
      console.log(`   ID: ${franchise.id}`);
      console.log(`   Nome: ${franchise.name}`);
      console.log(`   Email: ${franchise.email}`);
      console.log(`   Franqueador ID: ${franchise.franchisor_id}`);
      console.log(`   Status: ${franchise.status}`);
      console.log(`   Criado em: ${franchise.created_at}`);
      console.log('');
    });

    // Check clients and their franchise relationship
    const [clients] = await connection.execute(`
      SELECT c.*, f.franchise_name, f.email as franchise_email
      FROM clients c
      LEFT JOIN franchises f ON c.franchise_id = f.id
      ORDER BY c.created_at DESC
    `);
    
    console.log(`\n👥 Todos os clientes e suas franquias (${clients.length} encontrados):`);
    if (clients.length === 0) {
      console.log('   ❌ Nenhum cliente encontrado na tabela clients!');
    } else {
      clients.forEach((client, index) => {
        console.log(`${index + 1}. Cliente:`);
        console.log(`   ID: ${client.id}`);
        console.log(`   Nome: ${client.full_name}`);
        console.log(`   Email: ${client.email}`);
        console.log(`   Franquia ID: ${client.franchise_id}`);
        console.log(`   Franquia Nome: ${client.franchise_name || 'Não encontrada'}`);
        console.log(`   Status: ${client.status}`);
        console.log(`   Criado em: ${client.created_at}`);
        console.log('');
      });
    }

    // Check if there's a relationship between users and clients/franchises
    console.log('\n🔍 Verificando relacionamento entre usuários e franquias...');
    
    // Check if there's a user_id field in franchises
    const franchiseHasUserId = franchiseColumns.some(col => col.Field === 'user_id');
    console.log(`   Franquias têm user_id: ${franchiseHasUserId ? 'Sim' : 'Não'}`);
    
    if (franchiseHasUserId) {
      const [userFranchises] = await connection.execute(`
        SELECT u.id as user_id, u.email as user_email, u.role, f.id as franchise_id, f.franchise_name
        FROM users u
        LEFT JOIN franchises f ON u.id = f.user_id
        WHERE u.role IN ('franchise', 'client')
        ORDER BY u.created_at DESC
      `);
      
      console.log(`\n🔗 Relacionamento usuários-franquias:`);
      userFranchises.forEach((rel, index) => {
        console.log(`${index + 1}. ${rel.user_email} (${rel.role}) -> ${rel.franchise_name || 'Sem franquia'}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
checkFranchisesClients().catch(console.error);