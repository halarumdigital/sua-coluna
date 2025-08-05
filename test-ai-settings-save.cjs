require('dotenv').config();
const fetch = require('node-fetch');

async function testAISettingsSave() {
  console.log('🧪 Testando salvamento das configurações de IA...');
  
  const baseUrl = 'http://localhost:5000';
  
  try {
    // 1. Primeiro fazer login para obter o token
    console.log('🔐 Fazendo login...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'client@teste.com',
        password: '123456'
      })
    });
    
    if (!loginResponse.ok) {
      console.error('❌ Erro no login:', await loginResponse.text());
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login realizado:', loginData.message);
    
    // Extrair cookies de sessão
    const cookies = loginResponse.headers.get('set-cookie');
    
    // 2. Testar salvamento das configurações
    console.log('\n💾 Testando salvamento...');
    const aiSettings = {
      systemPrompt: 'Você é a Alice, assistente da Sua Coluna.',
      maxTokens: 150,
      temperature: 0.7
    };
    
    console.log('📋 Dados a salvar:', aiSettings);
    
    const saveResponse = await fetch(`${baseUrl}/api/client/ai-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      },
      body: JSON.stringify(aiSettings)
    });
    
    console.log(`📊 Status da resposta: ${saveResponse.status}`);
    console.log(`📋 Headers:`, Object.fromEntries(saveResponse.headers.entries()));
    
    const responseText = await saveResponse.text();
    console.log(`📄 Resposta raw:`, responseText);
    
    if (saveResponse.ok) {
      try {
        const responseJson = JSON.parse(responseText);
        console.log('✅ Sucesso:', responseJson);
      } catch (jsonError) {
        console.error('❌ Erro ao fazer parse do JSON válido:', jsonError);
      }
    } else {
      console.error('❌ Erro HTTP:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

testAISettingsSave().catch(console.error);