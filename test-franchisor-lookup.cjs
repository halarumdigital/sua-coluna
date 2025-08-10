const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function testFranchisorLookup() {
  console.log('🔍 Testando busca de franqueador...');

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

    // Check users and their roles
    const [users] = await connection.execute(`
      SELECT id, email, role, first_name, last_name 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Usuários encontrados: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\n👥 Usuários no sistema:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Role: ${user.role}`);
        console.log('');
      });
    }

    // Check franchisors
    const [franchisors] = await connection.execute(`
      SELECT id, company_name, user_id, created_at
      FROM franchisors 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Franqueadores encontrados: ${franchisors.length}`);
    
    if (franchisors.length > 0) {
      console.log('\n🏢 Franqueadores no sistema:');
      franchisors.forEach((franchisor, index) => {
        console.log(`${index + 1}. ${franchisor.company_name}`);
        console.log(`   ID: ${franchisor.id}`);
        console.log(`   User ID: ${franchisor.user_id}`);
        console.log('');
      });
    }

    // Test the relationship
    console.log('\n🔗 Testando relacionamento usuário-franqueador:');
    for (const user of users) {
      const franchisor = franchisors.find(f => f.user_id === user.id);
      if (franchisor) {
        console.log(`✅ ${user.first_name} ${user.last_name} → ${franchisor.company_name}`);
      } else {
        console.log(`❌ ${user.first_name} ${user.last_name} → Sem franqueador vinculado`);
      }
    }

    // Check global prompts for each franchisor
    console.log('\n📋 Prompts globais por franqueador:');
    for (const franchisor of franchisors) {
      const [prompts] = await connection.execute(`
        SELECT id, name, description, is_active
        FROM global_prompts 
        WHERE franchisor_id = ?
        ORDER BY created_at DESC
      `, [franchisor.id]);
      
      console.log(`🏢 ${franchisor.company_name}: ${prompts.length} prompts`);
      prompts.forEach((prompt, index) => {
        console.log(`   ${index + 1}. ${prompt.name} (${prompt.is_active ? 'Ativo' : 'Inativo'})`);
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
testFranchisorLookup().catch(console.error);