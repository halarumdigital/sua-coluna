const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'sua_coluna_db',
  port: process.env.MYSQL_PORT || 3306
};

async function fixWebhookUrls() {
  console.log('🔧 Corrigindo URLs de webhook no banco de dados...');
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');

    // 1. Primeiro, obter a URL do sistema configurada
    console.log('📋 Obtendo URL do sistema configurada...');
    const [settingsRows] = await connection.execute(`
      SELECT system_url FROM whatsapp_api_settings 
      WHERE is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (settingsRows.length === 0) {
      console.log('❌ Nenhuma configuração ativa encontrada');
      await connection.end();
      return;
    }

    const systemUrl = settingsRows[0].system_url;
    if (!systemUrl) {
      console.log('❌ URL do sistema não configurada');
      await connection.end();
      return;
    }

    console.log(`📋 URL do sistema: ${systemUrl}`);

    // 2. Buscar todas as instâncias que precisam de correção
    console.log('🔍 Buscando instâncias com webhook incorreto...');
    const [instances] = await connection.execute(`
      SELECT id, instance_key, webhook, instance_name 
      FROM whatsapp_instances 
      WHERE webhook IS NOT NULL AND webhook != ''
    `);

    console.log(`📊 Encontradas ${instances.length} instâncias para verificar`);

    let correctedCount = 0;

    for (const instance of instances) {
      const correctWebhookUrl = `${systemUrl}/api/client/whatsapp-webhook/${instance.instance_key}`;
      
      if (instance.webhook !== correctWebhookUrl) {
        console.log(`🔄 Corrigindo webhook para ${instance.instance_name}:`);
        console.log(`   Antes: ${instance.webhook}`);
        console.log(`   Depois: ${correctWebhookUrl}`);
        
        await connection.execute(`
          UPDATE whatsapp_instances 
          SET webhook = ?, updated_at = NOW() 
          WHERE id = ?
        `, [correctWebhookUrl, instance.id]);
        
        correctedCount++;
      } else {
        console.log(`✅ Webhook já correto para ${instance.instance_name}`);
      }
    }

    console.log(`\n📊 RESUMO:`);
    console.log(`   Total de instâncias verificadas: ${instances.length}`);
    console.log(`   Instâncias corrigidas: ${correctedCount}`);
    console.log(`   Instâncias já corretas: ${instances.length - correctedCount}`);

    if (correctedCount > 0) {
      console.log('\n🎉 URLs de webhook corrigidas com sucesso!');
    } else {
      console.log('\n✅ Todas as URLs já estavam corretas!');
    }

    await connection.end();
    console.log('✅ Conexão fechada');

  } catch (error) {
    console.error('❌ Erro ao corrigir URLs de webhook:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixWebhookUrls();
}

module.exports = { fixWebhookUrls };