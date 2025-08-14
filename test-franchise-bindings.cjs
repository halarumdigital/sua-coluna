require('dotenv').config();
const mysql = require('mysql2/promise');

async function testFranchiseBindings() {
  console.log('🔍 Testando sistema de vinculação de agentes da franquia...\n');

  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sua_coluna'
    });

    console.log('✅ Conectado ao banco de dados\n');

    // 1. Verificar se a tabela existe
    console.log('📋 Verificando tabela client_whatsapp_instance_agent_bindings...');
    const [tables] = await connection.execute(`
      SHOW TABLES LIKE 'client_whatsapp_instance_agent_bindings'
    `);
    
    if (tables.length === 0) {
      console.log('❌ Tabela client_whatsapp_instance_agent_bindings não existe');
      return;
    }
    console.log('✅ Tabela client_whatsapp_instance_agent_bindings existe\n');

    // 2. Verificar estrutura da tabela
    console.log('🔍 Verificando estrutura da tabela...');
    const [columns] = await connection.execute(`
      DESCRIBE client_whatsapp_instance_agent_bindings
    `);
    
    console.log('Colunas da tabela:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    console.log('');

    // 3. Verificar dados existentes
    console.log('📊 Verificando dados existentes...');
    const [bindings] = await connection.execute(`
      SELECT 
        cb.id,
        cb.instance_id,
        cb.agent_id,
        cb.user_id,
        cb.is_active,
        cb.created_at,
        wi.instance_name,
        ca.name as agent_name,
        u.email as user_email
      FROM client_whatsapp_instance_agent_bindings cb
      LEFT JOIN whatsapp_instances wi ON cb.instance_id = wi.id
      LEFT JOIN custom_ai_agents ca ON cb.agent_id = ca.id
      LEFT JOIN users u ON cb.user_id = u.id
      ORDER BY cb.created_at DESC
    `);

    if (bindings.length === 0) {
      console.log('📭 Nenhuma vinculação encontrada');
    } else {
      console.log(`📋 ${bindings.length} vinculação(ões) encontrada(s):`);
      bindings.forEach((binding, index) => {
        console.log(`\n${index + 1}. Vinculação ID: ${binding.id}`);
        console.log(`   Instância: ${binding.instance_name || 'N/A'} (${binding.instance_id})`);
        console.log(`   Agente: ${binding.agent_name || 'N/A'} (${binding.agent_id})`);
        console.log(`   Usuário: ${binding.user_email || 'N/A'} (${binding.user_id})`);
        console.log(`   Ativo: ${binding.is_active ? 'Sim' : 'Não'}`);
        console.log(`   Criado em: ${binding.created_at}`);
      });
    }
    console.log('');

    // 4. Verificar instâncias disponíveis
    console.log('📱 Verificando instâncias WhatsApp disponíveis...');
    const [instances] = await connection.execute(`
      SELECT id, instance_name, status, franchise_id
      FROM whatsapp_instances
      ORDER BY created_at DESC
    `);

    if (instances.length === 0) {
      console.log('📭 Nenhuma instância encontrada');
    } else {
      console.log(`📱 ${instances.length} instância(s) encontrada(s):`);
      instances.forEach((instance, index) => {
        console.log(`\n${index + 1}. Instância: ${instance.instance_name}`);
        console.log(`   ID: ${instance.id}`);
        console.log(`   Status: ${instance.status}`);
        console.log(`   Franchise ID: ${instance.franchise_id}`);
      });
    }
    console.log('');

    // 5. Verificar agentes disponíveis
    console.log('🤖 Verificando agentes personalizados disponíveis...');
    const [agents] = await connection.execute(`
      SELECT id, name, description, is_active, user_id
      FROM custom_ai_agents
      ORDER BY created_at DESC
    `);

    if (agents.length === 0) {
      console.log('📭 Nenhum agente encontrado');
    } else {
      console.log(`🤖 ${agents.length} agente(s) encontrado(s):`);
      agents.forEach((agent, index) => {
        console.log(`\n${index + 1}. Agente: ${agent.name}`);
        console.log(`   ID: ${agent.id}`);
        console.log(`   Descrição: ${agent.description || 'N/A'}`);
        console.log(`   Ativo: ${agent.is_active ? 'Sim' : 'Não'}`);
        console.log(`   User ID: ${agent.user_id}`);
      });
    }
    console.log('');

    // 6. Verificar usuários franchise
    console.log('👥 Verificando usuários franchise...');
    const [franchiseUsers] = await connection.execute(`
      SELECT u.id, u.email, u.role, f.id as franchise_id, f.name as franchise_name
      FROM users u
      LEFT JOIN franchises f ON u.id = f.user_id
      WHERE u.role = 'franchise'
      ORDER BY u.created_at DESC
    `);

    if (franchiseUsers.length === 0) {
      console.log('📭 Nenhum usuário franchise encontrado');
    } else {
      console.log(`👥 ${franchiseUsers.length} usuário(s) franchise encontrado(s):`);
      franchiseUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. Usuário: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Franchise ID: ${user.franchise_id || 'N/A'}`);
        console.log(`   Franchise Name: ${user.franchise_name || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco de dados fechada');
    }
  }
}

testFranchiseBindings();
