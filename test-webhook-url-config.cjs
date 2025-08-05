const mysql = require('mysql2/promise');

async function testWebhookUrlConfig() {
  console.log('🔧 Testando configuração da URL do webhook...');
  
  // Configuração do banco de dados
  const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sua_coluna',
    port: parseInt(process.env.MYSQL_PORT || '3306')
  };

  try {
    // Conectar ao banco de dados
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');

    // Verificar configurações da Evolution API
    const [adminSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings WHERE is_active = 1 LIMIT 1'
    );

    if (adminSettings.length === 0) {
      console.log('❌ Nenhuma configuração da Evolution API encontrada');
      return;
    }

    const settings = adminSettings[0];
    console.log('📋 Configurações da Evolution API:');
    console.log(`   URL: ${settings.evolution_api_url}`);
    console.log(`   Token: ${settings.global_token ? 'Configurado' : 'Não configurado'}`);

    // Verificar instâncias WhatsApp
    const [instances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE status = "open" LIMIT 5'
    );

    if (instances.length === 0) {
      console.log('❌ Nenhuma instância WhatsApp ativa encontrada');
      return;
    }

    console.log(`📱 Encontradas ${instances.length} instâncias ativas:`);
    
    for (const instance of instances) {
      console.log(`\n🔍 Instância: ${instance.instance_key}`);
      console.log(`   Nome: ${instance.instance_name}`);
      console.log(`   Telefone: ${instance.phone_number}`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Webhook atual: ${instance.webhook || 'Não configurado'}`);
      
      // Simular geração da URL do webhook
      let baseUrl;
      if (process.env.NODE_ENV === 'production' || process.env.REPL_ID) {
        baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else {
        baseUrl = 'http://localhost:5000';
      }
      
      const webhookUrl = `${baseUrl}/api/client/whatsapp-webhook/${instance.instance_key}`;
      console.log(`   URL sugerida: ${webhookUrl}`);
      
      // Verificar se a URL atual é localhost
      if (instance.webhook && instance.webhook.includes('localhost')) {
        console.log('   ⚠️  ATENÇÃO: URL atual usa localhost - pode causar problemas com Evolution API');
        console.log('   💡 Recomendação: Reconfigurar webhook com URL pública');
      } else if (instance.webhook) {
        console.log('   ✅ URL atual parece ser pública');
      }
    }

    // Verificar variáveis de ambiente
    console.log('\n🌍 Variáveis de ambiente:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
    console.log(`   REPL_ID: ${process.env.REPL_ID || 'não definido'}`);
    console.log(`   REPL_SLUG: ${process.env.REPL_SLUG || 'não definido'}`);
    console.log(`   REPL_OWNER: ${process.env.REPL_OWNER || 'não definido'}`);
    
    if (process.env.REPL_ID) {
      const suggestedUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      console.log(`   🎯 URL sugerida para Replit: ${suggestedUrl}`);
    }

    await connection.end();
    console.log('\n✅ Teste concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testWebhookUrlConfig().catch(console.error); 