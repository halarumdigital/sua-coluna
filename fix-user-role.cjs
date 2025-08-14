const mysql = require('mysql2/promise');

async function fixUserRole() {
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sua_coluna'
    });

    console.log('✅ Conectado ao banco de dados');

    // Buscar usuário Paulo Santos
    console.log('🔍 Buscando usuário Paulo Santos...');
    const [users] = await connection.execute(
      "SELECT id, email, first_name, last_name, role FROM users WHERE first_name = 'Paulo' AND last_name = 'Santos'"
    );
    
    if (users.length === 0) {
      console.log('❌ Usuário Paulo Santos não encontrado');
      return;
    }
    
    const user = users[0];
    console.log('👤 Usuário encontrado:', user);
    
    if (user.role === 'franchise') {
      console.log('✅ Usuário já tem role franchise');
      return;
    }
    
    // Atualizar role para franchise
    console.log('🔄 Atualizando role de client para franchise...');
    await connection.execute(
      "UPDATE users SET role = 'franchise' WHERE id = ?",
      [user.id]
    );
    
    console.log('✅ Role atualizada com sucesso!');
    
    // Verificar se foi atualizado
    const [updatedUsers] = await connection.execute(
      "SELECT id, email, first_name, last_name, role FROM users WHERE id = ?",
      [user.id]
    );
    
    if (updatedUsers.length > 0) {
      console.log('✅ Usuário atualizado:', updatedUsers[0]);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

fixUserRole();