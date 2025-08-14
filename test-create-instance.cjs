const fetch = require('node-fetch');

async function testCreateWhatsAppInstance() {
  try {
    console.log('🧪 Testando criação de instância WhatsApp...');
    
    // Primeiro, vamos verificar se a API está respondendo
    console.log('🔍 Verificando se a API está respondendo...');
    
    const response = await fetch('http://localhost:5000/api/admin/whatsapp-instances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instanceName: 'test-instance',
        phoneNumber: '5549999999999'
      })
    });
    
    console.log('📡 Status da resposta:', response.status);
    console.log('📡 Headers da resposta:', response.headers.raw());
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Instância criada com sucesso:', data);
    } else {
      const errorText = await response.text();
      console.log('❌ Erro na resposta:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        console.log('📊 Erro JSON:', errorJson);
      } catch (e) {
        console.log('⚠️ Resposta não é JSON válido');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testCreateWhatsAppInstance();
