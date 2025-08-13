const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUserRole() {
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

    // First, check the structure of users table
    const [userColumns] = await connection.execute(`
      DESCRIBE users
    `);
    
    console.log('\n📋 Estrutura da tabela users:');
    userColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check all users and their roles
    const [users] = await connection.execute(`
      SELECT *
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n👥 Todos os usuários (${users.length} encontrados):`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Criado em: ${user.created_at}`);
      console.log('');
    });

    // Check clients table structure first
    const [clientColumns] = await connection.execute(`
      DESCRIBE clients
    `);
    
    console.log('\n📋 Estrutura da tabela clients:');
    clientColumns.forEach(col => {
      console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check clients table
    const [clients] = await connection.execute(`
      SELECT *
      FROM clients 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n🏢 Todos os clientes (${clients.length} encontrados):`);
    clients.forEach((client, index) => {
      console.log(`${index + 1}. Cliente:`, client);
      console.log('');
    });

    // Check for users with 'client' role
    const [clientUsers] = await connection.execute(`
      SELECT *
      FROM users 
      WHERE role = 'client'
      ORDER BY created_at DESC
    `);
    
    console.log(`\n👤 Usuários com role 'client' (${clientUsers.length} encontrados):`);
    if (clientUsers.length === 0) {
      console.log('   ❌ Nenhum usuário com role "client" encontrado!');
      console.log('   💡 Isso explica o erro "Access denied" nas rotas de WhatsApp.');
    } else {
      clientUsers.forEach((user, index) => {
        console.log(`${index + 1}. Usuário:`, user);
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
checkUserRole().catch(console.error);