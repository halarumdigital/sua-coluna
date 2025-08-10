const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function testWhatsAppSystem() {
  console.log('🔍 Verificando sistema WhatsApp completo...');

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

    // Check global prompts
    const [prompts] = await connection.execute('SELECT * FROM global_prompts ORDER BY created_at DESC');
    console.log(`📊 Prompts globais: ${prompts.length}`);
    
    if (prompts.length > 0) {
      console.log('\n📋 Prompts (Agentes) disponíveis:');
      prompts.forEach((prompt, index) => {
        console.log(`${index + 1}. ${prompt.name} (ID: ${prompt.id})`);
        console.log(`   Descrição: ${prompt.description || 'N/A'}`);
        console.log(`   Ativo: ${prompt.is_active ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }

    // Check WhatsApp instances
    const [instances] = await connection.execute('SELECT * FROM admin_whatsapp_instances ORDER BY created_at DESC');
    console.log(`📊 Instâncias WhatsApp: ${instances.length}`);
    
    if (instances.length > 0) {
      console.log('\n📱 Instâncias WhatsApp:');
      instances.forEach((instance, index) => {
        console.log(`${index + 1}. ${instance.instance_name} (ID: ${instance.id})`);
        console.log(`   Chave: ${instance.instance_key}`);
        console.log(`   Telefone: ${instance.phone_number}`);
        console.log(`   Status: ${instance.status}`);
        console.log(`   Ativo: ${instance.is_active ? 'Sim' : 'Não'}`);
        console.log('');
      });
    }

    // Check bindings
    const [bindings] = await connection.execute(`
      SELECT 
        b.*,
        i.instance_name,
        p.name as prompt_name
      FROM whatsapp_instance_agent_bindings b
      LEFT JOIN admin_whatsapp_instances i ON b.instance_id = i.id
      LEFT JOIN global_prompts p ON b.agent_id = p.id
      ORDER BY b.created_at DESC
    `);
    
    console.log(`📊 Vinculações Instância-Agente: ${bindings.length}`);
    
    if (bindings.length > 0) {
      console.log('\n🔗 Vinculações ativas:');
      bindings.forEach((binding, index) => {
        console.log(`${index + 1}. ${binding.instance_name} ↔ ${binding.prompt_name}`);
        console.log(`   Binding ID: ${binding.id}`);
        console.log(`   Ativo: ${binding.is_active ? 'Sim' : 'Não'}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhuma vinculação encontrada');
      console.log('💡 Para testar o sistema:');
      console.log('   1. Acesse /admin/whatsapp');
      console.log('   2. Crie uma instância WhatsApp na aba "Instâncias"');
      console.log('   3. Vá para a aba "Instâncias & Agentes"');
      console.log('   4. Vincule o prompt "Prompt de SDR" à instância criada');
    }

    // Summary
    console.log('\n📈 RESUMO DO SISTEMA:');
    console.log(`   • Prompts Globais (Agentes): ${prompts.length}`);
    console.log(`   • Instâncias WhatsApp: ${instances.length}`);
    console.log(`   • Vinculações Ativas: ${bindings.filter(b => b.is_active).length}`);
    console.log(`   • Vinculações Total: ${bindings.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
testWhatsAppSystem().catch(console.error);