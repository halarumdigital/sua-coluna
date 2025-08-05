const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createClientUser() {
  console.log('👤 Criando usuário cliente...\n');

  try {
    // Conectar ao banco de dados
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sua_coluna',
    });

    // Verificar se o usuário já existe
    const [existingUsers] = await connection.execute(
      'SELECT id, email, role FROM users WHERE email = ?',
      ['client@example.com']
    );

    if (existingUsers.length > 0) {
      console.log('⚠️  Usuário cliente já existe:');
      const user = existingUsers[0];
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
      return;
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Inserir usuário cliente
    await connection.execute(
      `INSERT INTO users 
       (id, email, password, firstName, lastName, role, active, createdAt, updatedAt) 
       VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        'client@example.com',
        hashedPassword,
        'Cliente',
        'Exemplo',
        'client',
        true
      ]
    );

    console.log('✅ Usuário cliente criado com sucesso!');
    console.log('📋 Credenciais:');
    console.log(`   Email: client@example.com`);
    console.log(`   Senha: password123`);
    console.log(`   Role: client`);
    console.log('');

    await connection.end();

  } catch (error) {
    console.error('❌ Erro ao criar usuário cliente:', error.message);
  }
}

createClientUser().catch(console.error); 