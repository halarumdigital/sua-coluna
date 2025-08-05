const { drizzle } = require('drizzle-orm/mysql2');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createWhatsAppAdminSettings() {
  console.log('🔧 Configurando configurações do WhatsApp para o administrador...\n');

  try {
    // Conectar ao banco de dados
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sua_coluna',
    });

    const db = drizzle(connection);

    // Verificar se já existem configurações
    const [existingSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings LIMIT 1'
    );

    if (existingSettings.length > 0) {
      console.log('⚠️  Configurações do WhatsApp já existem:');
      const settings = existingSettings[0];
      console.log(`   URL: ${settings.evolution_api_url}`);
      console.log(`   Token: ${settings.global_token ? '***' : 'Não configurado'}`);
      console.log(`   Ativo: ${settings.is_active ? 'Sim' : 'Não'}`);
      console.log(`   Criado em: ${settings.created_at}`);
      console.log('');
      return;
    }

    // Buscar usuário administrador
    const [adminUsers] = await connection.execute(
      'SELECT id FROM users WHERE role = "admin" LIMIT 1'
    );

    if (adminUsers.length === 0) {
      console.log('❌ Nenhum usuário administrador encontrado');
      console.log('   Crie um usuário administrador primeiro usando: node create-admin-user.cjs');
      return;
    }

    const adminUserId = adminUsers[0].id;

    // Configurações padrão para teste
    const defaultSettings = {
      evolutionApiUrl: 'https://api.evolution.com.br', // URL de exemplo
      globalToken: 'your-evolution-api-token', // Token de exemplo
      isActive: true,
      createdBy: adminUserId
    };

    // Inserir configurações
    await connection.execute(
      `INSERT INTO whatsapp_api_settings 
       (id, evolution_api_url, global_token, is_active, created_by, created_at, updated_at) 
       VALUES (UUID(), ?, ?, ?, ?, NOW(), NOW())`,
      [
        defaultSettings.evolutionApiUrl,
        defaultSettings.globalToken,
        defaultSettings.isActive,
        defaultSettings.createdBy
      ]
    );

    console.log('✅ Configurações do WhatsApp criadas com sucesso:');
    console.log(`   URL: ${defaultSettings.evolutionApiUrl}`);
    console.log(`   Token: ${defaultSettings.globalToken}`);
    console.log(`   Ativo: ${defaultSettings.isActive ? 'Sim' : 'Não'}`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Configure a URL e token corretos da sua Evolution API:');
    console.log('   1. Acesse o painel do administrador');
    console.log('   2. Vá para a página de configurações do WhatsApp');
    console.log('   3. Atualize a URL e token com os valores corretos da sua Evolution API');
    console.log('');

    await connection.end();

  } catch (error) {
    console.error('❌ Erro ao configurar WhatsApp:', error.message);
    
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('\n💡 Dica: Execute as migrations primeiro:');
      console.log('   npm run migrate');
    }
  }
}

// Executar o script
createWhatsAppAdminSettings().catch(console.error); 