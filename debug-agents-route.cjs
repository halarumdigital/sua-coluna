const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function debugAgentsRoute() {
  console.log('🔍 Debug da rota de agentes...');

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

    // Simulate the exact logic from the route
    const userId = '7d2f2b74-4df6-43be-9af6-d0cee0246e2e'; // Your user ID
    console.log('👤 User ID:', userId);

    // Get user
    const [users] = await connection.execute(`
      SELECT id, email, role, first_name, last_name 
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      console.log('❌ Usuário não encontrado');
      return;
    }

    const user = users[0];
    console.log('👤 User found:', `${user.first_name} ${user.last_name} (${user.role})`);

    // Check role
    if (user.role !== 'franchisor' && user.role !== 'admin' && user.role !== 'super_root') {
      console.log('❌ Access denied for role:', user.role);
      return;
    }

    console.log('✅ Role check passed');

    // Get franchisor (simulate getFranchisorByUserId)
    const [franchisors] = await connection.execute(`
      SELECT id, company_name, user_id
      FROM franchisors 
      WHERE user_id = ?
    `, [userId]);

    if (franchisors.length === 0) {
      console.log('❌ Franchisor not found for user');
      return;
    }

    const franchisor = franchisors[0];
    console.log('🏢 Franchisor found:', franchisor.company_name, franchisor.id);

    // Get global prompts (simulate getGlobalPrompts)
    const [prompts] = await connection.execute(`
      SELECT id, name, description, is_active, created_at
      FROM global_prompts 
      WHERE franchisor_id = ?
      ORDER BY created_at DESC
    `, [franchisor.id]);

    console.log('📋 Global prompts found:', prompts.length);

    if (prompts.length === 0) {
      console.log('⚠️ No prompts found - this is why agents array is empty!');
      return;
    }

    // Transform to agents format (simulate the mapping)
    const agents = prompts.map(prompt => ({
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      type: 'global',
      isActive: prompt.is_active,
      createdAt: prompt.created_at
    }));

    console.log('🤖 Agents that should be returned:');
    console.log(JSON.stringify(agents, null, 2));

    // Check if isActive is truthy
    const activeAgents = agents.filter(agent => agent.isActive);
    console.log('🤖 Active agents (filtered by frontend):', activeAgents.length);

    if (activeAgents.length === 0) {
      console.log('⚠️ No active agents - check if is_active is 1 in database');
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
debugAgentsRoute().catch(console.error);