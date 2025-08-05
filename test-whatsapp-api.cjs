const mysql = require('mysql2/promise');
require('dotenv').config();

async function testWhatsAppAPI() {
  let connection;
  
  try {
    console.log('🧪 Testando API do WhatsApp...');
    
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };
    
    connection = await mysql.createConnection(config);
    console.log('✅ Conexão estabelecida!');
    
    // Testar inserção de dados
    console.log('📝 Testando inserção de dados...');
    
    // Primeiro, desativar todas as configurações existentes
    await connection.execute(`
      UPDATE whatsapp_api_settings 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    `);
    
    // Inserir nova configuração
    const [result] = await connection.execute(`
      INSERT INTO whatsapp_api_settings (
        evolution_api_url, 
        global_token, 
        is_active, 
        created_by
      ) VALUES (?, ?, ?, ?)
    `, [
      'https://apizap.halarum.com.br',
      'test_token_123',
      true,
      'test-user-id'
    ]);
    
    console.log('✅ Dados inseridos com sucesso!');
    console.log('ID inserido:', result.insertId);
    
    // Verificar se os dados foram inseridos
    const [settings] = await connection.execute(`
      SELECT * FROM whatsapp_api_settings 
      WHERE is_active = TRUE 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (settings.length > 0) {
      console.log('✅ Configurações encontradas:');
      console.log('- URL:', settings[0].evolution_api_url);
      console.log('- Token:', settings[0].global_token ? '••••••••••••••••' : 'Não configurado');
      console.log('- Ativo:', settings[0].is_active ? 'Sim' : 'Não');
      console.log('- Criado em:', settings[0].created_at);
    } else {
      console.log('❌ Nenhuma configuração ativa encontrada');
    }
    
    console.log('\n🎉 Teste concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testWhatsAppAPI(); 