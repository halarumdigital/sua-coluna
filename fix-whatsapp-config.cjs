const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixWhatsAppConfig() {
  console.log('🔧 Corrigindo configurações do WhatsApp...');

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

    // 1. Ativar WhatsApp API
    console.log('\n🔧 Ativando WhatsApp API...');
    const [updateResult] = await connection.execute(
      'UPDATE whatsapp_api_settings SET is_active = 1 WHERE id IS NOT NULL'
    );
    console.log(`✅ WhatsApp API ativada (${updateResult.affectedRows} registros atualizados)`);

    // 2. Verificar se existe API Key do OpenAI
    const [aiConfig] = await connection.execute('SELECT * FROM ai_configurations LIMIT 1');
    if (aiConfig.length > 0 && !aiConfig[0].openai_api_key) {
      console.log('\n⚠️ API Key do OpenAI não configurada');
      console.log('💡 Você precisa configurar a API Key do OpenAI no painel admin');
      console.log('   Acesse: /admin/ai-settings');
    } else if (aiConfig.length > 0 && aiConfig[0].openai_api_key) {
      console.log('\n✅ API Key do OpenAI já está configurada');
    }

    // 3. Verificar o agente vinculado
    console.log('\n🔍 Verificando agente vinculado...');
    const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
    
    const [instanceData] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE instance_key = ?',
      [instanceKey]
    );

    if (instanceData.length > 0) {
      const instance = instanceData[0];
      
      const [bindings] = await connection.execute(`
        SELECT 
          b.*,
          p.name as agent_name,
          p.prompt as agent_prompt,
          p.is_active as agent_active
        FROM client_whatsapp_instance_agent_bindings b
        LEFT JOIN global_prompts p ON b.agent_id = p.id
        WHERE b.instance_id = ?
      `, [instance.id]);

      if (bindings.length > 0) {
        const binding = bindings[0];
        console.log(`🔗 Vinculação encontrada:`);
        console.log(`   • Binding ID: ${binding.id}`);
        console.log(`   • Agent ID: ${binding.agent_id}`);
        console.log(`   • Agente: ${binding.agent_name || 'Nome não encontrado'}`);
        console.log(`   • Agente ativo: ${binding.agent_active ? 'Sim' : 'Não'}`);
        console.log(`   • Binding ativo: ${binding.is_active ? 'Sim' : 'Não'}`);

        if (!binding.agent_name) {
          console.log('\n🔍 Verificando se o agente existe...');
          const [agent] = await connection.execute(
            'SELECT * FROM global_prompts WHERE id = ?',
            [binding.agent_id]
          );
          
          if (agent.length > 0) {
            console.log(`✅ Agente encontrado: ${agent[0].name}`);
          } else {
            console.log(`❌ Agente não encontrado com ID: ${binding.agent_id}`);
            
            // Listar agentes disponíveis
            const [availableAgents] = await connection.execute(
              'SELECT * FROM global_prompts WHERE is_active = 1'
            );
            
            if (availableAgents.length > 0) {
              console.log('\n📋 Agentes disponíveis:');
              availableAgents.forEach((agent, index) => {
                console.log(`${index + 1}. ${agent.name} (ID: ${agent.id})`);
              });
              
              // Vincular ao primeiro agente disponível
              const firstAgent = availableAgents[0];
              console.log(`\n🔧 Vinculando ao agente: ${firstAgent.name}`);
              
              await connection.execute(
                'UPDATE client_whatsapp_instance_agent_bindings SET agent_id = ?, updated_at = NOW() WHERE id = ?',
                [firstAgent.id, binding.id]
              );
              
              console.log('✅ Vinculação atualizada com sucesso');
            }
          }
        }
      }
    }

    // 4. Status final
    console.log('\n📊 VERIFICAÇÃO FINAL:');
    
    const [finalAiConfig] = await connection.execute('SELECT * FROM ai_configurations LIMIT 1');
    const [finalWhatsappConfig] = await connection.execute('SELECT * FROM whatsapp_api_settings LIMIT 1');
    
    console.log(`   • API Key OpenAI: ${finalAiConfig.length > 0 && finalAiConfig[0].openai_api_key ? '✅' : '❌'}`);
    console.log(`   • WhatsApp API ativa: ${finalWhatsappConfig.length > 0 && finalWhatsappConfig[0].is_active ? '✅' : '❌'}`);
    
    if (finalAiConfig.length > 0 && finalAiConfig[0].openai_api_key && 
        finalWhatsappConfig.length > 0 && finalWhatsappConfig[0].is_active) {
      console.log('\n🎉 SISTEMA CONFIGURADO E PRONTO!');
      console.log('📱 Agora quando alguém enviar mensagem para a instância, o agente responderá automaticamente');
    } else {
      console.log('\n⚠️ Ainda há configurações pendentes');
      if (!finalAiConfig[0]?.openai_api_key) {
        console.log('   - Configure a API Key do OpenAI em /admin/ai-settings');
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

fixWhatsAppConfig().catch(console.error);