const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { users } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');

async function checkUsers() {
  try {
    console.log('Conectando ao banco de dados...');
    
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sua_coluna',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    
    const db = drizzle(connection);
    
    console.log('Buscando todos os usuários...');
    const allUsers = await db.select().from(users);
    
    console.log(`\nEncontrados ${allUsers.length} usuários:`);
    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. Usuário:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Nome: ${user.firstName} ${user.lastName}`);
      console.log(`   Ativo: ${user.active}`);
      console.log(`   Senha hash: ${user.password ? user.password.substring(0, 20) + '...' : 'Não definida'}`);
    });
    
    // Verificar especificamente o usuário que estamos tentando usar
    console.log('\n--- Verificando usuário específico ---');
    const specificUser = await db.select().from(users).where(eq(users.email, 'producao@nataliaefranciscotelasltda.com.br'));
    
    if (specificUser.length > 0) {
      const user = specificUser[0];
      console.log('Usuário encontrado:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Ativo: ${user.active}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Senha definida: ${user.password ? 'Sim' : 'Não'}`);
      
      if (user.password) {
        // Testar se a senha 'senha123' funciona
        const bcrypt = require('bcrypt');
        const isValid = await bcrypt.compare('senha123', user.password);
        console.log(`   Senha 'senha123' é válida: ${isValid}`);
        
        // Testar outras senhas comuns
        const commonPasswords = ['123456', 'admin', 'password', 'test', '12345678'];
        for (const pwd of commonPasswords) {
          const isValidCommon = await bcrypt.compare(pwd, user.password);
          if (isValidCommon) {
            console.log(`   Senha '${pwd}' é válida: ${isValidCommon}`);
          }
        }
      }
    } else {
      console.log('Usuário não encontrado!');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

checkUsers();