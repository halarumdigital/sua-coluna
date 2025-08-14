const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCustomAgents() {
  console.log('🔍 Verificando agentes customizados...');

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

    // Verificar agentes customizados
    const [customAgents] = await connection.execute('SELECT * FROM custom_ai_agents');
    console.log(`\n🤖 Agentes Customizados: ${customAgents.length}`);
    
    if (customAgents.length > 0) {
      customAgents.forEach((agent, index) => {
        console.log(`${index + 1}. ${agent.name} (ID: ${agent.id})`);
        console.log(`   • Ativo: ${agent.is_active ? 'Sim' : 'Não'}`);
        console.log(`   • Criado em: ${agent.created_at}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhum agente customizado encontrado');
      
      // Verificar se existem prompts globais que podem ser convertidos
      const [globalPrompts] = await connection.execute('SELECT * FROM global_prompts WHERE is_active = 1');
      
      if (globalPrompts.length > 0) {
        console.log('\n💡 Prompts globais disponíveis para conversão:');
        globalPrompts.forEach((prompt, index) => {
          console.log(`${index + 1}. ${prompt.name} (ID: ${prompt.id})`);
        });
        
        // Criar agente customizado baseado no primeiro prompt global
        const firstPrompt = globalPrompts[0];
        console.log(`\n🔧 Criando agente customizado baseado em: ${firstPrompt.name}`);
        
        const customAgentId = `custom-${Date.now()}`;
        
        await connection.execute(`
          INSERT INTO custom_ai_agents (
            id, name, description, prompt, model, max_tokens, temperature, 
            is_active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          customAgentId,
          firstPrompt.name,
          firstPrompt.description || 'Agente baseado em prompt global',
          firstPrompt.prompt,
          'gpt-3.5-turbo',
          1000,
          0.7,
          true
        ]);
        
        console.log(`✅ Agente customizado criado: ${customAgentId}`);
        
        // Atualizar a vinculação
        const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
        const [instanceData] = await connection.execute(
          'SELECT * FROM whatsapp_instances WHERE instance_key = ?',
          [instanceKey]
        );
        
        if (instanceData.length > 0) {
          const instance = instanceData[0];
          
          await connection.execute(
            'UPDATE client_whatsapp_instance_agent_bindings SET agent_id = ?, updated_at = NOW() WHERE instance_id = ?',
            [customAgentId, instance.id]
          );
          
          console.log('✅ Vinculação atualizada com o novo agente customizado');
        }
      }
    }

    // Verificar vinculação final
    const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
    const [instanceData] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE instance_key = ?',
      [instanceKey]
    );

    if (instanceData.length > 0) {
      const instance = instanceData[0];
      
      const [finalBindings] = await connection.execute(`
        SELECT 
          b.*,
          a.name as agent_name,
          a.prompt as agent_prompt,
          a.is_active as agent_active
        FROM client_whatsapp_instance_agent_bindings b
        LEFT JOIN custom_ai_agents a ON b.agent_id = a.id
        WHERE b.instance_id = ?
      `, [instance.id]);

      if (finalBindings.length > 0) {
        const binding = finalBindings[0];
        console.log('\n🎯 VINCULAÇÃO FINAL:');
        console.log(`   • Instância: ${instance.instance_name} (${instance.instance_key})`);
        console.log(`   • Agente: ${binding.agent_name || 'N/A'}`);
        console.log(`   • Agente ativo: ${binding.agent_active ? 'Sim' : 'Não'}`);
        console.log(`   • Binding ativo: ${binding.is_active ? 'Sim' : 'Não'}`);
        
        if (binding.agent_name && binding.agent_active && binding.is_active) {
          console.log('\n🎉 VINCULAÇÃO CONFIGURADA CORRETAMENTE!');
        }
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

checkCustomAgents().catch(console.error);