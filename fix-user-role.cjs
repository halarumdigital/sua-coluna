const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixUserRole() {
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

    // Find the user paulo@gmail.com
    const [users] = await connection.execute(`
      SELECT id, email, role
      FROM users 
      WHERE email = 'paulo@gmail.com'
    `);
    
    if (users.length === 0) {
      console.log('❌ Usuário paulo@gmail.com não encontrado!');
      return;
    }
    
    const user = users[0];
    console.log(`\n👤 Usuário encontrado:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role atual: ${user.role}`);
    
    // Update user role to 'client'
    await connection.execute(`
      UPDATE users 
      SET role = 'client'
      WHERE id = ?
    `, [user.id]);
    
    console.log(`\n✅ Role do usuário alterado de '${user.role}' para 'client'`);
    console.log('💡 Agora você pode testar a criação de instâncias do WhatsApp!');
    
    // Verify the change
    const [updatedUsers] = await connection.execute(`
      SELECT id, email, role
      FROM users 
      WHERE id = ?
    `, [user.id]);
    
    const updatedUser = updatedUsers[0];
    console.log(`\n🔍 Verificação:`);
    console.log(`   Role atual: ${updatedUser.role}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
fixUserRole().catch(console.error);