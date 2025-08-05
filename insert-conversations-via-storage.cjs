const { storage } = require('./server/storage');

async function insertTestConversations() {
  try {
    console.log('🧪 Inserindo conversas de teste via storage...');

    // 1. Verificar se existe uma instância WhatsApp para o cliente
    const clientId = '2054d5b2-719e-11f0-8aab-2ae8d4b3399a';
    const instances = await storage.getWhatsappInstancesByClient(clientId);
    
    let instanceId;
    if (instances.length > 0) {
      instanceId = instances[0].id;
      console.log('✅ Instância encontrada:', instanceId);
    } else {
      // Criar uma instância de teste
      const newInstance = await storage.createWhatsappInstance({
        clientId: clientId,
        instanceName: 'Instância Teste',
        instanceNumber: '5511999999999',
        status: 'active'
      });
      instanceId = newInstance.id;
      console.log('✅ Nova instância criada:', instanceId);
    }

    // 2. Inserir conversas de teste
    const testConversations = [
      {
        instanceId: instanceId,
        chatId: '5511999999999@c.us',
        phoneNumber: '5511999999999',
        contactName: 'João Silva',
        lastMessage: 'Olá! Gostaria de fazer um pedido.',
        lastMessageAt: new Date(),
        unreadCount: 1,
        status: 'active'
      },
      {
        instanceId: instanceId,
        chatId: '5511888888888@c.us',
        phoneNumber: '5511888888888',
        contactName: 'Maria Santos',
        lastMessage: 'Qual o horário de funcionamento?',
        lastMessageAt: new Date(Date.now() - 3600000), // 1 hora atrás
        unreadCount: 0,
        status: 'active'
      },
      {
        instanceId: instanceId,
        chatId: '5511777777777@c.us',
        phoneNumber: '5511777777777',
        contactName: 'Pedro Oliveira',
        lastMessage: 'Obrigado pelo atendimento!',
        lastMessageAt: new Date(Date.now() - 7200000), // 2 horas atrás
        unreadCount: 0,
        status: 'archived'
      }
    ];

    for (const conv of testConversations) {
      try {
        await storage.createWhatsappConversation(conv);
        console.log(`✅ Conversa criada: ${conv.contactName}`);
      } catch (error) {
        console.log(`⚠️ Conversa já existe ou erro: ${conv.contactName} - ${error.message}`);
      }
    }

    console.log('✅ Conversas de teste inseridas com sucesso!');

    // 3. Verificar se foram inseridas
    const conversations = await storage.getWhatsappConversationsByClient(clientId);
    console.log('📊 Conversas no banco:', conversations.length);
    conversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ${conv.contactName} (${conv.phoneNumber}) - ${conv.lastMessage}`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Aguardar um pouco para o sistema inicializar
setTimeout(() => {
  insertTestConversations();
}, 3000); 