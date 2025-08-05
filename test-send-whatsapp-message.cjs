const fetch = require('node-fetch');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSendWhatsAppMessage() {
  let connection;
  
  try {
    console.log('🧪 Testando envio de mensagem via WhatsApp...\n');

    // Criar conexão com o banco
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };

    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao banco de dados');

    // 1. Obter configurações do WhatsApp
    console.log('\n1️⃣ Obtendo configurações do WhatsApp...');
    const [whatsappSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
    );

    if (whatsappSettings.length === 0) {
      console.log('❌ Nenhuma configuração ativa do WhatsApp encontrada');
      return;
    }

    const settings = whatsappSettings[0];
    console.log('📋 Configurações encontradas:');
    console.log('  Evolution API URL:', settings.evolution_api_url);
    console.log('  Token:', settings.global_token.substring(0, 10) + '...');
    console.log('  Ativo:', settings.is_active ? 'Sim' : 'Não');

    // 2. Obter instâncias ativas
    console.log('\n2️⃣ Obtendo instâncias ativas...');
    const [instances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE is_active = 1 AND status = "connected"'
    );

    if (instances.length === 0) {
      console.log('❌ Nenhuma instância conectada encontrada');
      console.log('   Verifique se as instâncias estão conectadas no WhatsApp');
      return;
    }

    console.log(`📋 Encontradas ${instances.length} instância(s) conectada(s):`);
    instances.forEach((instance, index) => {
      console.log(`  ${index + 1}. ${instance.instance_name} (${instance.instance_key})`);
      console.log(`     Status: ${instance.status}`);
      console.log(`     Telefone: ${instance.phone_number || 'Não configurado'}`);
    });

    // 3. Testar envio de mensagem
    const testInstance = instances[0];
    const testPhoneNumber = '5511999999999'; // Número de teste
    const testMessage = 'Olá! Esta é uma mensagem de teste do sistema de resposta automática. 🤖';

    console.log('\n3️⃣ Testando envio de mensagem...');
    console.log('📱 Detalhes da mensagem:');
    console.log('  Para:', testPhoneNumber);
    console.log('  Instância:', testInstance.instance_key);
    console.log('  Mensagem:', testMessage);

    // Preparar dados da mensagem
    const messageData = {
      number: testPhoneNumber,
      text: testMessage
    };

    console.log('\n📤 Enviando requisição para Evolution API...');
    console.log('URL:', `${settings.evolution_api_url}/message/sendText/${testInstance.instance_key}`);
    console.log('Dados:', JSON.stringify(messageData, null, 2));

    const response = await fetch(`${settings.evolution_api_url}/message/sendText/${testInstance.instance_key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.global_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageData)
    });

    console.log('\n📥 Resposta da API:');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Resposta (texto):', responseText);

    if (response.ok) {
      try {
        const result = JSON.parse(responseText);
        console.log('\n✅ Mensagem enviada com sucesso!');
        console.log('📋 Detalhes da resposta:');
        console.log('  Message ID:', result.key?.id || result.id || 'N/A');
        console.log('  Status:', result.status || 'N/A');
        console.log('  Timestamp:', result.timestamp || 'N/A');
      } catch (error) {
        console.log('\n✅ Mensagem enviada com sucesso!');
        console.log('📋 Resposta (não é JSON):', responseText);
      }
    } else {
      console.log('\n❌ Falha ao enviar mensagem');
      console.log('📋 Erro:', responseText);
      
      // Tentar parsear como JSON se possível
      try {
        const errorJson = JSON.parse(responseText);
        console.log('📋 Erro detalhado:', JSON.stringify(errorJson, null, 2));
      } catch (e) {
        console.log('📋 Erro como texto:', responseText);
      }
    }

    // 4. Verificar status da instância
    console.log('\n4️⃣ Verificando status da instância...');
    try {
      const statusResponse = await fetch(`${settings.evolution_api_url}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.global_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statusResponse.ok) {
        const instances = await statusResponse.json();
        const instance = instances.find((inst: any) => inst.instance.instanceName === testInstance.instance_key);
        
        if (instance) {
          console.log('📋 Status da instância:');
          console.log('  Nome:', instance.instance.instanceName);
          console.log('  Status:', instance.instance.status);
          console.log('  Conectado:', instance.instance.connectionStatus || 'N/A');
        } else {
          console.log('❌ Instância não encontrada na API');
        }
      } else {
        console.log('❌ Falha ao verificar status da instância');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar status:', error.message);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

// Executar teste
if (require.main === module) {
  testSendWhatsAppMessage().catch(console.error);
}

module.exports = { testSendWhatsAppMessage }; 