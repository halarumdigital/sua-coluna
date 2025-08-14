const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAgentBindingFinalWorking() {
  console.log('🔧 CORREÇÃO FINAL: Vinculando agente à instância WhatsApp...\n');

  const dbConfig = {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  };

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados\n');

    // 1. Verificar instância deploy1
    console.log('1️⃣ Verificando instância deploy1...');
    const [instances] = await connection.execute(`
      SELECT id, instance_name, instance_key, is_active 
      FROM whatsapp_instances 
      WHERE instance_name = 'deploy1'
    `);

    if (instances.length === 0) {
      console.log('   ❌ Instância deploy1 não encontrada');
      return;
    }

    const instance = instances[0];
    console.log(`   ✅ Instância encontrada: ${instance.instance_name} (ID: ${instance.id})`);
    console.log(`   📱 Chave: ${instance.instance_key}`);
    console.log(`   🟢 Status: ${instance.is_active ? 'Ativa' : 'Inativa'}\n`);

    // 2. Verificar agente Secretáriaaaaa
    console.log('2️⃣ Verificando agente Secretáriaaaaa...');
    const [agents] = await connection.execute(`
      SELECT id, name, is_active, user_id 
      FROM custom_ai_agents 
      WHERE name = 'Secretáriaaaaa'
    `);

    if (agents.length === 0) {
      console.log('   ❌ Agente Secretáriaaaaa não encontrado');
      return;
    }

    const agent = agents[0];
    console.log(`   ✅ Agente encontrado: ${agent.name} (ID: ${agent.id})`);
    console.log(`   🧠 User ID: ${agent.user_id}`);
    console.log(`   🟢 Status: ${agent.is_active ? 'Ativo' : 'Inativo'}\n`);

    // 3. Verificar franchises disponíveis (usando estrutura correta)
    console.log('3️⃣ Verificando franchises disponíveis...');
    const [franchises] = await connection.execute(`
      SELECT id, franchise_name, user_id 
      FROM franchises 
      LIMIT 1
    `);

    if (franchises.length === 0) {
      console.log('   ❌ Nenhuma franchise disponível');
      return;
    }

    const franchise = franchises[0];
    console.log(`   ✅ Franchise encontrada: ${franchise.franchise_name} (ID: ${franchise.id})`);
    console.log(`   👤 User ID: ${franchise.user_id}\n`);

    // 4. Verificar binding existente
    console.log('4️⃣ Verificando binding existente...');
    const [existingBindings] = await connection.execute(`
      SELECT id, instance_id, agent_id, user_id, is_active
      FROM client_whatsapp_instance_agent_bindings 
      WHERE instance_id = ?
    `, [instance.id]);

    if (existingBindings.length > 0) {
      const existingBinding = existingBindings[0];
      console.log(`   🔗 Binding existente encontrado (ID: ${existingBinding.id})`);
      
      if (existingBinding.agent_id === agent.id) {
        console.log('   ✅ Agente já está vinculado corretamente!');
      } else {
        console.log('   🔄 Atualizando agente vinculado...');
        await connection.execute(`
          UPDATE client_whatsapp_instance_agent_bindings 
          SET agent_id = ?, updated_at = NOW() 
          WHERE instance_id = ?
        `, [agent.id, instance.id]);
        console.log('   ✅ Agente atualizado com sucesso!');
      }
    } else {
      console.log('   🆕 Criando novo binding...');
      
      // Usar o user_id do agente
      const finalUserId = agent.user_id;
      
      await connection.execute(`
        INSERT INTO client_whatsapp_instance_agent_bindings 
        (id, instance_id, agent_id, user_id, is_active, created_at, updated_at) 
        VALUES (UUID(), ?, ?, ?, 1, NOW(), NOW())
      `, [instance.id, agent.id, finalUserId]);
      
      console.log('   ✅ Novo binding criado com sucesso!');
    }

    // 5. Verificação final
    console.log('\n5️⃣ Verificação final...');
    const [finalBindings] = await connection.execute(`
      SELECT b.id, b.instance_id, b.agent_id, b.user_id, b.is_active,
             i.instance_name, a.name as agent_name
      FROM client_whatsapp_instance_agent_bindings b
      LEFT JOIN whatsapp_instances i ON b.instance_id = i.id
      LEFT JOIN custom_ai_agents a ON b.agent_id = a.id
      WHERE b.instance_id = ?
    `, [instance.id]);

    if (finalBindings.length > 0) {
      const finalBinding = finalBindings[0];
      console.log(`   ✅ Binding confirmado:`);
      console.log(`      • ID: ${finalBinding.id}`);
      console.log(`      • Instância: ${finalBinding.instance_name}`);
      console.log(`      • Agente: ${finalBinding.agent_name}`);
      console.log(`      • User ID: ${finalBinding.user_id}`);
      console.log(`      • Ativo: ${finalBinding.is_active ? 'Sim' : 'Não'}`);
    }

    console.log('\n🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('\n📝 AGORA TESTE:');
    console.log('   1. Envie uma mensagem para o WhatsApp');
    console.log('   2. O agente Secretáriaaaaa deve responder automaticamente');
    console.log('   3. Verifique os logs do servidor');
    console.log('\n✨ O sistema está pronto para funcionar!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAgentBindingFinalWorking();
