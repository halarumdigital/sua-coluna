const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkExistingUsers() {
  try {
    console.log('🔍 Verificando usuários existentes no banco de dados...\n');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
    });

    // Primeiro, vamos verificar a estrutura da tabela users
    console.log('📋 Verificando estrutura da tabela users...');
    const [columns] = await connection.execute('DESCRIBE users');
    console.log('Colunas da tabela users:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    console.log('');

    // Agora vamos buscar os usuários com os campos corretos
    const [users] = await connection.execute(
      'SELECT id, email, role, active, created_at FROM users ORDER BY role, email'
    );

    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado no banco de dados');
      return;
    }

    console.log(`✅ Encontrados ${users.length} usuário(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Ativo: ${user.active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${user.created_at}`);
      console.log(`   ID: ${user.id}`);
      console.log('');
    });
    
    // Encontrar usuários por role
    const adminUsers = users.filter(user => user.role === 'admin');
    const clientUsers = users.filter(user => user.role === 'client');
    
    console.log('📊 Resumo por tipo:');
    console.log(`   Administradores: ${adminUsers.length}`);
    console.log(`   Clientes: ${clientUsers.length}`);
    
    if (adminUsers.length > 0) {
      console.log('\n👑 Administradores disponíveis:');
      adminUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.active ? 'Ativo' : 'Inativo'})`);
      });
    }
    
    if (clientUsers.length > 0) {
      console.log('\n👤 Clientes disponíveis:');
      clientUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.active ? 'Ativo' : 'Inativo'})`);
      });
    }

    // Também vamos verificar a tabela clients
    console.log('\n📋 Verificando tabela clients...');
    const [clients] = await connection.execute('SELECT * FROM clients LIMIT 5');
    console.log(`Encontrados ${clients.length} cliente(s) na tabela clients:`);
    clients.forEach((client, index) => {
      console.log(`  ${index + 1}. ID: ${client.id}`);
      console.log(`     User ID: ${client.user_id}`);
      console.log(`     Empresa: ${client.company_name}`);
      console.log(`     Telefone: ${client.phone}`);
      console.log('');
    });

    await connection.end();

  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error.message);
    console.log('\n💡 Dica: Verifique se as variáveis de ambiente estão configuradas:');
    console.log('   MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE');
  }
}

checkExistingUsers(); 