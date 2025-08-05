const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testClientWhatsAppSettings() {
  console.log('🧪 Testando rota /api/client/whatsapp-settings...\n');

  try {
    const baseUrl = 'http://localhost:5000';
    
    // 1. Login como cliente
    console.log('1️⃣ Fazendo login como cliente...');
    const clientLoginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br',
        password: '123456'
      })
    });

    if (!clientLoginResponse.ok) {
      console.log('❌ Falha no login do cliente');
      console.log('Status:', clientLoginResponse.status);
      console.log('Response:', await clientLoginResponse.text());
      return;
    }

    const clientCookies = clientLoginResponse.headers.get('set-cookie');
    console.log('✅ Login do cliente bem-sucedido');

    // 2. Testar rota de configurações WhatsApp
    console.log('\n2️⃣ Testando /api/client/whatsapp-settings...');
    const settingsResponse = await fetch(`${baseUrl}/api/client/whatsapp-settings`, {
      method: 'GET',
      headers: {
        'Cookie': clientCookies
      }
    });

    console.log('Status:', settingsResponse.status);
    console.log('Headers:', Object.fromEntries(settingsResponse.headers.entries()));

    if (!settingsResponse.ok) {
      console.log('❌ Erro ao buscar configurações');
      const errorText = await settingsResponse.text();
      console.log('Response:', errorText);
      return;
    }

    const settings = await settingsResponse.json();
    console.log('✅ Configurações obtidas com sucesso:');
    console.log('   URL:', settings.evolutionApiUrl);
    console.log('   Token configurado:', settings.globalToken ? 'Sim' : 'Não');
    console.log('   Ativo:', settings.isActive);
    console.log('   Objeto completo:', JSON.stringify(settings, null, 2));

    // 3. Verificar se todos os campos necessários estão presentes
    console.log('\n3️⃣ Validando campos necessários...');
    const requiredFields = ['evolutionApiUrl', 'globalToken', 'isActive'];
    let allFieldsPresent = true;

    requiredFields.forEach(field => {
      if (settings[field] === undefined || settings[field] === null) {
        console.log(`❌ Campo ausente: ${field}`);
        allFieldsPresent = false;
      } else {
        console.log(`✅ Campo presente: ${field} = ${settings[field]}`);
      }
    });

    if (allFieldsPresent && settings.evolutionApiUrl && settings.globalToken && settings.isActive) {
      console.log('\n🎉 Todas as configurações estão corretas! O botão deveria estar habilitado.');
    } else {
      console.log('\n⚠️ Algumas configurações estão faltando ou inativas.');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testClientWhatsAppSettings();