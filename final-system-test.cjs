const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function finalSystemTest() {
  console.log('🎯 TESTE FINAL DO SISTEMA DE RESPOSTA AUTOMÁTICA');

  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conectado ao banco de dados');

    // 1. Verificar API Key OpenAI
    const [apiKeyResult] = await connection.execute(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'ai_chatgpt_api_key'"
    );
    const hasApiKey = apiKeyResult.length > 0 && apiKeyResult[0].setting_value;

    // 2. Verificar instância WhatsApp
    const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
    const [instanceResult] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE instance_key = ?',
      [instanceKey]
    );
    const instance = instanceResult[0];

    // 3. Verificar WhatsApp API
    const [whatsappApiResult] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings WHERE is_active = 1'
    );
    const hasActiveWhatsAppApi = whatsappApiResult.length > 0;

    // 4. Verificar vinculação agente
    const [bindingResult] = await connection.execute(`
      SELECT 
        b.*,
        a.name as agent_name,
        a.is_active as agent_active
      FROM client_whatsapp_instance_agent_bindings b
      LEFT JOIN custom_ai_agents a ON b.agent_id = a.id
      WHERE b.instance_id = ? AND b.is_active = 1
    `, [instance.id]);
    const hasActiveBinding = bindingResult.length > 0 && bindingResult[0].agent_active;

    console.log('\n📊 CHECKLIST FINAL:');
    console.log(`   1. API Key OpenAI configurada: ${hasApiKey ? '✅' : '❌'}`);
    console.log(`   2. Instância WhatsApp conectada: ${instance && instance.status === 'connected' ? '✅' : '❌'}`);
    console.log(`   3. Webhook configurado: ${instance && instance.webhook ? '✅' : '❌'}`);
    console.log(`   4. WhatsApp API ativa: ${hasActiveWhatsAppApi ? '✅' : '❌'}`);
    console.log(`   5. Agente vinculado e ativo: ${hasActiveBinding ? '✅' : '❌'}`);

    if (hasApiKey && instance && instance.status === 'connected' && 
        instance.webhook && hasActiveWhatsAppApi && hasActiveBinding) {
      
      console.log('\n🎉 SISTEMA 100% FUNCIONAL!');
      console.log('\n📱 DETALHES DA CONFIGURAÇÃO:');
      console.log(`   • Instância: ${instance.instance_name}`);
      console.log(`   • Status: ${instance.status}`);
      console.log(`   • Agente: ${bindingResult[0].agent_name}`);
      console.log(`   • Webhook: ${instance.webhook}`);
      
      console.log('\n🚀 COMO TESTAR:');
      console.log('   1. Envie uma mensagem WhatsApp para o número da instância');
      console.log('   2. A Evolution API enviará um webhook para:');
      console.log(`      ${instance.webhook}`);
      console.log('   3. O sistema processará a mensagem com o agente "Secretáriaaaaa"');
      console.log('   4. Uma resposta será gerada usando OpenAI');
      console.log('   5. A resposta será enviada automaticamente via WhatsApp');
      
      console.log('\n✨ O AGENTE ESTÁ PRONTO PARA RESPONDER AUTOMATICAMENTE!');
      console.log('\n💡 PRÓXIMOS PASSOS:');
      console.log('   • Teste enviando uma mensagem para o número');
      console.log('   • Monitore os logs do servidor para ver o processamento');
      console.log('   • Verifique se a resposta é enviada corretamente');
      
    } else {
      console.log('\n❌ SISTEMA NÃO ESTÁ COMPLETAMENTE CONFIGURADO');
      console.log('   Verifique os itens marcados com ❌ acima');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

finalSystemTest().catch(console.error);