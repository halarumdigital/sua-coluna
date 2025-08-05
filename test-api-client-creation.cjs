const axios = require('axios');

async function testAPIClientCreation() {
  try {
    console.log('Testando criação de cliente via API...');
    
    // First, let's try to login as admin
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@admin.com',
      password: 'admin123'
    });
    
    console.log('✅ Login realizado com sucesso');
    
    // Get the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    
    // Test client data (similar to the form data)
    const testClientData = {
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
    
    console.log('Dados do cliente:', testClientData);
    
    // Create client
    const clientResponse = await axios.post('http://localhost:5000/api/clients', testClientData, {
      headers: {
        'Cookie': cookies?.join('; ') || '',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Cliente criado com sucesso!');
    console.log('Resposta:', clientResponse.data);
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('Detalhes dos erros:', error.response.data.errors);
    }
  }
}

testAPIClientCreation();