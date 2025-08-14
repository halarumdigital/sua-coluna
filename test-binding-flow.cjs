require('dotenv').config();

async function testBindingFlow() {
  console.log('🔍 Testando fluxo completo de vinculação de agentes...\n');

  try {
    // 1. Testar criação de vinculação
    console.log('📝 Testando criação de vinculação...');
    
    const createResponse = await fetch('http://localhost:3000/api/franchise/instance-agent-bindings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceId: 'test-instance-id',
        agentId: 'test-agent-id'
      })
    });

    if (createResponse.ok) {
      const createResult = await createResponse.json();
      console.log('✅ Vinculação criada:', createResult);
    } else {
      const errorData = await createResponse.text();
      console.log('❌ Erro ao criar vinculação:', errorData);
    }

    // 2. Testar listagem de vinculações
    console.log('\n📋 Testando listagem de vinculações...');
    
    const listResponse = await fetch('http://localhost:3000/api/franchise/instance-agent-bindings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (listResponse.ok) {
      const listResult = await listResponse.json();
      console.log('✅ Vinculações listadas:', listResult);
      console.log(`📊 Total de vinculações: ${Array.isArray(listResult) ? listResult.length : 'N/A'}`);
    } else {
      const errorData = await listResponse.text();
      console.log('❌ Erro ao listar vinculações:', errorData);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testBindingFlow();
