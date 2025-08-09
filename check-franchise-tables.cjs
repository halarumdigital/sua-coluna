const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFranchiseTables() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('🔍 Verificando tabelas do sistema de franquias...\n');

    // Verificar tabelas criadas
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('plans', 'franchisors', 'franchises', 'franchise_phone_numbers', 'franchise_agents', 'franchise_prompts')
      ORDER BY TABLE_NAME
    `, [process.env.MYSQL_DATABASE]);

    console.log('📋 Tabelas criadas:');
    tables.forEach(table => {
      console.log(`✅ ${table.TABLE_NAME}`);
    });

    // Verificar usuário super root
    const [users] = await connection.execute(`
      SELECT email, first_name, last_name, role, active 
      FROM users 
      WHERE role = 'super_root'
    `);

    console.log('\n👤 Usuários Super Root:');
    users.forEach(user => {
      console.log(`✅ ${user.first_name} ${user.last_name} (${user.email}) - ${user.role} - ${user.active ? 'Ativo' : 'Inativo'}`);
    });

    // Verificar planos criados
    const [plans] = await connection.execute(`
      SELECT name, max_franchises, max_phone_numbers, max_agents, max_prompts, monthly_price, active
      FROM plans
      ORDER BY monthly_price
    `);

    console.log('\n📦 Planos disponíveis:');
    plans.forEach(plan => {
      console.log(`✅ ${plan.name} - R$ ${plan.monthly_price}`);
      console.log(`   📊 Franquias: ${plan.max_franchises} | Números: ${plan.max_phone_numbers} | Agentes: ${plan.max_agents} | Prompts: ${plan.max_prompts}`);
    });

    // Verificar estrutura da tabela users
    const [userColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
    `, [process.env.MYSQL_DATABASE]);

    console.log('\n🔧 Estrutura da coluna role na tabela users:');
    userColumns.forEach(col => {
      console.log(`✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH}) - Default: ${col.COLUMN_DEFAULT}`);
    });

    // Verificar se a coluna franchise_id foi adicionada na tabela clients
    const [clientColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients' AND COLUMN_NAME = 'franchise_id'
    `, [process.env.MYSQL_DATABASE]);

    console.log('\n🔧 Coluna franchise_id na tabela clients:');
    if (clientColumns.length > 0) {
      clientColumns.forEach(col => {
        console.log(`✅ ${col.COLUMN_NAME}: ${col.DATA_TYPE}(${col.CHARACTER_MAXIMUM_LENGTH}) - Nullable: ${col.IS_NULLABLE}`);
      });
    } else {
      console.log('❌ Coluna franchise_id não encontrada na tabela clients');
    }

    console.log('\n🎉 Verificação concluída!');

  } catch (error) {
    console.error('❌ Erro ao verificar tabelas:', error);
  } finally {
    await connection.end();
  }
}

checkFranchiseTables();