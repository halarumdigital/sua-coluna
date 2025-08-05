const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  let connection;
  
  try {
    console.log('🔍 Verificando usuários e clientes no banco de dados...');
    
    // Configurações do arquivo .env
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };
    
    console.log('📡 Conectando ao banco de dados...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida!');
    
    // Verificar se existe tabela users
    const [tables] = await connection.execute('SHOW TABLES LIKE "users"');
    if (tables.length > 0) {
      console.log('\n📋 Verificando tabela users...');
      const [users] = await connection.execute('SELECT id, email, role, active FROM users');
      console.log('👥 Usuários encontrados:');
      users.forEach(user => {
        console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Ativo: ${user.active}`);
      });
    } else {
      console.log('\n⚠️  Tabela users não encontrada');
    }
    
    // Verificar clientes
    const [clients] = await connection.execute('SELECT id, user_id, company_name, legal_name, email, cpf_cnpj, contact_phone, whatsapp FROM clients');
    console.log('\n🏢 Clientes encontrados:');
    clients.forEach(client => {
      console.log(`- ID: ${client.id}, UserID: ${client.user_id}, Empresa: ${client.company_name}, Nome Legal: ${client.legal_name}, Email: ${client.email}, CPF/CNPJ: ${client.cpf_cnpj}, Telefone: ${client.contact_phone}, WhatsApp: ${client.whatsapp}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada');
    }
  }
}

checkUsers(); 