const mysql = require('mysql2/promise');

async function testWhatsappInstancesTable() {
  let db;
  try {
    console.log('🔌 Conectando ao banco de dados...');
    
    // Tentar diferentes configurações
    const configs = [
      {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sua_coluna'
      },
      {
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'sua_coluna'
      },
      {
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'sua_coluna',
        port: 3306
      }
    ];
    
    for (let i = 0; i < configs.length; i++) {
      const config = configs[i];
      console.log(`🔄 Tentativa ${i + 1}: ${config.host}:${config.port || 3306}`);
      
      try {
        db = await mysql.createConnection(config);
        console.log('✅ Conectado com sucesso!');
        break;
      } catch (error) {
        console.log(`❌ Falha na tentativa ${i + 1}: ${error.message}`);
        if (db) {
          await db.end();
          db = null;
        }
      }
    }
    
    if (!db) {
      console.log('❌ Não foi possível conectar ao banco de dados');
      return;
    }

    // Verificar se a tabela existe
    console.log('\n📋 Verificando se a tabela whatsapp_instances existe...');
    const [tables] = await db.execute("SHOW TABLES LIKE 'whatsapp_instances'");
    
    if (tables.length === 0) {
      console.log('❌ Tabela whatsapp_instances não encontrada!');
      await db.end();
      return;
    }
    
    console.log('✅ Tabela whatsapp_instances encontrada!');

    // Verificar estrutura da tabela
    console.log('\n🏗️ Estrutura da tabela whatsapp_instances:');
    const [structure] = await db.execute('DESCRIBE whatsapp_instances');
    structure.forEach(row => {
      console.log(`  - ${row.Field}: ${row.Type} (${row.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Verificar índices
    console.log('\n📊 Índices da tabela:');
    const [indexes] = await db.execute('SHOW INDEX FROM whatsapp_instances');
    indexes.forEach(index => {
      console.log(`  - ${index.Key_name}: ${index.Column_name}`);
    });

    // Testar inserção de um registro de teste
    console.log('\n🧪 Testando inserção de registro...');
    
    // Primeiro, vamos verificar se existe algum cliente para usar como referência
    const [clients] = await db.execute('SELECT id FROM clients LIMIT 1');
    
    if (clients.length === 0) {
      console.log('⚠️ Nenhum cliente encontrado, criando um cliente de teste...');
      const testClientId = 'test-client-' + Date.now();
      await db.execute(`
        INSERT INTO clients (id, companyName, legalName, street, number, neighborhood, city, state, zipCode, contactPhone, email) 
        VALUES (?, 'Empresa Teste', 'Empresa Teste LTDA', 'Rua Teste', '123', 'Centro', 'São Paulo', 'SP', '01234-567', '11999999999', 'teste@teste.com')
      `, [testClientId]);
      console.log('✅ Cliente de teste criado!');
      clients.push({ id: testClientId });
    }

    const clientId = clients[0].id;
    const testInstanceId = 'test-instance-' + Date.now();
    const testInstanceKey = 'deploy-' + Date.now();

    await db.execute(`
      INSERT INTO whatsapp_instances (id, client_id, instance_name, instance_key, status, is_active) 
      VALUES (?, ?, 'Instância Teste', ?, 'disconnected', true)
    `, [testInstanceId, clientId, testInstanceKey]);

    console.log('✅ Registro de teste inserido com sucesso!');

    // Verificar se o registro foi inserido
    const [instances] = await db.execute('SELECT * FROM whatsapp_instances WHERE id = ?', [testInstanceId]);
    
    if (instances.length > 0) {
      console.log('✅ Registro encontrado na tabela:');
      console.log('  ID:', instances[0].id);
      console.log('  Cliente ID:', instances[0].client_id);
      console.log('  Nome da Instância:', instances[0].instance_name);
      console.log('  Chave da Instância:', instances[0].instance_key);
      console.log('  Status:', instances[0].status);
      console.log('  Ativo:', instances[0].is_active);
      console.log('  Criado em:', instances[0].created_at);
    }

    // Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    await db.execute('DELETE FROM whatsapp_instances WHERE id = ?', [testInstanceId]);
    console.log('✅ Dados de teste removidos!');

    console.log('\n✅ Teste da tabela whatsapp_instances concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (db) {
      await db.end();
    }
  }
}

testWhatsappInstancesTable();