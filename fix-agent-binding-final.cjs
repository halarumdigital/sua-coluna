const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAgentBindingFinal() {
  console.log('🔧 CORREÇÃO FINAL: Vinculando agente à instância WhatsApp...\n');

  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Conectado ao banco de dados\n');

    // 1. Verificar instância deploy1
    console.log('1️⃣ Verificando instância deploy1...');
    const [instances] = await connection.execute(`
      SELECT id, instance_name, instance_key, client_id, is_active
      FROM whatsapp_instances 
      WHERE instance_name = 'deploy1'
    `);

    if (instances.length === 0) {
      console.log('❌ Instância deploy1 não encontrada');
      return;
    }

    const instance = instances[0];
    console.log(`   ✅ Instância encontrada: ${instance.instance_name} (ID: ${instance.id})`);
    console.log(`   📱 Chave: ${instance.instance_key}`);
    console.log(`   🔗 Cliente ID: ${instance.client_id || '❌ Não vinculado'}`);
    console.log(`   🟢 Status: ${instance.is_active ? 'Ativa' : 'Inativa'}\n`);

    // 2. Verificar agente Secretáriaaaaa
    console.log('2️⃣ Verificando agente Secretáriaaaaa...');
    const [agents] = await connection.execute(`
      SELECT id, name, is_active, user_id
      FROM custom_ai_agents 
      WHERE name = 'Secretáriaaaaa'
    `);

    if (agents.length === 0) {
      console.log('❌ Agente Secretáriaaaaa não encontrado');
      return;
    }

    const agent = agents[0];
    console.log(`   ✅ Agente encontrado: ${agent.name} (ID: ${agent.id})`);
    console.log(`   🧠 User ID: ${agent.user_id}`);
    console.log(`   🟢 Status: ${agent.is_active ? 'Ativo' : 'Inativo'}\n`);

    // 3. Verificar cliente (se necessário)
    let clientId = instance.client_id;
    let userId = agent.user_id;

    if (!clientId) {
      console.log('3️⃣ Instância não tem cliente vinculado, buscando cliente disponível...');
      const [clients] = await connection.execute(`
        SELECT id, name, user_id 
        FROM clients 
        WHERE is_active = 1
        LIMIT 1
      `);

      if (clients.length > 0) {
        const client = clients[0];
        clientId = client.id;
        userId = client.user_id;
        console.log(`   🔄 Vinculando instância ao cliente: ${client.name} (ID: ${client.id})`);
        
        await connection.execute(`
          UPDATE whatsapp_instances 
          SET client_id = ? 
          WHERE id = ?
        `, [clientId, instance.id]);
        
        console.log('   ✅ Cliente vinculado à instância!\n');
      } else {
        console.log('   ❌ Nenhum cliente disponível');
        return;
      }
    } else {
      console.log('3️⃣ Instância já tem cliente vinculado ✅\n');
    }

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
      
      // Usar o user_id do agente ou do cliente
      const finalUserId = agent.user_id || userId;
      
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

fixAgentBindingFinal();
