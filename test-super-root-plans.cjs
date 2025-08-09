const { db } = require('./server/db.ts');
const { plans } = require('./shared/schema.ts');

async function testPlansSystem() {
  console.log('🧪 Testando sistema de planos...\n');

  try {
    // 1. Verificar se a tabela de planos existe
    console.log('1. Verificando tabela de planos...');
    const existingPlans = await db.select().from(plans);
    console.log(`✅ Tabela encontrada com ${existingPlans.length} planos\n`);

    // 2. Criar planos de exemplo se não existirem
    if (existingPlans.length === 0) {
      console.log('2. Criando planos de exemplo...');
      
      const samplePlans = [
        {
          name: 'Plano Básico',
          description: 'Ideal para pequenas empresas que estão começando',
          maxFranchises: 1,
          maxPhoneNumbers: 2,
          maxAgents: 3,
          maxPrompts: 5,
          monthlyPrice: '99.90',
          features: ['WhatsApp Integration', 'AI Assistant', 'Customer Management', 'Analytics Dashboard'],
          active: true
        },
        {
          name: 'Plano Profissional',
          description: 'Para empresas em crescimento que precisam de mais recursos',
          maxFranchises: 5,
          maxPhoneNumbers: 10,
          maxAgents: 15,
          maxPrompts: 20,
          monthlyPrice: '299.90',
          features: ['WhatsApp Integration', 'AI Assistant', 'Customer Management', 'Analytics Dashboard', 'Multi-user Support', 'API Access', 'Priority Support'],
          active: true
        },
        {
          name: 'Plano Enterprise',
          description: 'Solução completa para grandes empresas',
          maxFranchises: 50,
          maxPhoneNumbers: 100,
          maxAgents: 200,
          maxPrompts: 100,
          monthlyPrice: '999.90',
          features: ['WhatsApp Integration', 'AI Assistant', 'Customer Management', 'Analytics Dashboard', 'Multi-user Support', 'API Access', 'Custom Branding', 'Priority Support', 'Advanced Analytics', 'Custom Integrations', 'Backup & Recovery', 'Training & Onboarding'],
          active: true
        }
      ];

      for (const planData of samplePlans) {
        const [newPlan] = await db.insert(plans).values(planData).returning();
        console.log(`✅ Plano criado: ${newPlan.name} - R$ ${newPlan.monthlyPrice}/mês`);
      }
      console.log('');
    }

    // 3. Listar todos os planos
    console.log('3. Listando todos os planos:');
    const allPlans = await db.select().from(plans);
    
    allPlans.forEach(plan => {
      const features = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]');
      console.log(`📦 ${plan.name}`);
      console.log(`   💰 Preço: R$ ${plan.monthlyPrice}/mês`);
      console.log(`   🏢 Máx. Franquias: ${plan.maxFranchises}`);
      console.log(`   📱 Máx. Números: ${plan.maxPhoneNumbers}`);
      console.log(`   🤖 Máx. Agentes: ${plan.maxAgents}`);
      console.log(`   ⚡ Máx. Prompts: ${plan.maxPrompts}`);
      console.log(`   ✨ Recursos: ${features.length} inclusos`);
      console.log(`   📊 Status: ${plan.active ? 'Ativo' : 'Inativo'}`);
      console.log('');
    });

    // 4. Testar busca por plano específico
    console.log('4. Testando busca por plano específico...');
    const basicPlan = allPlans.find(p => p.name === 'Plano Básico');
    if (basicPlan) {
      console.log(`✅ Plano encontrado: ${basicPlan.name}`);
      const features = Array.isArray(basicPlan.features) ? basicPlan.features : JSON.parse(basicPlan.features || '[]');
      console.log(`   Recursos inclusos: ${features.join(', ')}`);
    }
    console.log('');

    // 5. Estatísticas dos planos
    console.log('5. Estatísticas dos planos:');
    const activePlans = allPlans.filter(p => p.active);
    const totalRevenue = allPlans.reduce((sum, plan) => sum + parseFloat(plan.monthlyPrice), 0);
    
    console.log(`📊 Total de planos: ${allPlans.length}`);
    console.log(`✅ Planos ativos: ${activePlans.length}`);
    console.log(`💰 Receita potencial mensal: R$ ${totalRevenue.toFixed(2)}`);
    console.log(`📈 Preço médio: R$ ${(totalRevenue / allPlans.length).toFixed(2)}`);

    console.log('\n🎉 Teste do sistema de planos concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    throw error;
  }
}

// Executar teste
testPlansSystem()
  .then(() => {
    console.log('\n✅ Todos os testes passaram!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error);
    process.exit(1);
  });