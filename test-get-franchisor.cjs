const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
const { sql, eq } = require('drizzle-orm');
require('dotenv').config();

async function testGetFranchisor() {
  console.log('🔍 Testando getFranchisorByUserId...');

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

    const db = drizzle(connection);

    console.log('✅ Conectado ao banco de dados');

    const userId = '7d2f2b74-4df6-43be-9af6-d0cee0246e2e';
    console.log('👤 Testing with User ID:', userId);

    // Test direct SQL query
    const [directResult] = await connection.execute(`
      SELECT id, company_name, user_id
      FROM franchisors 
      WHERE user_id = ?
    `, [userId]);

    console.log('📋 Direct SQL result:', directResult);

    // Test with Drizzle (simulate the actual function)
    try {
      // Define the table structure for this test
      const franchisorsTable = {
        id: 'id',
        userId: 'user_id', // This maps to the database column
        companyName: 'company_name'
      };

      const [drizzleResult] = await connection.execute(`
        SELECT * FROM franchisors WHERE user_id = ?
      `, [userId]);

      console.log('📋 Drizzle-style result:', drizzleResult);

      if (drizzleResult.length > 0) {
        console.log('✅ Franchisor found via Drizzle simulation');
        console.log('🏢 Company:', drizzleResult[0].company_name);
        console.log('🆔 ID:', drizzleResult[0].id);
      } else {
        console.log('❌ No franchisor found via Drizzle simulation');
      }

    } catch (drizzleError) {
      console.error('❌ Drizzle error:', drizzleError);
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
testGetFranchisor().catch(console.error);