const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSystemSettings() {
  console.log('🔍 Verificando configurações do sistema...');

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

    // Verificar todas as configurações do sistema
    const [settings] = await connection.execute('SELECT * FROM system_settings ORDER BY setting_key');
    console.log(`\n📊 Configurações do Sistema: ${settings.length}`);
    
    if (settings.length > 0) {
      console.log('\n📋 Todas as configurações:');
      settings.forEach((setting, index) => {
        const value = setting.setting_key.includes('api_key') || setting.setting_key.includes('token') 
          ? setting.setting_value.substring(0, 20) + '...' 
          : setting.setting_value;
        console.log(`${index + 1}. ${setting.setting_key} = ${value}`);
      });
    }

    // Verificar especificamente configurações de AI
    const aiKeys = [
      'ai_chatgpt_api_key',
      'ai_temperature', 
      'ai_max_tokens',
      'ai_model',
      'ai_system_prompt'
    ];

    console.log('\n🤖 CONFIGURAÇÕES DE AI:');
    let hasApiKey = false;
    
    for (const key of aiKeys) {
      const [result] = await connection.execute(
        'SELECT * FROM system_settings WHERE setting_key = ?',
        [key]
      );
      
      if (result.length > 0) {
        const value = key.includes('api_key') 
          ? result[0].setting_value.substring(0, 20) + '...' 
          : result[0].setting_value;
        console.log(`   • ${key}: ${value}`);
        
        if (key === 'ai_chatgpt_api_key' && result[0].setting_value) {
          hasApiKey = true;
        }
      } else {
        console.log(`   • ${key}: Não configurado`);
      }
    }

    // Status final
    console.log('\n🎯 STATUS FINAL COMPLETO:');
    
    // Verificar instância
    const instanceKey = 'deploy1_ec227650-755b-11f0-8b9e-2ae8d4b3399a_1755135347398';
    const [instanceData] = await connection.execute(
      'SELECT * FROM whatsapp_instances WHERE instance_key = ?',
      [instanceKey]
    );

    // Verificar WhatsApp API
    const [whatsappConfig] = await connection.execute('SELECT * FROM whatsapp_api_settings LIMIT 1');

    // Verificar vinculação
    let hasValidBinding = false;
    if (instanceData.length > 0) {
      const [bindings] = await connection.execute(
        'SELECT * FROM client_whatsapp_instance_agent_bindings WHERE instance_id = ? AND is_active = 1',
        [instanceData[0].id]
      );
      hasValidBinding = bindings.length > 0;
    }

    console.log(`   • Instância conectada: ${instanceData.length > 0 && instanceData[0].status === 'connected' ? '✅' : '❌'}`);
    console.log(`   • Webhook configurado: ${instanceData.length > 0 && instanceData[0].webhook ? '✅' : '❌'}`);
    console.log(`   • API Key OpenAI: ${hasApiKey ? '✅' : '❌'}`);
    console.log(`   • WhatsApp API ativa: ${whatsappConfig.length > 0 && whatsappConfig[0].is_active ? '✅' : '❌'}`);
    console.log(`   • Agente vinculado: ${hasValidBinding ? '✅' : '❌'}`);

    if (instanceData.length > 0 && instanceData[0].status === 'connected' && 
        instanceData[0].webhook && hasApiKey && 
        whatsappConfig.length > 0 && whatsappConfig[0].is_active && 
        hasValidBinding) {
      
      console.log('\n🎉 SISTEMA TOTALMENTE FUNCIONAL!');
      console.log('\n📱 TESTE AGORA:');
      console.log('   1. Envie uma mensagem WhatsApp para o número da instância');
      console.log('   2. O sistema receberá via webhook');
      console.log('   3. O agente "Secretáriaaaaa" processará a mensagem');
      console.log('   4. Uma resposta será enviada automaticamente');
      console.log('\n✨ O agente está pronto para responder!');
      
    } else {
      console.log('\n⚠️ Verificar itens marcados com ❌ acima');
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSystemSettings().catch(console.error);