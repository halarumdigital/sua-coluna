const mysql = require('mysql2/promise');
require('dotenv').config();

async function addColumns() {
  try {
    console.log('Conectando ao banco...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Check current columns
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'clients'
    `, [process.env.MYSQL_DATABASE]);
    
    const existingColumns = columns.map(col => col.COLUMN_NAME);
    console.log('Colunas existentes:', existingColumns);
    
    // Add new columns
    const columnsToAdd = [
      { name: 'legal_name', sql: 'ADD COLUMN legal_name VARCHAR(255) AFTER company_name' },
      { name: 'street', sql: 'ADD COLUMN street VARCHAR(255) AFTER tax_id' },
      { name: 'number', sql: 'ADD COLUMN number VARCHAR(20) AFTER street' },
      { name: 'complement', sql: 'ADD COLUMN complement VARCHAR(100) AFTER number' },
      { name: 'neighborhood', sql: 'ADD COLUMN neighborhood VARCHAR(100) AFTER complement' },
      { name: 'contact_phone', sql: 'ADD COLUMN contact_phone VARCHAR(20) AFTER zip_code' },
      { name: 'whatsapp', sql: 'ADD COLUMN whatsapp VARCHAR(20) AFTER contact_phone' },
      { name: 'email', sql: 'ADD COLUMN email VARCHAR(255) AFTER whatsapp' },
      { name: 'website', sql: 'ADD COLUMN website VARCHAR(255) AFTER email' },
      { name: 'system_password', sql: 'ADD COLUMN system_password VARCHAR(255) AFTER website' },
      { name: 'full_name', sql: 'ADD COLUMN full_name VARCHAR(255) AFTER system_password' },
      { name: 'primary_contact_name', sql: 'ADD COLUMN primary_contact_name VARCHAR(255) AFTER full_name' },
      { name: 'primary_contact_phone', sql: 'ADD COLUMN primary_contact_phone VARCHAR(20) AFTER primary_contact_name' },
      { name: 'primary_contact_email', sql: 'ADD COLUMN primary_contact_email VARCHAR(255) AFTER primary_contact_phone' },
      { name: 'business_sector', sql: 'ADD COLUMN business_sector VARCHAR(100) AFTER primary_contact_email' },
      { name: 'general_notes', sql: 'ADD COLUMN general_notes TEXT AFTER business_sector' },
      { name: 'status', sql: 'ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT "active" AFTER general_notes' },
      { name: 'cpf_cnpj', sql: 'ADD COLUMN cpf_cnpj VARCHAR(20) AFTER legal_name' }
    ];
    
    for (const column of columnsToAdd) {
      if (!existingColumns.includes(column.name)) {
        console.log(`Adicionando coluna: ${column.name}`);
        try {
          await connection.execute(`ALTER TABLE clients ${column.sql}`);
          console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
        } catch (error) {
          console.error(`❌ Erro ao adicionar coluna ${column.name}:`, error.message);
        }
      } else {
        console.log(`⏭️ Coluna ${column.name} já existe, pulando...`);
      }
    }
    
    console.log('🎉 Migração concluída!');
    
    // Show final structure
    const [finalColumns] = await connection.execute(`DESCRIBE clients`);
    console.log('\nEstrutura final da tabela clients:');
    finalColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

addColumns();