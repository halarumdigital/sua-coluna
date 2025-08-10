const fetch = require('node-fetch');
require('dotenv').config();

async function testAgentsAPI() {
  console.log('🔍 Testando API de agentes WhatsApp...');

  try {
    // Test the agents API endpoint
    const response = await fetch('http://localhost:5000/api/admin/whatsapp-agents', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you'd need proper authentication
        // For testing, we'll see what happens without auth
      }
    });

    console.log(`📊 Status da resposta: ${response.status}`);
    console.log(`📊 Status text: ${response.statusText}`);

    if (response.ok) {
      const agents = await response.json();
      console.log(`✅ Agentes encontrados: ${agents.length}`);
      
      if (agents.length > 0) {
        console.log('\n📋 Agentes retornados pela API:');
        agents.forEach((agent, index) => {
          console.log(`${index + 1}. ${agent.name} (ID: ${agent.id})`);
          console.log(`   Descrição: ${agent.description || 'N/A'}`);
          console.log(`   Tipo: ${agent.type}`);
          console.log(`   Ativo: ${agent.isActive ? 'Sim' : 'Não'}`);
          console.log('');
        });
      } else {
        console.log('⚠️ Nenhum agente retornado pela API');
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Erro na API: ${errorText}`);
    }

  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Dica: Certifique-se de que o servidor está rodando na porta 5000');
      console.log('   Execute: npm run dev');
    }
  }
}

// Run the script
testAgentsAPI().catch(console.error);