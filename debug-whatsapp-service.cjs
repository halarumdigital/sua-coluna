require('dotenv').config();

// Simulate the storage and WhatsApp service to debug
async function debugWhatsappService() {
  console.log('🔍 Debugando WhatsApp Service...');
  
  // Test storage connection first
  const mysql = require('mysql2/promise');
  const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  };

  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get API settings exactly like storage.js does
    console.log('📋 Buscando configurações da API...');
    const [settings] = await connection.execute(`
      SELECT id, evolution_api_url, global_token, is_active, created_at 
      FROM whatsapp_api_settings 
      WHERE is_active = TRUE 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (settings.length === 0) {
      console.log('❌ Nenhuma configuração ativa encontrada!');
      await connection.end();
      return;
    }
    
    const apiSettings = settings[0];
    console.log('📊 Configurações encontradas:');
    console.log(`   ID: ${apiSettings.id}`);
    console.log(`   Evolution API URL: ${apiSettings.evolution_api_url}`);
    console.log(`   Global Token: ${apiSettings.global_token?.substring(0, 20)}...`);
    console.log(`   Token completo: "${apiSettings.global_token}"`);
    console.log(`   Is Active: ${apiSettings.is_active}`);
    console.log(`   Created At: ${apiSettings.created_at}`);
    
    // Test the exact same request our code would make
    const fetch = require('node-fetch');
    const instanceKey = 'deploy1';
    const phoneNumber = '554999214230';
    const message = 'Teste debug service';
    
    const messageData = {
      number: phoneNumber,
      text: message
    };
    
    console.log('\n🧪 Testando requisição exata do nosso código:');
    console.log(`   URL: ${apiSettings.evolution_api_url}/message/sendText/${instanceKey}`);
    console.log(`   Headers:`);
    console.log(`     apikey: "${apiSettings.global_token}"`);
    console.log(`     Content-Type: "application/json"`);
    console.log(`   Body:`, JSON.stringify(messageData));
    
    const response = await fetch(`${apiSettings.evolution_api_url}/message/sendText/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': apiSettings.global_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });
    
    console.log(`\n📊 Resultado:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   Erro: ${errorText}`);
    } else {
      const result = await response.json();
      console.log(`   Sucesso:`, result);
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  }
}

debugWhatsappService().catch(console.error);