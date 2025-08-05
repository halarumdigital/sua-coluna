const mysql = require('mysql2/promise');
require('dotenv').config();

async function testWhatsappInstancesTable() {
  let connection;
  
  try {
    console.log('🔌 Testando tabela whatsapp_instances...');
    
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    };
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado com sucesso!');

    // Verificar se a tabela existe
    const [tables] = await connection.execute("SHOW TABLES LIKE 'whatsapp_instances'");
    if (tables.length === 0) {
      console.log('❌ Tabela whatsapp_instances não encontrada!');
      return;
    }
    
    console.log('✅ Tabela whatsapp_instances encontrada!');

    // Verificar se existe algum cliente para testar
    const [clients] = await connection.execute('SELECT id, company_name FROM clients LIMIT 1');
    
    if (clients.length === 0) {
      console.log('⚠️ Nenhum cliente encontrado. A tabela está pronta, mas não pode ser testada sem clientes.');
      return;
    }

    const client = clients[0];
    console.log(`✅ Cliente encontrado: ${client.company_name} (ID: ${client.id})`);

    // Testar inserção
    const testInstanceId = 'test-instance-' + Date.now();
    const testInstanceKey = 'deploy-test-' + Date.now();

    console.log('\n🧪 Testando inserção...');
    await connection.execute(`
      INSERT INTO whatsapp_instances 
      (id, client_id, instance_name, instance_key, status, is_active) 
      VALUES (?, ?, 'Instância de Teste', ?, 'disconnected', true)
    `, [testInstanceId, client.id, testInstanceKey]);

    console.log('✅ Registro inserido com sucesso!');

    // Verificar se foi inserido
    const [instances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE id = ?', 
      [testInstanceId]
    );
    
    if (instances.length > 0) {
      const instance = instances[0];
      console.log('✅ Dados recuperados:');
      console.log(`  - ID: ${instance.id}`);
      console.log(`  - Cliente: ${instance.client_id}`);
      console.log(`  - Nome: ${instance.instance_name}`);
      console.log(`  - Chave: ${instance.instance_key}`);
      console.log(`  - Status: ${instance.status}`);
      console.log(`  - Ativo: ${instance.is_active ? 'Sim' : 'Não'}`);
      console.log(`  - Criado em: ${instance.created_at}`);
    }

    // Testar atualização
    console.log('\n🔄 Testando atualização...');
    await connection.execute(`
      UPDATE whatsapp_instances 
      SET status = 'connected', phone_number = '5511999999999' 
      WHERE id = ?
    `, [testInstanceId]);

    const [updatedInstances] = await connection.execute(
      'SELECT status, phone_number FROM whatsapp_instances WHERE id = ?', 
      [testInstanceId]
    );
    
    if (updatedInstances.length > 0) {
      console.log('✅ Atualização funcionou:');
      console.log(`  - Status: ${updatedInstances[0].status}`);
      console.log(`  - Telefone: ${updatedInstances[0].phone_number}`);
    }

    // Limpar dados de teste
    console.log('\n🧹 Limpando dados de teste...');
    await connection.execute('DELETE FROM whatsapp_instances WHERE id = ?', [testInstanceId]);
    console.log('✅ Dados de teste removidos!');

    console.log('\n🎉 Tabela whatsapp_instances está funcionando perfeitamente!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testWhatsappInstancesTable();