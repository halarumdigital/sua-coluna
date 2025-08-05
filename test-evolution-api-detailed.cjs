const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testEvolutionAPIDetailed() {
  console.log('🔍 Teste detalhado da Evolution API...\n');

  try {
    const apiUrl = 'https://apizap.halarum.com.br';
    const token = 'B6D711FCDE4D4FD5936544120E713976';
    
    // 1. Testar diferentes formas de autenticação
    const authVariations = [
      { name: 'apikey header', headers: { 'apikey': token } },
      { name: 'Authorization Bearer', headers: { 'Authorization': `Bearer ${token}` } },
      { name: 'x-api-key header', headers: { 'x-api-key': token } },
      { name: 'API-KEY header', headers: { 'API-KEY': token } },
      { name: 'api_key header', headers: { 'api_key': token } },
    ];

    for (const auth of authVariations) {
      console.log(`🔑 Testando autenticação: ${auth.name}`);
      
      try {
        const response = await fetch(`${apiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            ...auth.headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            instanceName: `teste-${auth.name.replace(/\s+/g, '-')}-${Date.now()}`,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS"
          })
        });
        
        console.log(`   Status: ${response.status}`);
        const responseText = await response.text();
        console.log(`   Resposta: ${responseText.substring(0, 100)}...`);
        
        if (response.ok) {
          console.log('   ✅ SUCESSO!');
          break;
        }
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
      console.log('');
    }

    // 2. Testar outros endpoints para verificar se a autenticação funciona
    console.log('\n📋 Testando outros endpoints...');
    
    const endpoints = [
      '/instances',
      '/instance/fetchInstances',
      '/instance',
      '/manager/findInstances',
      '/auth/login'
    ];

    for (const endpoint of endpoints) {
      console.log(`🔗 Testando: ${endpoint}`);
      
      try {
        const response = await fetch(`${apiUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'apikey': token,
            'Accept': 'application/json'
          }
        });
        
        console.log(`   Status: ${response.status}`);
        
        if (response.status !== 404) {
          const responseText = await response.text();
          console.log(`   Resposta: ${responseText.substring(0, 100)}...`);
          
          if (response.ok) {
            console.log(`   ✅ Endpoint ${endpoint} funcionou!`);
          }
        }
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
      console.log('');
    }

    // 3. Verificar se há requisitos específicos no body
    console.log('\n📝 Testando diferentes formatos de body...');
    
    const bodyVariations = [
      {
        name: 'Minimal',
        body: { instanceName: 'teste-minimal-' + Date.now() }
      },
      {
        name: 'With token',
        body: { 
          instanceName: 'teste-token-' + Date.now(),
          token: token
        }
      },
      {
        name: 'Complete evolution format',
        body: {
          instanceName: 'teste-complete-' + Date.now(),
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
          webhook: null,
          events: []
        }
      }
    ];

    for (const variation of bodyVariations) {
      console.log(`📦 Testando body: ${variation.name}`);
      
      try {
        const response = await fetch(`${apiUrl}/instance/create`, {
          method: 'POST',
          headers: {
            'apikey': token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(variation.body)
        });
        
        console.log(`   Status: ${response.status}`);
        const responseText = await response.text();
        console.log(`   Resposta: ${responseText.substring(0, 200)}...`);
        
        if (response.ok) {
          console.log('   ✅ SUCESSO!');
          break;
        }
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

testEvolutionAPIDetailed();