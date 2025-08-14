const mysql = require('mysql2/promise');

async function checkAdminInstances() {
  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sua_coluna'
    });

    console.log('Conectado ao banco de dados MySQL');

    // Verificar se a tabela admin_whatsapp_instances existe
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'admin_whatsapp_instances'"
    );

    if (tables.length === 0) {
      console.log('❌ Tabela admin_whatsapp_instances não existe');
      return;
    }

    console.log('✅ Tabela admin_whatsapp_instances existe');

    // Contar total de instâncias
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM admin_whatsapp_instances'
    );
    
    const total = countResult[0].total;
    console.log(`📊 Total de instâncias admin: ${total}`);

    if (total > 0) {
      // Mostrar algumas instâncias
      const [instances] = await connection.execute(
        'SELECT id, instanceName, instanceKey, status, isActive FROM admin_whatsapp_instances LIMIT 5'
      );
      
      console.log('\n📋 Primeiras 5 instâncias:');
      instances.forEach((instance, index) => {
        console.log(`${index + 1}. ID: ${instance.id}, Nome: ${instance.instanceName}, Chave: ${instance.instanceKey}, Status: ${instance.status}, Ativo: ${instance.isActive}`);
      });
    } else {
      console.log('⚠️  Nenhuma instância admin encontrada na tabela');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar instâncias admin:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com o banco fechada');
    }
  }
}

checkAdminInstances();