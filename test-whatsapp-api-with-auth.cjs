const https = require('https');
const http = require('http');

async function testWhatsAppAPIWithAuth() {
  try {
    console.log('🧪 Testando API do WhatsApp com autenticação...');
    
    // Primeiro, fazer login para obter a sessão
    console.log('📝 Fazendo login...');
    
    const loginData = JSON.stringify({
      email: 'admin@example.com',
      password: 'admin123'
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
    
    const loginResponse = await new Promise((resolve, reject) => {
      const req = http.request(loginOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, data: data });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(loginData);
      req.end();
    });
    
    console.log('Login response:', loginResponse.statusCode);
    console.log('Login data:', loginResponse.data);
    
    if (loginResponse.statusCode === 200) {
      console.log('✅ Login realizado com sucesso!');
      
      // Agora testar a API do WhatsApp
      console.log('📝 Testando API do WhatsApp...');
      
      const whatsappData = JSON.stringify({
        evolutionApiUrl: 'https://apizap.halarum.com.br',
        globalToken: 'test_token_123'
      });
      
      const whatsappOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/admin/whatsapp-settings',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(whatsappData),
          'Cookie': 'connect.sid=your-session-cookie' // Seria necessário obter o cookie da sessão
        }
      };
      
      const whatsappResponse = await new Promise((resolve, reject) => {
        const req = http.request(whatsappOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ statusCode: res.statusCode, data: data });
          });
        });
        
        req.on('error', (error) => {
          reject(error);
        });
        
        req.write(whatsappData);
        req.end();
      });
      
      console.log('WhatsApp API response:', whatsappResponse.statusCode);
      console.log('WhatsApp API data:', whatsappResponse.data);
      
    } else {
      console.log('❌ Falha no login');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testWhatsAppAPIWithAuth(); 