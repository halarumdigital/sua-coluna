const mysql = require('mysql2/promise');
require('dotenv').config();

async function getWhatsAppToken() {
  let connection;
  
  try {
    console.log('🔍 Obtendo token real do WhatsApp...\n');

    // Criar conexão com o banco
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };

    connection = await mysql.createConnection(config);
    console.log('✅ Conectado ao banco de dados');

    // Obter configurações da API WhatsApp
    const [apiSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings ORDER BY created_at DESC LIMIT 1'
    );

    if (apiSettings.length > 0) {
      const settings = apiSettings[0];
      console.log('📋 Configurações encontradas:');
      console.log('  Evolution API URL:', settings.evolution_api_url);
      console.log('  Token completo:', settings.global_token);
      console.log('  Ativo:', settings.is_active ? 'Sim' : 'Não');
      console.log('  Criado em:', settings.created_at);
      
      return {
        evolutionApiUrl: settings.evolution_api_url,
        globalToken: settings.global_token,
        isActive: settings.is_active
      };
    } else {
      console.log('❌ Nenhuma configuração encontrada');
      return null;
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    return null;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

// Exportar e executar
if (require.main === module) {
  getWhatsAppToken().then((config) => {
    if (config) {
      console.log('\n🎯 Configure o debug-evolution-api.cjs com estes valores:');
      console.log(`const evolutionApiUrl = '${config.evolutionApiUrl}';`);
      console.log(`const globalToken = '${config.globalToken}';`);
    }
    console.log('\n🏁 Finalizado');
  }).catch(err => {
    console.error('💥 Falha:', err);
  });
}

module.exports = getWhatsAppToken;