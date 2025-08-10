const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function testSpecificUser() {
  console.log('🔍 Testando usuário específico...');

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

    // Find the specific user
    const [users] = await connection.execute(`
      SELECT id, email, role, first_name, last_name 
      FROM users 
      WHERE email = ?
    `, ['producao@nataliaefranciscotelasltda.com.br']);
    
    if (users.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    const user = users[0];
    console.log('👤 Usuário encontrado:');
    console.log(`   Nome: ${user.first_name} ${user.last_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user.id}`);

    // Find the franchisor for this user
    const [franchisors] = await connection.execute(`
      SELECT id, company_name, user_id
      FROM franchisors 
      WHERE user_id = ?
    `, [user.id]);
    
    if (franchisors.length === 0) {
      console.log('❌ Franqueador não encontrado para este usuário');
      return;
    }

    const franchisor = franchisors[0];
    console.log('🏢 Franqueador encontrado:');
    console.log(`   Nome: ${franchisor.company_name}`);
    console.log(`   ID: ${franchisor.id}`);

    // Find global prompts for this franchisor
    const [prompts] = await connection.execute(`
      SELECT id, name, description, is_active, created_at
      FROM global_prompts 
      WHERE franchisor_id = ?
      ORDER BY created_at DESC
    `, [franchisor.id]);
    
    console.log(`📋 Prompts globais encontrados: ${prompts.length}`);
    
    if (prompts.length > 0) {
      console.log('\n📋 Prompts que deveriam aparecer como agentes:');
      prompts.forEach((prompt, index) => {
        console.log(`${index + 1}. ${prompt.name}`);
        console.log(`   ID: ${prompt.id}`);
        console.log(`   Descrição: ${prompt.description || 'N/A'}`);
        console.log(`   Ativo: ${prompt.is_active ? 'Sim' : 'Não'}`);
        console.log(`   Criado em: ${prompt.created_at}`);
        console.log('');
      });

      // Simulate the API response
      const agents = prompts.map(prompt => ({
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
        type: 'global',
        isActive: prompt.is_active,
        createdAt: prompt.created_at
      }));

      console.log('🤖 Resposta da API simulada:');
      console.log(JSON.stringify(agents, null, 2));
    } else {
      console.log('⚠️ Nenhum prompt encontrado para este franqueador');
    }

    // Check WhatsApp instances for this user context
    const [instances] = await connection.execute(`
      SELECT id, instance_name, instance_key, phone_number, status, is_active
      FROM admin_whatsapp_instances 
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📱 Instâncias WhatsApp disponíveis: ${instances.length}`);
    instances.forEach((instance, index) => {
      console.log(`${index + 1}. ${instance.instance_name} (${instance.instance_key})`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Ativo: ${instance.is_active ? 'Sim' : 'Não'}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
testSpecificUser().catch(console.error);