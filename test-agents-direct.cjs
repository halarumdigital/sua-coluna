const http = require('http');

// Teste direto do endpoint sem autenticação
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/whatsapp-agents',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response body:');
    console.log(data);
    
    // Tentar fazer parse do JSON
    try {
      const jsonData = JSON.parse(data);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      console.log('\nNão é um JSON válido:', error.message);
      console.log('Primeiros 200 caracteres da resposta:');
      console.log(data.substring(0, 200));
    }
  });
});

req.on('error', (error) => {
  console.error('Erro na requisição:', error);
});

req.end();