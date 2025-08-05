const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testClientCreation() {
  try {
    console.log('Testando criação de cliente via API HTTP...');
    
    // First login
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = {
      email: 'admin@admin.com',
      password: 'admin123'
    };
    
    console.log('Fazendo login...');
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      console.error('Erro no login:', loginResponse.data);
      return;
    }
    
    console.log('✅ Login realizado com sucesso');
    
    // Get session cookie
    const cookies = loginResponse.headers['set-cookie'];
    const sessionCookie = cookies ? cookies.find(c => c.startsWith('connect.sid')) : null;
    
    if (!sessionCookie) {
      console.error('Não foi possível obter o cookie de sessão');
      return;
    }
    
    // Test client creation
    const clientOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/clients',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      }
    };
    
    const clientData = {
      companyName: 'Praça Doutor Álvaro de Brito',
      legalName: 'Praça Doutor Álvaro de Brito Ltda',
      street: 'Praça Doutor Álvaro de Brito',
      number: '123',
      complement: 'Sala, andar, etc.',
      neighborhood: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01435070',
      contactPhone: '1135323973',
      whatsapp: '1135323973',
      email: 'cobranca@jessicapetrapizzariadelleveryme.com.br',
      website: 'https://www.empresa.com',
      systemPassword: '123456',
      cpfCnpj: '',
      businessSector: '',
      generalNotes: 'Informações adicionais sobre o cliente...'
    };
    
    console.log('Criando cliente...');
    console.log('Dados:', clientData);
    
    const clientResponse = await makeRequest(clientOptions, clientData);
    console.log('Client creation response status:', clientResponse.status);
    console.log('Response data:', clientResponse.data);
    
    if (clientResponse.status === 200 || clientResponse.status === 201) {
      console.log('✅ Cliente criado com sucesso!');
    } else {
      console.error('❌ Erro ao criar cliente:', clientResponse.data);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testClientCreation();