const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function checkPassword() {
  try {
    console.log('Verificando senha do admin...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Get admin user
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      ['admin@sistemas.com']
    );
    
    if (users.length === 0) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    const admin = users[0];
    console.log('Usuário encontrado:', {
      id: admin.id,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      role: admin.role,
      active: admin.active
    });
    
    // Test password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, admin.password);
    
    console.log(`Senha '${testPassword}' é válida:`, isValid);
    
    if (!isValid) {
      console.log('Atualizando senha para admin123...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.execute(
        'UPDATE users SET password = ? WHERE email = ?',
        [hashedPassword, 'admin@sistemas.com']
      );
      console.log('✅ Senha atualizada!');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkPassword();