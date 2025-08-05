const fetch = require('node-fetch');

async function debugEvolutionAPI() {
  try {
    console.log('🔍 Debugando conexão com Evolution API...\n');

    // Configurações reais do sistema
    const evolutionApiUrl = 'https://apizap.halarum.com.br'; // URL real da Evolution API
    const globalToken = '94eff8b9da7b6c86e50b5c43334f6f69'; // Token correto do banco
    const instanceName = 'deploy1'; // Nome da instância real

    // 1. Testar conectividade básica da Evolution API
    console.log('📡 Testando conectividade com Evolution API...');
    console.log('URL:', evolutionApiUrl);
    
    try {
      const healthResponse = await fetch(`${evolutionApiUrl}/`);
      console.log('✅ Evolution API acessível:', healthResponse.status);
    } catch (error) {
      console.log('❌ Evolution API não acessível:', error.message);
      console.log('⚠️  Verifique se a Evolution API está rodando na URL:', evolutionApiUrl);
      return;
    }

    // 2. Testar listar instâncias
    console.log('\n📋 Testando listagem de instâncias...');
    try {
      const instancesResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': globalToken,
          'Content-Type': 'application/json'
        }
      });

      if (instancesResponse.ok) {
        const instances = await instancesResponse.json();
        console.log('✅ Instâncias encontradas:', instances.length);
        console.log('Instâncias:', instances.map(i => i.instanceName || i.instance?.instanceName).join(', '));
        
        // Verificar se nossa instância existe
        const ourInstance = instances.find(i => 
          (i.instanceName || i.instance?.instanceName) === instanceName
        );
        
        if (ourInstance) {
          console.log('✅ Instância encontrada:', instanceName);
        } else {
          console.log('❌ Instância não encontrada:', instanceName);
          console.log('💡 Instâncias disponíveis:', instances.map(i => i.instanceName || i.instance?.instanceName));
        }
      } else {
        console.log('❌ Erro ao listar instâncias:', instancesResponse.status);
        const errorText = await instancesResponse.text();
        console.log('Erro:', errorText);
      }
    } catch (error) {
      console.log('❌ Erro na requisição de instâncias:', error.message);
    }

    // 3. Testar endpoint de configurações
    console.log('\n⚙️  Testando endpoint de configurações...');
    const settingsData = {
      rejectCall: true,
      msgCall: "I do not accept calls",
      groupsIgnore: true,
      alwaysOnline: true,
      readMessages: true,
      readStatus: true,
      syncFullHistory: false
    };

    console.log('Dados que serão enviados:');
    console.log(JSON.stringify(settingsData, null, 2));

    const settingsUrl = `${evolutionApiUrl}/settings/set/${instanceName}`;
    console.log('URL completa:', settingsUrl);

    try {
      const settingsResponse = await fetch(settingsUrl, {
        method: 'POST',
        headers: {
          'apikey': globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsData)
      });

      console.log('\n📊 Resposta do endpoint de configurações:');
      console.log('Status:', settingsResponse.status);
      console.log('Status Text:', settingsResponse.statusText);

      const responseText = await settingsResponse.text();
      console.log('Response Body:', responseText);

      if (settingsResponse.ok) {
        console.log('✅ Configurações aplicadas com sucesso!');
      } else {
        console.log('❌ Erro ao aplicar configurações');
        
        // Tentar fazer parse do erro
        try {
          const errorData = JSON.parse(responseText);
          console.log('Detalhes do erro:', JSON.stringify(errorData, null, 2));
        } catch (e) {
          console.log('Resposta de erro não é JSON válido');
        }
      }
    } catch (error) {
      console.log('❌ Erro na requisição de configurações:', error.message);
    }

  } catch (error) {
    console.error('💥 Erro geral:', error.message);
  }
}

console.log('🚀 Iniciando debug da Evolution API...');
console.log('📝 Configure as variáveis evolutionApiUrl, globalToken e instanceName no início do script\n');

debugEvolutionAPI().then(() => {
  console.log('\n🏁 Debug finalizado');
}).catch(err => {
  console.error('💥 Falha no debug:', err);
});