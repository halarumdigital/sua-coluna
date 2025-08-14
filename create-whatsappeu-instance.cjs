const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function createWhatsAppEUInstance() {
  console.log('🚀 Criando instância whatsappeu e configurando agente...');

  let connection;
  try {
    // Create connection using .env variables
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar se a instância já existe
    const [existingInstances] = await connection.execute(
      'SELECT * FROM admin_whatsapp_instances WHERE instance_key = ?',
      ['whatsappeu']
    );

    if (existingInstances.length > 0) {
      console.log('⚠️ Instância whatsappeu já existe no banco de dados');
      console.log('📋 Dados existentes:', existingInstances[0]);
    } else {
      // Criar a instância whatsappeu
      const instanceId = `whatsappeu-${Date.now()}`;
      
      await connection.execute(`
        INSERT INTO admin_whatsapp_instances (
          id, instance_name, instance_key, phone_number, status, 
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        instanceId,
        'WhatsApp EU Instance',
        'whatsappeu',
        null, // phone_number será preenchido quando conectar
        'disconnected',
        true
      ]);

      console.log('✅ Instância whatsappeu criada com sucesso');
      console.log(`📋 ID da instância: ${instanceId}`);
    }

    // Buscar o agente disponível
    const [agents] = await connection.execute('SELECT * FROM global_prompts WHERE is_active = 1');
    
    if (agents.length === 0) {
      console.log('❌ Nenhum agente ativo encontrado');
      return;
    }

    const agent = agents[0];
    console.log(`🤖 Agente encontrado: ${agent.name} (ID: ${agent.id})`);

    // Buscar a instância criada/existente
    const [instances] = await connection.execute(
      'SELECT * FROM admin_whatsapp_instances WHERE instance_key = ?',
      ['whatsappeu']
    );

    const instance = instances[0];

    // Verificar se já existe vinculação
    const [existingBindings] = await connection.execute(
      'SELECT * FROM whatsapp_instance_agent_bindings WHERE instance_id = ? AND agent_id = ?',
      [instance.id, agent.id]
    );

    if (existingBindings.length > 0) {
      console.log('⚠️ Vinculação já existe entre a instância e o agente');
      
      // Garantir que está ativa
      await connection.execute(
        'UPDATE whatsapp_instance_agent_bindings SET is_active = 1, updated_at = NOW() WHERE id = ?',
        [existingBindings[0].id]
      );
      
      console.log('✅ Vinculação ativada');
    } else {
      // Criar vinculação entre instância e agente
      const bindingId = `binding-${Date.now()}`;
      
      await connection.execute(`
        INSERT INTO whatsapp_instance_agent_bindings (
          id, instance_id, agent_id, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NOW(), NOW())
      `, [
        bindingId,
        instance.id,
        agent.id,
        true
      ]);

      console.log('✅ Vinculação criada entre instância e agente');
      console.log(`📋 ID da vinculação: ${bindingId}`);
    }

    // Verificar resultado final
    const [finalBindings] = await connection.execute(`
      SELECT 
        b.*,
        i.instance_name,
        i.instance_key,
        p.name as agent_name
      FROM whatsapp_instance_agent_bindings b
      LEFT JOIN admin_whatsapp_instances i ON b.instance_id = i.id
      LEFT JOIN global_prompts p ON b.agent_id = p.id
      WHERE i.instance_key = 'whatsappeu'
    `);

    console.log('\n🎉 CONFIGURAÇÃO FINALIZADA:');
    if (finalBindings.length > 0) {
      const binding = finalBindings[0];
      console.log(`   • Instância: ${binding.instance_name} (${binding.instance_key})`);
      console.log(`   • Agente: ${binding.agent_name}`);
      console.log(`   • Status: ${binding.is_active ? 'Ativo' : 'Inativo'}`);
      console.log(`   • Binding ID: ${binding.id}`);
    }

    console.log('\n📝 PRÓXIMOS PASSOS:');
    console.log('   1. Conectar a instância whatsappeu ao WhatsApp');
    console.log('   2. Configurar o webhook da instância');
    console.log('   3. Testar enviando uma mensagem para o número');
    console.log('\n💡 O agente responderá automaticamente às mensagens recebidas!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
createWhatsAppEUInstance().catch(console.error);