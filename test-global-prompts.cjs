const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql } = require('drizzle-orm');
require('dotenv').config();

async function testGlobalPrompts() {
  console.log('🔍 Verificando prompts globais...');

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

    // Check if global_prompts table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'global_prompts'
    `, [process.env.MYSQL_DATABASE]);

    if (tables.length === 0) {
      console.log('❌ Tabela global_prompts não existe');
      return;
    }

    console.log('✅ Tabela global_prompts existe');

    // Check prompts
    const [prompts] = await connection.execute('SELECT * FROM global_prompts ORDER BY created_at DESC');
    
    console.log(`📊 Total de prompts globais: ${prompts.length}`);
    
    if (prompts.length > 0) {
      console.log('\n📋 Prompts encontrados:');
      prompts.forEach((prompt, index) => {
        console.log(`${index + 1}. ${prompt.name} (ID: ${prompt.id})`);
        console.log(`   Descrição: ${prompt.description || 'N/A'}`);
        console.log(`   Ativo: ${prompt.is_active ? 'Sim' : 'Não'}`);
        console.log(`   Franchisor ID: ${prompt.franchisor_id}`);
        console.log('');
      });
    } else {
      console.log('⚠️ Nenhum prompt global encontrado');
    }

    // Check franchisors
    const [franchisors] = await connection.execute('SELECT id, company_name FROM franchisors ORDER BY created_at DESC');
    console.log(`📊 Total de franqueadores: ${franchisors.length}`);
    
    if (franchisors.length > 0) {
      console.log('\n🏢 Franqueadores encontrados:');
      franchisors.forEach((franchisor, index) => {
        console.log(`${index + 1}. ${franchisor.company_name} (ID: ${franchisor.id})`);
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
testGlobalPrompts().catch(console.error);