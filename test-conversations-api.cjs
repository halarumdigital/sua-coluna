const fetch = require('node-fetch');

async function testConversationsAPI() {
  try {
    console.log('🧪 Testando API de conversas...');

    // 1. Fazer login
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'cobranca@jessicaepietrapizzariadeliveryme.com.br',
        password: '123456'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    console.log('✅ Login realizado com sucesso');

    // 2. Buscar conversas
    console.log('\n2️⃣ Buscando conversas...');
    const conversationsResponse = await fetch('http://localhost:5000/api/client/conversations', {
      headers: {
        'Cookie': loginResponse.headers.get('set-cookie') || ''
      }
    });

    if (!conversationsResponse.ok) {
      throw new Error(`Busca de conversas falhou: ${conversationsResponse.status} ${conversationsResponse.statusText}`);
    }

    const conversations = await conversationsResponse.json();
    console.log(`✅ Encontradas ${conversations.length} conversas:`);

    if (conversations.length === 0) {
      console.log('❌ Nenhuma conversa encontrada');
      console.log('💡 Para testar, envie uma mensagem para uma instância WhatsApp configurada');
    } else {
      conversations.forEach((conv, index) => {
        console.log(`\n${index + 1}. Conversa ID: ${conv.id}`);
        console.log(`   Contato: ${conv.contactName}`);
        console.log(`   Telefone: ${conv.contactPhone}`);
        console.log(`   Última mensagem: ${conv.lastMessage}`);
        console.log(`   Data: ${conv.lastMessageTime}`);
        console.log(`   Não lidas: ${conv.unreadCount}`);
        console.log(`   Status: ${conv.status}`);
      });

      // 3. Buscar mensagens da primeira conversa
      if (conversations.length > 0) {
        console.log('\n3️⃣ Buscando mensagens da primeira conversa...');
        const messagesResponse = await fetch(`http://localhost:5000/api/client/conversations/${conversations[0].id}/messages`, {
          headers: {
            'Cookie': loginResponse.headers.get('set-cookie') || ''
          }
        });

        if (!messagesResponse.ok) {
          throw new Error(`Busca de mensagens falhou: ${messagesResponse.status} ${messagesResponse.statusText}`);
        }

        const messages = await messagesResponse.json();
        console.log(`✅ Encontradas ${messages.length} mensagens na conversa:`);

        if (messages.length === 0) {
          console.log('❌ Nenhuma mensagem encontrada');
        } else {
          messages.forEach((msg, index) => {
            console.log(`\n${index + 1}. Mensagem ID: ${msg.id}`);
            console.log(`   Texto: ${msg.content}`);
            console.log(`   De: ${msg.isFromUser ? 'Você' : 'Cliente'}`);
            console.log(`   Data: ${msg.timestamp}`);
            console.log(`   Status: ${msg.status}`);
          });
        }
      }
    }

    console.log('\n🎉 Teste da API concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao testar API:', error.message);
  }
}

testConversationsAPI(); 