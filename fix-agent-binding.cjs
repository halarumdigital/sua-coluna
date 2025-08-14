const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixAgentBinding() {
  console.log('🔧 Corrigindo vínculo entre instância e agente...');

  let connection;
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar instâncias disponíveis
    const [instances] = await connection.execute(`
      SELECT id, instance_key, instance_name, client_id 
      FROM whatsapp_instances 
      WHERE is_active = 1
    `);

    console.log(`📱 Instâncias disponíveis: ${instances.length}`);
    instances.forEach((inst, index) => {
      console.log(`${index + 1}. ${inst.instance_name} (${inst.instance_key})`);
    });

    // Verificar agentes disponíveis
    const [agents] = await connection.execute(`
      SELECT id, name, is_active 
      FROM custom_ai_agents 
      WHERE is_active = 1
    `);

    console.log(`\n🤖 Agentes disponíveis: ${agents.length}`);
    agents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.name} (ID: ${agent.id})`);
    });

    // Verificar bindings existentes
    const [bindings] = await connection.execute(`
      SELECT b.id, b.instance_id, b.agent_id, b.is_active,
             i.instance_name, a.name as agent_name
      FROM client_whatsapp_instance_agent_bindings b
      LEFT JOIN whatsapp_instances i ON b.instance_id = i.id
      LEFT JOIN custom_ai_agents a ON b.agent_id = a.id
    `);

    console.log(`\n🔗 Bindings existentes: ${bindings.length}`);
    bindings.forEach((binding, index) => {
      console.log(`${index + 1}. ${binding.instance_name} -> ${binding.agent_name || 'N/A'} (Ativo: ${binding.is_active})`);
    });

    // Encontrar a instância deploy1
    const deployInstance = instances.find(inst => inst.instance_name === 'deploy1');
    if (!deployInstance) {
      console.log('❌ Instância deploy1 não encontrada');
      return;
    }

    // Encontrar o agente Secretáriaaaaa
    const secretaryAgent = agents.find(agent => agent.name === 'Secretáriaaaaa');
    if (!secretaryAgent) {
      console.log('❌ Agente Secretáriaaaaa não encontrado');
      return;
    }

    console.log(`\n🎯 Configurando vínculo:`);
    console.log(`   Instância: ${deployInstance.instance_name} (ID: ${deployInstance.id})`);
    console.log(`   Agente: ${secretaryAgent.name} (ID: ${secretaryAgent.id})`);

    // Verificar se já existe um binding para esta instância
    const existingBinding = bindings.find(b => b.instance_id === deployInstance.id);
    
    if (existingBinding) {
      if (existingBinding.agent_id === secretaryAgent.id) {
        console.log('✅ Vínculo já está correto!');
      } else {
        console.log('🔄 Atualizando vínculo existente...');
        await connection.execute(`
          UPDATE client_whatsapp_instance_agent_bindings 
          SET agent_id = ?, updated_at = NOW() 
          WHERE instance_id = ?
        `, [secretaryAgent.id, deployInstance.id]);
        console.log('✅ Vínculo atualizado com sucesso!');
      }
    } else {
      console.log('🆕 Criando novo vínculo...');
      await connection.execute(`
        INSERT INTO client_whatsapp_instance_agent_bindings 
        (id, instance_id, agent_id, is_active, created_at, updated_at) 
        VALUES (UUID(), ?, ?, 1, NOW(), NOW())
      `, [deployInstance.id, secretaryAgent.id]);
      console.log('✅ Novo vínculo criado com sucesso!');
    }

    // Verificar se o cliente está configurado
    if (!deployInstance.client_id) {
      console.log('\n⚠️ Instância não tem cliente vinculado');
      console.log('🔍 Verificando clientes disponíveis...');
      
      const [clients] = await connection.execute(`
        SELECT id, name, user_id 
        FROM clients 
        WHERE is_active = 1
      `);

      if (clients.length > 0) {
        const firstClient = clients[0];
        console.log(`🔄 Vinculando instância ao cliente: ${firstClient.name}`);
        
        await connection.execute(`
          UPDATE whatsapp_instances 
          SET client_id = ? 
          WHERE id = ?
        `, [firstClient.id, deployInstance.id]);
        
        console.log('✅ Cliente vinculado à instância!');
      }
    }

    console.log('\n🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('\n📝 AGORA TESTE:');
    console.log('   1. Envie uma mensagem para o WhatsApp');
    console.log('   2. O agente Secretáriaaaaa deve responder automaticamente');
    console.log('   3. Verifique os logs do servidor');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixAgentBinding();
