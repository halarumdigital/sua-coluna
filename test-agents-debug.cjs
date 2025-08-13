const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testAgentsEndpoint() {
  try {
    console.log('1. Fazendo login...');
    
    // Fazer login
    const loginData = JSON.stringify({
      email: 'producao@nataliaefranciscotelasltda.com.br',
      password: '123456'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    
    console.log('Login Status:', loginResponse.status);
    console.log('Login Headers:', loginResponse.headers);
    
    if (loginResponse.status !== 200) {
      console.log('Login falhou:', loginResponse.data);
      return;
    }
    
    let loginResponseData;
    try {
      loginResponseData = JSON.parse(loginResponse.data);
      console.log('Login Response:', loginResponseData);
    } catch (e) {
      console.log('Login Response (não é JSON):', loginResponse.data.substring(0, 200));
      return;
    }
    
    // Extrair cookies
    const cookies = loginResponse.headers['set-cookie'];
    console.log('Cookies recebidos:', cookies);
    
    if (!cookies) {
      console.log('Nenhum cookie recebido do login');
      return;
    }
    
    // Preparar cookie string
    const cookieString = cookies.map(cookie => cookie.split(';')[0]).join('; ');
    console.log('Cookie string:', cookieString);
    
    console.log('\n2. Testando endpoint dos agentes com cookies...');
    
    // Testar endpoint dos agentes
    const agentsOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/whatsapp-agents',
      method: 'GET',
      headers: {
        'Cookie': cookieString,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    const agentsResponse = await makeRequest(agentsOptions);
    
    console.log('Agents Status:', agentsResponse.status);
    console.log('Agents Headers:', agentsResponse.headers);
    
    // Verificar se a resposta é JSON
    if (agentsResponse.headers['content-type']?.includes('application/json')) {
      try {
        const agentsData = JSON.parse(agentsResponse.data);
        console.log('Agents Response (JSON):', agentsData);
      } catch (e) {
        console.log('Erro ao parsear JSON:', e.message);
        console.log('Raw data:', agentsResponse.data.substring(0, 200));
      }
    } else {
      console.log('Agents Response (não é JSON):', agentsResponse.data.substring(0, 200));
      console.log('Content-Type:', agentsResponse.headers['content-type']);
    }
    
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testAgentsEndpoint();