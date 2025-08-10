const fetch = require('node-fetch');

async function testWhatsAppAgentsRoute() {
  console.log('🔍 Testando rota de agentes WhatsApp...');

  try {
    // Test the route
    const response = await fetch('http://localhost:5000/api/admin/whatsapp-agents', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper authentication, but we can see the error
      },
    });

    console.log(`📊 Status da resposta: ${response.status}`);
    
    const data = await response.text();
    console.log('📋 Resposta:', data);

  } catch (error) {
    console.error('❌ Erro ao testar rota:', error.message);
  }
}

// Run the script
testWhatsAppAgentsRoute().catch(console.error);