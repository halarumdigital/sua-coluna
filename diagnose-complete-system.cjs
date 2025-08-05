require('dotenv').config();
const fetch = require('node-fetch');
const mysql = require('mysql2/promise');

async function diagnoseCompleteSystem() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO SISTEMA DE IA WhatsApp');
  console.log('=' .repeat(60));
  
  const evolutionApiUrl = 'https://apizap.halarum.com.br';
  const globalToken = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798';
  const instanceKey = 'deploy1';
  
  // 1. Verificar se o servidor local está rodando
  console.log('\n📡 1. VERIFICANDO SERVIDOR LOCAL...');
  try {
    const serverResponse = await fetch('http://localhost:5000/api/system/settings');
    if (serverResponse.ok) {
      console.log('   ✅ Servidor local rodando na porta 5000');
    } else {
      console.log('   ❌ Servidor local com problemas:', serverResponse.status);
    }
  } catch (error) {
    console.log('   ❌ Servidor local não está rodando:', error.message);
    return;
  }
  
  // 2. Verificar configurações do banco
  console.log('\n🗄️  2. VERIFICANDO CONFIGURAÇÕES DO BANCO...');
  const dbConfig = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  };
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Configurações WhatsApp
    const [whatsappSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings WHERE is_active = TRUE'
    );
    console.log(`   WhatsApp API configurado: ${whatsappSettings.length > 0 ? '✅' : '❌'}`);
    if (whatsappSettings.length > 0) {
      const setting = whatsappSettings[0];
      console.log(`   URL: ${setting.evolution_api_url}`);
      console.log(`   Token: ${setting.global_token?.substring(0, 20)}...`);
    }
    
    // Instâncias WhatsApp
    const [instances] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE instance_key = ?', [instanceKey]
    );
    console.log(`   Instância ${instanceKey}: ${instances.length > 0 ? '✅' : '❌'}`);
    if (instances.length > 0) {
      const instance = instances[0];
      console.log(`   Status: ${instance.status}`);
      console.log(`   Webhook: ${instance.webhook}`);
    }
    
    // Configurações de IA
    const [aiSettings] = await connection.execute(
      'SELECT * FROM system_settings WHERE key LIKE "ai_%"'
    );
    console.log(`   Configurações IA: ${aiSettings.length > 0 ? '✅' : '❌'}`);
    if (aiSettings.length > 0) {
      const apiKey = aiSettings.find(s => s.key === 'ai_chatgpt_api_key');
      const model = aiSettings.find(s => s.key === 'ai_model');
      console.log(`   OpenAI API Key: ${apiKey ? '✅ Configurado' : '❌ Não configurado'}`);
      console.log(`   Modelo: ${model?.value || 'Não definido'}`);
    }
    
    await connection.end();
  } catch (error) {
    console.log('   ❌ Erro ao verificar banco:', error.message);
  }
  
  // 3. Testar webhook Evolution API
  console.log('\n🔗 3. VERIFICANDO WEBHOOK EVOLUTION API...');
  try {
    const webhookResponse = await fetch(`${evolutionApiUrl}/webhook/find/${instanceKey}`, {
      headers: { 'apikey': globalToken }
    });
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      console.log('   ✅ Webhook configurado:');
      console.log(`   URL: ${webhookData.url}`);
      console.log(`   Eventos: ${webhookData.events?.join(', ')}`);
      console.log(`   Ativo: ${webhookData.enabled ? '✅' : '❌'}`);
      
      // Verificar se a URL está correta
      const expectedLocal = 'http://localhost:5000/api/client/whatsapp-webhook/deploy1';
      const expectedPublic = 'https://suacoluna.gilliard.dev.br/api/client/whatsapp-webhook/deploy1';
      
      if (webhookData.url === expectedLocal) {
        console.log('   ⚠️  PROBLEMA: Webhook aponta para localhost (não funciona no VPS)');
        console.log('   📝 Solução: Reconfigurar webhook para URL pública');
      } else if (webhookData.url === expectedPublic) {
        console.log('   ✅ Webhook configurado para URL pública');
      }
    } else {
      console.log('   ❌ Erro ao buscar webhook:', await webhookResponse.text());
    }
  } catch (error) {
    console.log('   ❌ Erro ao verificar webhook:', error.message);
  }
  
  // 4. Testar status da instância
  console.log('\n📱 4. VERIFICANDO STATUS DA INSTÂNCIA...');
  try {
    const instanceResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      headers: { 'apikey': globalToken }
    });
    
    if (instanceResponse.ok) {
      const instances = await instanceResponse.json();
      const instance = instances.find(inst => 
        inst.instance?.instanceName === instanceKey || 
        inst.instanceName === instanceKey
      );
      
      if (instance) {
        const status = instance.instance?.status || instance.status;
        console.log(`   Status da instância: ${status}`);
        console.log(`   ${status === 'open' ? '✅' : status === 'connected' ? '✅' : '❌'} Instância ${status}`);
      } else {
        console.log('   ❌ Instância não encontrada');
      }
    } else {
      console.log('   ❌ Erro ao buscar instâncias:', await instanceResponse.text());
    }
  } catch (error) {
    console.log('   ❌ Erro ao verificar instância:', error.message);
  }
  
  // 5. Testar envio direto de mensagem
  console.log('\n📤 5. TESTANDO ENVIO DIRETO...');
  try {
    const testMessage = {
      number: '554999214230',
      text: `Teste diagnóstico - ${new Date().toLocaleTimeString()}`
    };
    
    const sendResponse = await fetch(`${evolutionApiUrl}/message/sendText/${instanceKey}`, {
      method: 'POST',
      headers: {
        'apikey': globalToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    console.log(`   Status do envio: ${sendResponse.status}`);
    if (sendResponse.ok) {
      const result = await sendResponse.json();
      console.log('   ✅ Mensagem enviada com sucesso');
      console.log(`   ID: ${result.key?.id}`);
    } else {
      const error = await sendResponse.text();
      console.log('   ❌ Erro no envio:', error);
    }
  } catch (error) {
    console.log('   ❌ Erro ao testar envio:', error.message);
  }
  
  // 6. Simular webhook local
  console.log('\n🧪 6. SIMULANDO WEBHOOK LOCAL...');
  try {
    const webhookData = {
      event: 'messages.upsert',
      instance: instanceKey,
      data: {
        key: {
          remoteJid: '554999214230@s.whatsapp.net',
          fromMe: false,
          id: 'TEST_' + Date.now()
        },
        message: {
          conversation: 'teste diagnóstico webhook'
        },
        messageType: 'conversation',
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    };
    
    const webhookResponse = await fetch(`http://localhost:5000/api/client/whatsapp-webhook/${instanceKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookData)
    });
    
    console.log(`   Status webhook: ${webhookResponse.status}`);
    if (webhookResponse.ok) {
      console.log('   ✅ Webhook processado com sucesso');
    } else {
      const error = await webhookResponse.text();
      console.log('   ❌ Erro no webhook:', error);
    }
  } catch (error) {
    console.log('   ❌ Erro ao simular webhook:', error.message);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 RESUMO DO DIAGNÓSTICO:');
  console.log('1. Verifique se todos os itens estão ✅');
  console.log('2. Se webhook aponta para localhost, reconfigure para URL pública');
  console.log('3. Se instância não está "open/connected", reconecte no painel');
  console.log('4. Se OpenAI não configurado, configure a chave API');
  console.log('5. Teste enviando mensagem real após correções');
}

diagnoseCompleteSystem().catch(console.error);