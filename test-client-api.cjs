const fetch = require('node-fetch');

async function testClientAPI() {
  try {
    console.log('Testando API de clientes...');
    
    // Test data
    const testClient = {
      companyName: "Empresa Teste API",
      legalName: "Empresa Teste API Sociedade Limitada",
      street: "Rua da API",
      number: "456",
      complement: "Andar 2",
      neighborhood: "Tech District",
      city: "São Paulo",
      state: "SP",
      zipCode: "01234-567",
      contactPhone: "(11) 99999-1234",
      whatsapp: "(11) 88888-1234",
      email: "api@empresateste.com",
      website: "https://www.empresatesteapi.com",
      systemPassword: "123456",
      cpfCnpj: "98.765.432/0001-10",
      businessSector: "Tecnologia da Informação",
      generalNotes: "Cliente criado via API para teste"
    };
    
    // First, login to get session
    console.log('Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@sistema.com',
        password: 'admin123'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login realizado:', loginData.message);
    
    // Get cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    
    // Create client
    console.log('Criando cliente via API...');
    const createResponse = await fetch('http://localhost:5000/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify(testClient)
    });
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Create client failed: ${createResponse.status} - ${errorText}`);
    }
    
    const clientData = await createResponse.json();
    console.log('✅ Cliente criado via API:', clientData);
    
    // Get clients list
    console.log('Buscando lista de clientes...');
    const listResponse = await fetch('http://localhost:5000/api/clients', {
      method: 'GET',
      headers: {
        'Cookie': cookies || ''
      }
    });
    
    if (!listResponse.ok) {
      throw new Error(`Get clients failed: ${listResponse.status}`);
    }
    
    const clientsList = await listResponse.json();
    console.log(`✅ Lista de clientes obtida: ${clientsList.length} clientes encontrados`);
    
    // Find our test client
    const ourClient = clientsList.find(c => c.email === testClient.email);
    if (ourClient) {
      console.log('✅ Cliente teste encontrado na lista:', {
        id: ourClient.id,
        companyName: ourClient.companyName,
        email: ourClient.email,
        contactPhone: ourClient.contactPhone
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testClientAPI();