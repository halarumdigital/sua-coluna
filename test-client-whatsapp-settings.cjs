const mysql = require('mysql2/promise');
require('dotenv').config();

async function testClientWhatsAppSettings() {
  console.log('🔍 Testando rota de configurações WhatsApp do cliente...\n');
  
  let connection;
  
  try {
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    
    console.log('✅ Conectado ao banco de dados\n');
    
    // 1. Verificar se a tabela whatsapp_api_settings existe
    console.log('📋 Verificando tabela whatsapp_api_settings...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'whatsapp_api_settings'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Tabela whatsapp_api_settings não existe');
      return;
    }
    console.log('✅ Tabela whatsapp_api_settings existe\n');
    
    // 2. Verificar estrutura da tabela
    console.log('📋 Estrutura da tabela whatsapp_api_settings:');
    const [structure] = await connection.execute(
      'DESCRIBE whatsapp_api_settings'
    );
    
    structure.forEach(column => {
      console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key === 'PRI' ? 'PRIMARY KEY' : ''}`);
    });
    console.log();
    
    // 3. Verificar dados na tabela
    console.log('📊 Dados na tabela whatsapp_api_settings:');
    const [settings] = await connection.execute(
      'SELECT id, evolution_api_url, global_token, system_url, is_active, created_at FROM whatsapp_api_settings ORDER BY created_at DESC'
    );
    
    if (settings.length === 0) {
      console.log('❌ Nenhuma configuração encontrada na tabela');
      return;
    }
    
    settings.forEach((setting, index) => {
      console.log(`${index + 1}. ID: ${setting.id}`);
      console.log(`   URL: ${setting.evolution_api_url}`);
      console.log(`   Token: ${setting.global_token ? '••••••••••••••••' : 'Não definido'}`);
      console.log(`   System URL: ${setting.system_url || 'Não definido'}`);
      console.log(`   Ativo: ${setting.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${setting.created_at}`);
      console.log();
    });
    
    // 4. Verificar configuração ativa
    console.log('🔍 Verificando configuração ativa:');
    const [activeSettings] = await connection.execute(
      'SELECT id, evolution_api_url, global_token, system_url, is_active FROM whatsapp_api_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    if (activeSettings.length === 0) {
      console.log('❌ Nenhuma configuração ativa encontrada');
      return;
    }
    
    const active = activeSettings[0];
    console.log('✅ Configuração ativa encontrada:');
    console.log(`   ID: ${active.id}`);
    console.log(`   URL: ${active.evolution_api_url}`);
    console.log(`   Token: ${active.global_token ? '••••••••••••••••' : 'Não definido'}`);
    console.log(`   System URL: ${active.system_url || 'Não definido'}`);
    console.log(`   Ativo: ${active.is_active ? 'Sim' : 'Não'}`);
    
    // 5. Verificar se a função getWhatsappApiSettings retornaria os dados corretos
    console.log('\n🔍 Simulando função getWhatsappApiSettings:');
    const [simulatedResult] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings WHERE is_active = true ORDER BY created_at DESC LIMIT 1'
    );
    
    if (simulatedResult.length > 0) {
      const result = simulatedResult[0];
      console.log('✅ Função retornaria dados:');
      console.log(`   evolutionApiUrl: ${result.evolution_api_url}`);
      console.log(`   globalToken: ${result.global_token ? '••••••••••••••••' : 'Não definido'}`);
      console.log(`   systemUrl: ${result.system_url || 'Não definido'}`);
      console.log(`   isActive: ${result.is_active}`);
    } else {
      console.log('❌ Função não retornaria dados');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

testClientWhatsAppSettings();
