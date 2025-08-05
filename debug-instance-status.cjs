require('dotenv').config();
const mysql = require('mysql2/promise');

async function debugInstanceStatus() {
  console.log('🔍 Debugando status das instâncias...');
  
  const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'sua_coluna',
    port: parseInt(process.env.MYSQL_PORT || '3306')
  };

  try {
    console.log('🔌 Conectando ao banco...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados');

    // 1. Verificar todas as instâncias
    console.log('\n📋 Todas as instâncias:');
    const [allInstances] = await connection.execute('SELECT * FROM whatsapp_instances');
    console.log(`Total de instâncias: ${allInstances.length}`);
    
    for (const instance of allInstances) {
      console.log(`   - ${instance.instance_key} (${instance.phone_number})`);
      console.log(`     Status: ${instance.status}`);
      console.log(`     Webhook: ${instance.webhook || 'Não configurado'}`);
      console.log(`     Cliente ID: ${instance.client_id}`);
    }

    // 2. Verificar instâncias com status "open"
    console.log('\n📋 Instâncias com status "open":');
    const [openInstances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE status = "open"'
    );
    console.log(`Instâncias "open": ${openInstances.length}`);

    // 3. Verificar instâncias com status "connected"
    console.log('\n📋 Instâncias com status "connected":');
    const [connectedInstances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE status = "connected"'
    );
    console.log(`Instâncias "connected": ${connectedInstances.length}`);

    // 4. Verificar configurações do WhatsApp API
    console.log('\n📋 Configurações do WhatsApp API:');
    const [whatsappSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings ORDER BY id DESC LIMIT 1'
    );
    
    if (whatsappSettings.length > 0) {
      const settings = whatsappSettings[0];
      console.log(`   Evolution API URL: ${settings.evolution_api_url}`);
      console.log(`   Global Token: ${settings.global_token ? 'Configurado' : 'Não configurado'}`);
      console.log(`   Ativo: ${settings.is_active ? 'Sim' : 'Não'}`);
    } else {
      console.log('   ❌ Nenhuma configuração encontrada');
    }

    // 5. Verificar se há logs de uso da IA
    console.log('\n📋 Logs de uso da IA:');
    try {
      const [logs] = await connection.execute(
        'SELECT * FROM ai_usage_logs ORDER BY created_at DESC LIMIT 5'
      );
      
      if (logs.length > 0) {
        console.log(`   ${logs.length} log(s) encontrado(s):`);
        for (const log of logs) {
          console.log(`   - ${log.created_at}: ${log.prompt_tokens} tokens ($${log.cost})`);
        }
      } else {
        console.log('   ℹ️  Nenhum log encontrado');
      }
    } catch (error) {
      console.log('   ℹ️  Tabela de logs não encontrada');
    }

    // 6. Verificar se o webhook está sendo chamado
    console.log('\n🔗 Verificando webhook:');
    if (connectedInstances.length > 0) {
      const instance = connectedInstances[0];
      console.log(`   Instância: ${instance.instance_key}`);
      console.log(`   Webhook: ${instance.webhook || 'Não configurado'}`);
      
      if (instance.webhook) {
        // Testar se a URL do webhook está acessível
        console.log(`   Testando URL: ${instance.webhook}`);
        try {
          const https = require('https');
          const url = new URL(instance.webhook);
          
          const req = https.request(url, { method: 'GET' }, (res) => {
            console.log(`   ✅ Webhook acessível (Status: ${res.statusCode})`);
          });
          
          req.on('error', (error) => {
            console.log(`   ❌ Webhook não acessível: ${error.message}`);
          });
          
          req.setTimeout(5000, () => {
            console.log('   ⏰ Timeout ao testar webhook');
          });
          
          req.end();
        } catch (error) {
          console.log(`   ❌ Erro ao testar webhook: ${error.message}`);
        }
      }
    }

    // 7. Simular uma mensagem recebida
    console.log('\n🔄 Simulando processamento de mensagem:');
    if (connectedInstances.length > 0) {
      const testMessage = {
        key: {
          remoteJid: '554999214230@s.whatsapp.net',
          fromMe: false,
          id: 'TEST_MESSAGE_ID'
        },
        pushName: 'Test User',
        message: { conversation: 'oi' },
        messageType: 'conversation',
        instanceId: connectedInstances[0].instance_key
      };

      console.log(`   📨 Mensagem: "${testMessage.message.conversation}"`);
      console.log(`   👤 De: ${testMessage.pushName} (${testMessage.key.remoteJid})`);
      console.log(`   📱 Instância: ${testMessage.instanceId}`);
      
      // Aqui você pode adicionar a lógica para processar a mensagem
      console.log('   ⚠️  Para testar o processamento real, envie uma mensagem via WhatsApp');
    }

    await connection.end();
    console.log('\n✅ Debug concluído!');
  } catch (error) {
    console.error('❌ Erro durante o debug:', error.message);
  }
}

debugInstanceStatus().catch(console.error); 