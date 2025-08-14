const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function checkClientWhatsAppInstances() {
  console.log('🔍 Verificando instâncias de cliente WhatsApp...');

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

    // Check client WhatsApp instances
    const [instances] = await connection.execute('SELECT * FROM whatsapp_instances ORDER BY created_at DESC');
    console.log(`📊 Instâncias WhatsApp de Cliente: ${instances.length}`);
    
    if (instances.length > 0) {
      console.log('\n📱 Instâncias encontradas:');
      instances.forEach((instance, index) => {
        console.log(`${index + 1}. ${instance.instance_name || 'N/A'} (ID: ${instance.id})`);
        console.log(`   Chave: ${instance.instance_key}`);
        console.log(`   Cliente ID: ${instance.client_id}`);
        console.log(`   Telefone: ${instance.phone_number || 'N/A'}`);
        console.log(`   Status: ${instance.status}`);
        console.log(`   Ativo: ${instance.is_active ? 'Sim' : 'Não'}`);
        console.log(`   Webhook: ${instance.webhook || 'N/A'}`);
        console.log('');
      });

      // Procurar especificamente pela instância whatsappeu
      const whatsappeuInstance = instances.find(i => i.instance_key === 'whatsappeu');
      if (whatsappeuInstance) {
        console.log('🎯 INSTÂNCIA WHATSAPPEU ENCONTRADA:');
        console.log(`   • ID: ${whatsappeuInstance.id}`);
        console.log(`   • Nome: ${whatsappeuInstance.instance_name || 'N/A'}`);
        console.log(`   • Cliente ID: ${whatsappeuInstance.client_id}`);
        console.log(`   • Status: ${whatsappeuInstance.status}`);
        console.log(`   • Ativo: ${whatsappeuInstance.is_active ? 'Sim' : 'Não'}`);
        console.log(`   • Webhook: ${whatsappeuInstance.webhook || 'Não configurado'}`);

        // Verificar se o cliente existe
        const [clients] = await connection.execute('SELECT * FROM clients WHERE id = ?', [whatsappeuInstance.client_id]);
        if (clients.length > 0) {
          const client = clients[0];
          console.log(`   • Cliente: ${client.name} (User ID: ${client.user_id})`);
        }
      } else {
        console.log('❌ Instância whatsappeu não encontrada');
      }
    }

    // Check global prompts (agents)
    const [prompts] = await connection.execute('SELECT * FROM global_prompts WHERE is_active = 1');
    console.log(`\n🤖 Agentes disponíveis: ${prompts.length}`);
    
    if (prompts.length > 0) {
      prompts.forEach((prompt, index) => {
        console.log(`${index + 1}. ${prompt.name} (ID: ${prompt.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
checkClientWhatsAppInstances().catch(console.error);