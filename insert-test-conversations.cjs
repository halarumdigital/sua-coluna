const mysql = require('mysql2/promise');

async function insertTestConversations() {
  // Configuração do banco de dados remoto
  const connection = await mysql.createConnection({
    host: '31.97.91.252',
    port: 3306,
    user: 'gilliard_coluna',
    password: '1LzhvG2HqaKN',
    database: 'gilliard_coluna'
  });

  try {
    console.log('🧪 Inserindo conversas de teste...');

    // 1. Verificar se existe uma instância WhatsApp
    const [instances] = await connection.execute(`
      SELECT id FROM whatsapp_instances 
      WHERE client_id = '2054d5b2-719e-11f0-8aab-2ae8d4b3399a'
      LIMIT 1
    `);

    let instanceId;
    if (instances.length > 0) {
      instanceId = instances[0].id;
      console.log('✅ Instância encontrada:', instanceId);
    } else {
      // Criar uma instância de teste
      const [result] = await connection.execute(`
        INSERT INTO whatsapp_instances (id, client_id, instance_name, instance_number, status, created_at)
        VALUES (UUID(), '2054d5b2-719e-11f0-8aab-2ae8d4b3399a', 'Instância Teste', '5511999999999', 'active', NOW())
      `);
      instanceId = result.insertId;
      console.log('✅ Nova instância criada:', instanceId);
    }

    // 2. Inserir conversas de teste
    const testConversations = [
      {
        chat_id: '5511999999999@c.us',
        phone_number: '5511999999999',
        contact_name: 'João Silva',
        last_message: 'Olá! Gostaria de fazer um pedido.',
        last_message_at: new Date(),
        unread_count: 1,
        status: 'active'
      },
      {
        chat_id: '5511888888888@c.us',
        phone_number: '5511888888888',
        contact_name: 'Maria Santos',
        last_message: 'Qual o horário de funcionamento?',
        last_message_at: new Date(Date.now() - 3600000), // 1 hora atrás
        unread_count: 0,
        status: 'active'
      },
      {
        chat_id: '5511777777777@c.us',
        phone_number: '5511777777777',
        contact_name: 'Pedro Oliveira',
        last_message: 'Obrigado pelo atendimento!',
        last_message_at: new Date(Date.now() - 7200000), // 2 horas atrás
        unread_count: 0,
        status: 'archived'
      }
    ];

    for (const conv of testConversations) {
      await connection.execute(`
        INSERT INTO whatsapp_conversations (
          id, instance_id, chat_id, phone_number, contact_name, 
          last_message, last_message_at, unread_count, status, created_at, updated_at
        ) VALUES (
          UUID(), ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
        )
      `, [
        instanceId,
        conv.chat_id,
        conv.phone_number,
        conv.contact_name,
        conv.last_message,
        conv.last_message_at,
        conv.unread_count,
        conv.status
      ]);
    }

    console.log('✅ Conversas de teste inseridas com sucesso!');

    // 3. Verificar se foram inseridas
    const [conversations] = await connection.execute(`
      SELECT * FROM whatsapp_conversations 
      WHERE instance_id = ?
      ORDER BY created_at DESC
    `, [instanceId]);

    console.log('📊 Conversas no banco:', conversations.length);
    conversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ${conv.contact_name} (${conv.phone_number}) - ${conv.last_message}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await connection.end();
  }
}

insertTestConversations(); 