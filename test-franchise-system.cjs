const mysql = require('mysql2/promise');
require('dotenv').config();

async function testFranchiseSystem() {
  console.log('🧪 Testando sistema de franquias completo...');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    // Verificar usuário franchise
    const franchiseUserId = '204f5cad-719e-11f0-8aab-2ae8d4b3399a';
    console.log(`👤 Verificando usuário franchise: ${franchiseUserId}`);
    
    const [user] = await connection.execute(`
      SELECT id, email, first_name, last_name, role FROM users WHERE id = ?
    `, [franchiseUserId]);

    if (user.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    const userData = user[0];
    console.log(`✅ Usuário: ${userData.email} (${userData.first_name} ${userData.last_name}) - Role: ${userData.role}`);

    // Verificar franquia
    const [franchise] = await connection.execute(`
      SELECT id, franchise_name FROM franchises WHERE user_id = ?
    `, [franchiseUserId]);

    if (franchise.length === 0) {
      console.log('❌ Usuário não tem franquia associada');
      return;
    }

    console.log(`✅ Franquia: ${franchise[0].franchise_name} (${franchise[0].id})`);

    // Verificar clientes da franquia
    const [clients] = await connection.execute(`
      SELECT id, full_name FROM clients WHERE franchise_id = ?
    `, [franchise[0].id]);

    console.log(`\n👥 Clientes da franquia (${clients.length}):`);
    clients.forEach(client => {
      console.log(`   • ${client.id}: ${client.full_name}`);
    });

    // Verificar instâncias dos clientes da franquia
    const [instances] = await connection.execute(`
      SELECT wi.id, wi.instance_name, wi.client_id, c.full_name
      FROM whatsapp_instances wi
      INNER JOIN clients c ON wi.client_id = c.id
      WHERE c.franchise_id = ?
    `, [franchise[0].id]);

    console.log(`\n📱 Instâncias dos clientes da franquia (${instances.length}):`);
    instances.forEach(instance => {
      console.log(`   • ${instance.instance_name} (${instance.id}) - Cliente: ${instance.full_name}`);
    });

    // Verificar agentes personalizados do usuário
    const [agents] = await connection.execute(`
      SELECT id, name, is_active FROM custom_ai_agents WHERE user_id = ?
    `, [franchiseUserId]);

    console.log(`\n🤖 Agentes personalizados do usuário (${agents.length}):`);
    agents.forEach(agent => {
      console.log(`   • ${agent.name} (${agent.id}) - Ativo: ${agent.is_active}`);
    });

    // Verificar vinculações existentes
    const [bindings] = await connection.execute(`
      SELECT cwab.id, cwab.instance_id, cwab.agent_id, cwab.is_active,
             wi.instance_name, caa.name as agent_name
      FROM client_whatsapp_instance_agent_bindings cwab
      INNER JOIN whatsapp_instances wi ON cwab.instance_id = wi.id
      INNER JOIN custom_ai_agents caa ON cwab.agent_id = caa.id
      INNER JOIN clients c ON wi.client_id = c.id
      WHERE c.franchise_id = ?
    `, [franchise[0].id]);

    console.log(`\n🔗 Vinculações existentes (${bindings.length}):`);
    if (bindings.length === 0) {
      console.log('   ❌ Nenhuma vinculação encontrada');
    } else {
      bindings.forEach(binding => {
        console.log(`   • ${binding.instance_name} ↔ ${binding.agent_name} (${binding.id}) - Ativo: ${binding.is_active}`);
      });
    }

    // Testar se é possível criar uma vinculação
    if (instances.length > 0 && agents.length > 0) {
      console.log('\n🔧 Testando criação de vinculação:');
      console.log(`   ✅ Instância disponível: ${instances[0].instance_name}`);
      console.log(`   ✅ Agente disponível: ${agents[0].name}`);
      console.log(`   ✅ Cliente: ${instances[0].full_name}`);
      console.log(`   ✅ Franquia: ${franchise[0].franchise_name}`);
      console.log('   💡 Agora deve ser possível criar vinculações!');
    } else {
      console.log('\n❌ Não é possível criar vinculações:');
      if (instances.length === 0) {
        console.log('   • Nenhuma instância disponível');
      }
      if (agents.length === 0) {
        console.log('   • Nenhum agente disponível');
      }
    }

    console.log('\n📊 Resumo do sistema:');
    console.log(`   • Usuário: ${userData.email} (${userData.role})`);
    console.log(`   • Franquia: ${franchise[0].franchise_name}`);
    console.log(`   • Clientes: ${clients.length}`);
    console.log(`   • Instâncias: ${instances.length}`);
    console.log(`   • Agentes: ${agents.length}`);
    console.log(`   • Vinculações: ${bindings.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testFranchiseSystem();
