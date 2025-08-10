const fetch = require('node-fetch');
const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testAPICall() {
  console.log('🔍 Testando chamada da API como o frontend...');

  let connection;
  try {
    // First, let's check what the server logs should show
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conectado ao banco de dados');

    // Check if the server is running
    try {
      const healthCheck = await fetch('http://localhost:5000/api/system/settings');
      console.log('🌐 Server status:', healthCheck.status);
      
      if (!healthCheck.ok) {
        console.log('❌ Server não está respondendo corretamente');
        return;
      }
    } catch (serverError) {
      console.log('❌ Server não está rodando ou não está acessível');
      console.log('💡 Certifique-se de que o servidor está rodando na porta 5000');
      return;
    }

    // Now let's check what should happen in the database
    const userId = '7d2f2b74-4df6-43be-9af6-d0cee0246e2e';
    
    // Step 1: Check user
    const [users] = await connection.execute(`
      SELECT id, email, role, first_name, last_name 
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      console.log('❌ User not found in database');
      return;
    }

    const user = users[0];
    console.log('👤 User in database:', `${user.first_name} ${user.last_name} (${user.role})`);

    // Step 2: Check franchisor
    const [franchisors] = await connection.execute(`
      SELECT id, company_name, user_id
      FROM franchisors 
      WHERE user_id = ?
    `, [userId]);

    if (franchisors.length === 0) {
      console.log('❌ Franchisor not found in database');
      return;
    }

    const franchisor = franchisors[0];
    console.log('🏢 Franchisor in database:', franchisor.company_name, franchisor.id);

    // Step 3: Check global prompts
    const [prompts] = await connection.execute(`
      SELECT id, name, description, is_active, created_at
      FROM global_prompts 
      WHERE franchisor_id = ?
      ORDER BY created_at DESC
    `, [franchisor.id]);

    console.log('📋 Prompts in database:', prompts.length);

    if (prompts.length > 0) {
      console.log('📋 Expected API response:');
      const expectedAgents = prompts.map(prompt => ({
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
        type: 'global',
        isActive: prompt.is_active,
        createdAt: prompt.created_at
      }));
      console.log(JSON.stringify(expectedAgents, null, 2));
    }

    console.log('\n🔍 Now checking what the server logs should show...');
    console.log('Expected logs:');
    console.log('1. 🔍 WhatsApp Agents route called');
    console.log('2. 👤 User ID:', userId);
    console.log('3. 👤 User found:', `${user.first_name} ${user.last_name} (${user.role})`);
    console.log('4. 🏢 Franchisor found for user:', franchisor.company_name, franchisor.id);
    console.log('5. 📋 Global prompts found for franchisor:', prompts.length);
    console.log('6. 📋 Total global prompts found:', prompts.length);
    console.log('7. 🤖 Agents to return:', prompts.length);

    console.log('\n💡 If you see these logs in the server console, the route is working.');
    console.log('💡 If you don\'t see these logs, the route is not being called.');
    console.log('💡 If you see different values, there\'s a bug in the implementation.');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
testAPICall().catch(console.error);