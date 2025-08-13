const http = require('http');
const querystring = require('querystring');

// Função para fazer requisição HTTP
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
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

async function testWithAuth() {
  try {
    console.log('1. Fazendo login...');
    
    // Dados de login
    const loginData = querystring.stringify({
      email: 'producao@nataliaefranciscotelasltda.com.br',
      password: '123456'
    });
    
    // Opções para login
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log(`Login Status: ${loginResponse.statusCode}`);
    console.log('Login Response:', loginResponse.body);
    
    if (loginResponse.statusCode === 200) {
      // Login bem-sucedido, extrair cookies e testar endpoint
      const cookies = loginResponse.headers['set-cookie'];
      console.log('Cookies recebidos:', cookies);
      
      if (cookies) {
        console.log('\n2. Testando endpoint dos agentes com cookies...');
        
        const agentsOptions = {
          hostname: 'localhost',
          port: 5000,
          path: '/api/admin/whatsapp-agents',
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies.join('; ')
          }
        };
        
        const agentsResponse = await makeRequest(agentsOptions);
        console.log(`Agents Status: ${agentsResponse.statusCode}`);
        console.log('Agents Response:', agentsResponse.body);
        
        // Tentar fazer parse do JSON
        try {
          const jsonData = JSON.parse(agentsResponse.body);
          console.log('\nParsed JSON:');
          console.log(JSON.stringify(jsonData, null, 2));
        } catch (error) {
          console.log('\nNão é um JSON válido:', error.message);
          console.log('Primeiros 200 caracteres da resposta:');
          console.log(agentsResponse.body.substring(0, 200));
        }
      } else {
        console.log('Nenhum cookie recebido');
      }
      return;
    } else if (loginResponse.statusCode !== 200) {
      console.log('Login falhou, tentando com JSON...');
      
      // Tentar com JSON
      const jsonLoginData = JSON.stringify({
        email: 'producao@nataliaefranciscotelasltda.com.br',
        password: '123456'
      });
      
      const jsonLoginOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonLoginData)
        }
      };
      
      const jsonLoginResponse = await makeRequest(jsonLoginOptions, jsonLoginData);
      console.log(`JSON Login Status: ${jsonLoginResponse.statusCode}`);
      console.log('JSON Login Response:', jsonLoginResponse.body);
      
      if (jsonLoginResponse.statusCode !== 200) {
        console.log('Ambos os logins falharam');
        return;
      }
      
      // Extrair cookies da resposta JSON
      const cookies = jsonLoginResponse.headers['set-cookie'];
      console.log('Cookies recebidos:', cookies);
      
      if (!cookies) {
        console.log('Nenhum cookie recebido');
        return;
      }
      
      // Usar cookies para testar endpoint dos agentes
      console.log('\n2. Testando endpoint dos agentes com cookies...');
      
      const agentsOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/admin/whatsapp-agents',
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookies.join('; ')
        }
      };
      
      const agentsResponse = await makeRequest(agentsOptions);
      console.log(`Agents Status: ${agentsResponse.statusCode}`);
      console.log('Agents Response:', agentsResponse.body);
      
      // Tentar fazer parse do JSON
      try {
        const jsonData = JSON.parse(agentsResponse.body);
        console.log('\nParsed JSON:');
        console.log(JSON.stringify(jsonData, null, 2));
      } catch (error) {
        console.log('\nNão é um JSON válido:', error.message);
        console.log('Primeiros 200 caracteres da resposta:');
        console.log(agentsResponse.body.substring(0, 200));
      }
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

testWithAuth();