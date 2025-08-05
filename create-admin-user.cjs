const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createAdminUser() {
  try {
    console.log('Criando usuário admin...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Check if admin user already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@admin.com']
    );
    
    if (existing.length > 0) {
      console.log('Usuário admin já existe, atualizando senha...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.execute(
        'UPDATE users SET password = ?, active = TRUE WHERE email = ?',
        [hashedPassword, 'admin@admin.com']
      );
      console.log('✅ Senha do admin atualizada!');
    } else {
      console.log('Criando novo usuário admin...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await connection.execute(`
        INSERT INTO users (email, first_name, last_name, password, role, active) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['admin@admin.com', 'Admin', 'Sistema', hashedPassword, 'admin', true]);
      
      console.log('✅ Usuário admin criado com sucesso!');
    }
    
    console.log('Credenciais do admin:');
    console.log('Email: admin@admin.com');
    console.log('Senha: admin123');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createAdminUser();