const fetch = require('node-fetch');

async function testSimpleLogin() {
  console.log('🔐 Testando login com diferentes credenciais...\n');

  const testCredentials = [
    { email: 'admin@admin.com', password: 'admin123', role: 'admin' },
    { email: 'admin@example.com', password: 'password123', role: 'admin' },
    { email: 'client@example.com', password: 'password123', role: 'client' },
    { email: 'user@example.com', password: 'password123', role: 'user' },
    { email: 'test@test.com', password: 'test123', role: 'test' }
  ];

  for (const cred of testCredentials) {
    console.log(`Tentando login com: ${cred.email} (${cred.role})`);
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: cred.email,
          password: cred.password
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Login bem-sucedido!`);
        console.log(`   Usuário: ${data.user.firstName} ${data.user.lastName}`);
        console.log(`   Role: ${data.user.role}`);
        console.log(`   Email: ${data.user.email}\n`);
        
        // Se encontrou um admin, testar configurações do WhatsApp
        if (data.user.role === 'admin') {
          console.log('🔧 Testando configurações do WhatsApp...');
          
          const setCookieHeader = response.headers.get('set-cookie');
          if (setCookieHeader) {
            const settingsResponse = await fetch('http://localhost:5000/api/admin/whatsapp-settings', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Cookie': setCookieHeader
              },
            });

            if (settingsResponse.ok) {
              const settings = await settingsResponse.json();
              console.log('✅ Configurações do WhatsApp encontradas:');
              console.log(`   URL: ${settings.evolutionApiUrl}`);
              console.log(`   Token: ${settings.globalToken ? '***' : 'Não configurado'}`);
              console.log(`   Ativo: ${settings.isActive}\n`);
            } else {
              console.log('❌ Não foi possível acessar configurações do WhatsApp\n');
            }
          }
        }
        
        return; // Encontrou um usuário válido, parar aqui
      } else {
        const error = await response.json();
        console.log(`❌ Falha: ${error.message}\n`);
      }
    } catch (error) {
      console.log(`❌ Erro: ${error.message}\n`);
    }
  }

  console.log('❌ Nenhuma credencial funcionou!');
}

testSimpleLogin().catch(console.error); 