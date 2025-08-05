const mysql = require('mysql2/promise');

async function testConversationsSave() {
  try {
    // Configuração do banco de dados
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sua_coluna'
    });

    console.log('🔍 Verificando conversas no banco de dados...');

    // Verificar se existem conversas
    const [conversations] = await connection.execute(`
      SELECT 
        wc.id,
        wc.contact_name,
        wc.phone_number,
        wc.last_message,
        wc.last_message_at,
        wc.unread_count,
        wc.status,
        wi.instance_name,
        c.company_name
      FROM whatsapp_conversations wc
      INNER JOIN whatsapp_instances wi ON wc.instance_id = wi.id
      INNER JOIN clients c ON wi.client_id = c.id
      ORDER BY wc.last_message_at DESC
      LIMIT 10
    `);

    console.log(`📊 Encontradas ${conversations.length} conversas:`);
    
    if (conversations.length === 0) {
      console.log('❌ Nenhuma conversa encontrada no banco de dados');
      console.log('💡 Para testar, envie uma mensagem para uma instância WhatsApp configurada');
    } else {
      conversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. Conversa ID: ${conv.id}`);
        console.log(`   Contato: ${conv.contact_name || 'Sem nome'}`);
        console.log(`   Telefone: ${conv.phone_number}`);
        console.log(`   Última mensagem: ${conv.last_message || 'Nenhuma'}`);
        console.log(`   Data: ${conv.last_message_at}`);
        console.log(`   Não lidas: ${conv.unread_count}`);
        console.log(`   Status: ${conv.status}`);
        console.log(`   Instância: ${conv.instance_name}`);
        console.log(`   Cliente: ${conv.company_name}`);
      });
    }

    // Verificar mensagens
    const [messages] = await connection.execute(`
      SELECT 
        wm.id,
        wm.message_text,
        wm.direction,
        wm.timestamp,
        wm.status,
        wc.contact_name
      FROM whatsapp_messages wm
      INNER JOIN whatsapp_conversations wc ON wm.conversation_id = wc.id
      ORDER BY wm.timestamp DESC
      LIMIT 10
    `);

    console.log(`\n📨 Encontradas ${messages.length} mensagens:`);
    
    if (messages.length === 0) {
      console.log('❌ Nenhuma mensagem encontrada no banco de dados');
    } else {
      messages.forEach((msg, index) => {
        console.log(`\n${index + 1}. Mensagem ID: ${msg.id}`);
        console.log(`   Texto: ${msg.message_text || 'Sem texto'}`);
        console.log(`   Direção: ${msg.direction}`);
        console.log(`   Data: ${msg.timestamp}`);
        console.log(`   Status: ${msg.status}`);
        console.log(`   Conversa: ${msg.contact_name}`);
      });
    }

    await connection.end();
    console.log('\n✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro ao testar conversas:', error);
  }
}

testConversationsSave(); 