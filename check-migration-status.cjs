const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMigrationStatus() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('🔍 Verificando status da migração...\n');

    // 1. Verificar usuários por role
    const [usersByRole] = await connection.execute(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY role
    `);

    console.log('👥 Usuários por role:');
    usersByRole.forEach(row => {
      console.log(`   ${row.role}: ${row.count} usuário(s)`);
    });

    // 2. Verificar franqueadores
    const [franchisors] = await connection.execute(`
      SELECT f.company_name, f.email, u.first_name, u.last_name, p.name as plan_name
      FROM franchisors f
      JOIN users u ON f.user_id = u.id
      JOIN plans p ON f.plan_id = p.id
    `);

    console.log('\n🏢 Franqueadores:');
    franchisors.forEach(f => {
      console.log(`   ✅ ${f.company_name} (${f.first_name} ${f.last_name}) - ${f.email} - Plano: ${f.plan_name}`);
    });

    // 3. Verificar franquias
    const [franchises] = await connection.execute(`
      SELECT fr.franchise_name, fr.franchise_code, fr.email, u.first_name, u.last_name, 
             fs.company_name as franchisor_name
      FROM franchises fr
      JOIN users u ON fr.user_id = u.id
      JOIN franchisors fs ON fr.franchisor_id = fs.id
    `);

    console.log('\n🏪 Franquias:');
    franchises.forEach(f => {
      console.log(`   ✅ ${f.franchise_name} (${f.franchise_code}) - ${f.first_name} ${f.last_name} - ${f.email}`);
      console.log(`      Franqueador: ${f.franchisor_name}`);
    });

    // 4. Verificar clientes novos
    const [newClients] = await connection.execute(`
      SELECT c.full_name, c.email, c.phone, fr.franchise_name
      FROM clients c
      JOIN franchises fr ON c.franchise_id = fr.id
    `);

    console.log('\n👤 Clientes (nova estrutura):');
    if (newClients.length > 0) {
      newClients.forEach(c => {
        console.log(`   ✅ ${c.full_name} - ${c.email || 'Sem email'} - ${c.phone || 'Sem telefone'}`);
        console.log(`      Franquia: ${c.franchise_name}`);
      });
    } else {
      console.log('   📝 Nenhum cliente na nova estrutura ainda');
    }

    // 5. Verificar dados antigos (backup)
    try {
      const [oldClients] = await connection.execute(`
        SELECT COUNT(*) as count FROM old_clients
      `);
      console.log(`\n📦 Backup: ${oldClients[0].count} registros na tabela old_clients`);
    } catch (error) {
      console.log('\n📦 Backup: Tabela old_clients não encontrada');
    }

    // 6. Verificar estrutura das tabelas relacionadas
    console.log('\n🔗 Verificando integridade das relações:');
    
    // Números de telefone das franquias
    const [phoneNumbers] = await connection.execute(`
      SELECT COUNT(*) as count FROM franchise_phone_numbers
    `);
    console.log(`   📞 Números de telefone: ${phoneNumbers[0].count}`);

    // Agentes das franquias
    const [agents] = await connection.execute(`
      SELECT COUNT(*) as count FROM franchise_agents
    `);
    console.log(`   👨‍💼 Agentes: ${agents[0].count}`);

    // Prompts das franquias
    const [prompts] = await connection.execute(`
      SELECT COUNT(*) as count FROM franchise_prompts
    `);
    console.log(`   💬 Prompts: ${prompts[0].count}`);

    console.log('\n🎉 Verificação de migração concluída!');
    console.log('\n📋 Resumo da nova estrutura:');
    console.log('1. Super Root → Gerencia planos e franqueadores');
    console.log('2. Franqueadores (ex-admins) → Gerenciam franquias');
    console.log('3. Franquias (ex-clients) → Gerenciam clientes finais');
    console.log('4. Clientes → Clientes finais das franquias');

  } catch (error) {
    console.error('❌ Erro ao verificar migração:', error);
  } finally {
    await connection.end();
  }
}

checkMigrationStatus();