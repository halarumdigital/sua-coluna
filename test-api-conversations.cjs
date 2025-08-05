const fetch = require('node-fetch');

async function testConversationsAPI() {
  try {
    console.log('🧪 Testando API de conversas...');

    // 1. Testar login primeiro
    console.log('🔐 Fazendo login...');
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
      console.log('❌ Falha no login. Tentando com credenciais padrão...');
      
      // Tentar com credenciais padrão
      const defaultLoginResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@admin.com',
          password: 'admin'
        })
      });

      if (!defaultLoginResponse.ok) {
        console.log('❌ Login falhou. Verifique as credenciais.');
        return;
      }
    }

    console.log('✅ Login realizado com sucesso');

    // 2. Testar endpoint de conversas
    console.log('📱 Testando endpoint de conversas...');
    
    const conversationsResponse = await fetch('http://localhost:5000/api/client/conversations', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();
      console.log('✅ API de conversas funcionando!');
      console.log('📊 Conversas encontradas:', conversations.length);
      
      conversations.forEach((conv, index) => {
        console.log(`  ${index + 1}. ${conv.contactName} (${conv.contactPhone}) - ${conv.lastMessage}`);
      });
    } else {
      const error = await conversationsResponse.text();
      console.log('❌ Erro na API de conversas:', error);
    }

    // 3. Testar com filtros
    console.log('\n🔍 Testando filtros...');
    
    const filteredResponse = await fetch('http://localhost:5000/api/client/conversations?search=João', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    });

    if (filteredResponse.ok) {
      const filteredConversations = await filteredResponse.json();
      console.log('🔎 Conversas filtradas por "João":', filteredConversations.length);
    }

    // 4. Testar arquivamento
    console.log('\n📁 Testando arquivamento...');
    
    if (conversationsResponse.ok) {
      const conversations = await conversationsResponse.json();
      if (conversations.length > 0) {
        const firstConversation = conversations[0];
        
        const archiveResponse = await fetch(`http://localhost:5000/api/client/conversations/${firstConversation.id}/archive`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (archiveResponse.ok) {
          console.log('✅ Conversa arquivada com sucesso!');
        } else {
          console.log('❌ Erro ao arquivar conversa');
        }
      }
    }

    console.log('\n🎉 Teste da API concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

// Aguardar um pouco para o servidor inicializar
setTimeout(() => {
  testConversationsAPI();
}, 3000); 