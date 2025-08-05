const mysql = require('mysql2/promise');
require('dotenv').config();

async function testClientCreation() {
  try {
    console.log('Testando criação de cliente...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Test inserting a client with new fields
    const testClient = {
      id: 'test-client-001',
      company_name: 'Empresa Teste Ltda',
      legal_name: 'Empresa Teste Sociedade Limitada',
      cpf_cnpj: '12.345.678/0001-90',
      street: 'Rua das Flores',
      number: '123',
      complement: 'Sala 456',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zip_code: '01234-567',
      contact_phone: '(11) 99999-9999',
      whatsapp: '(11) 88888-8888',
      email: 'contato@empresateste.com',
      website: 'https://www.empresateste.com',
      business_sector: 'Tecnologia',
      general_notes: 'Cliente teste para validação do sistema',
      status: 'active'
    };
    
    // Check if test client already exists
    const [existing] = await connection.execute(
      'SELECT id FROM clients WHERE id = ?',
      [testClient.id]
    );
    
    if (existing.length > 0) {
      console.log('Cliente teste já existe, removendo...');
      await connection.execute('DELETE FROM clients WHERE id = ?', [testClient.id]);
    }
    
    // Insert test client
    const insertQuery = `
      INSERT INTO clients (
        id, company_name, legal_name, cpf_cnpj, street, number, complement, 
        neighborhood, city, state, zip_code, contact_phone, whatsapp, email, 
        website, business_sector, general_notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await connection.execute(insertQuery, [
      testClient.id,
      testClient.company_name,
      testClient.legal_name,
      testClient.cpf_cnpj,
      testClient.street,
      testClient.number,
      testClient.complement,
      testClient.neighborhood,
      testClient.city,
      testClient.state,
      testClient.zip_code,
      testClient.contact_phone,
      testClient.whatsapp,
      testClient.email,
      testClient.website,
      testClient.business_sector,
      testClient.general_notes,
      testClient.status
    ]);
    
    console.log('✅ Cliente teste criado com sucesso!');
    
    // Retrieve and display the created client
    const [clients] = await connection.execute(
      'SELECT * FROM clients WHERE id = ?',
      [testClient.id]
    );
    
    console.log('Cliente criado:', clients[0]);
    
    // Clean up
    await connection.execute('DELETE FROM clients WHERE id = ?', [testClient.id]);
    console.log('✅ Cliente teste removido');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testClientCreation();