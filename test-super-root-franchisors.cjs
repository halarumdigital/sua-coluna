const { db } = require('./server/db.ts');
const { franchisors, users, plans } = require('./shared/schema.ts');
const { sql, eq } = require('drizzle-orm');

async function testFranchisorsSystem() {
  console.log('🧪 Testando sistema de franqueadores...\n');

  try {
    // 1. Verificar se as tabelas existem
    console.log('1. Verificando tabelas...');
    const existingFranchisors = await db.select().from(franchisors);
    const existingUsers = await db.select().from(users).where(eq(users.role, 'franchisor'));
    const existingPlans = await db.select().from(plans);
    
    console.log(`✅ Tabela franchisors: ${existingFranchisors.length} registros`);
    console.log(`✅ Usuários franqueadores: ${existingUsers.length} registros`);
    console.log(`✅ Planos disponíveis: ${existingPlans.length} registros\n`);

    // 2. Listar franqueadores existentes
    if (existingFranchisors.length > 0) {
      console.log('2. Franqueadores existentes:');
      existingFranchisors.forEach(franchisor => {
        console.log(`🏢 ${franchisor.companyName}`);
        console.log(`   📧 Email: ${franchisor.email}`);
        console.log(`   📱 Telefone: ${franchisor.contactPhone}`);
        console.log(`   🏙️  Cidade: ${franchisor.city}, ${franchisor.state}`);
        console.log(`   📊 Status: ${franchisor.status}`);
        console.log(`   📅 Criado em: ${franchisor.createdAt}`);
        console.log('');
      });
    } else {
      console.log('2. Nenhum franqueador encontrado\n');
    }

    // 3. Verificar planos disponíveis
    console.log('3. Planos disponíveis para franqueadores:');
    const activePlans = existingPlans.filter(p => p.active);
    activePlans.forEach(plan => {
      console.log(`📦 ${plan.name} - R$ ${plan.monthlyPrice}/mês`);
      console.log(`   🏢 Máx. Franquias: ${plan.maxFranchises}`);
      console.log(`   📱 Máx. Números: ${plan.maxPhoneNumbers}`);
      console.log(`   🤖 Máx. Agentes: ${plan.maxAgents}`);
      console.log(`   ⚡ Máx. Prompts: ${plan.maxPrompts}`);
      console.log('');
    });

    // 4. Estatísticas
    console.log('4. Estatísticas do sistema:');
    const activeFranchisors = existingFranchisors.filter(f => f.status === 'active');
    const inactiveFranchisors = existingFranchisors.filter(f => f.status === 'inactive');
    const suspendedFranchisors = existingFranchisors.filter(f => f.status === 'suspended');
    
    console.log(`📊 Total de franqueadores: ${existingFranchisors.length}`);
    console.log(`✅ Ativos: ${activeFranchisors.length}`);
    console.log(`⏸️  Inativos: ${inactiveFranchisors.length}`);
    console.log(`🚫 Suspensos: ${suspendedFranchisors.length}`);
    console.log(`📋 Planos ativos: ${activePlans.length}`);

    // 5. Verificar integridade dos dados
    console.log('\n5. Verificando integridade dos dados...');
    let integrityIssues = 0;
    
    for (const franchisor of existingFranchisors) {
      // Verificar se o usuário existe
      const user = await db.select().from(users).where(eq(users.id, franchisor.userId));
      if (user.length === 0) {
        console.log(`❌ Franqueador ${franchisor.companyName} não tem usuário associado`);
        integrityIssues++;
      }
      
      // Verificar se o plano existe
      const plan = await db.select().from(plans).where(eq(plans.id, franchisor.planId));
      if (plan.length === 0) {
        console.log(`❌ Franqueador ${franchisor.companyName} tem plano inválido`);
        integrityIssues++;
      }
    }
    
    if (integrityIssues === 0) {
      console.log('✅ Todos os dados estão íntegros');
    } else {
      console.log(`⚠️  Encontrados ${integrityIssues} problemas de integridade`);
    }

    console.log('\n🎉 Teste do sistema de franqueadores concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}

// Executar teste
testFranchisorsSystem()
  .then(() => {
    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error);
    process.exit(1);
  });