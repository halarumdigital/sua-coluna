const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkWhatsAppSettings() {
  let connection;
  
  try {
    console.log('🔍 Verificando configurações do WhatsApp no banco...\n');

    // Criar conexão com o banco
    const config = {
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306')
    };

    console.log('📡 Configuração do banco:');
    console.log('  Host:', config.host);
    console.log('  User:', config.user);
    console.log('  Database:', config.database);
    console.log('  Port:', config.port);

    connection = await mysql.createConnection(config);

    console.log('✅ Conectado ao banco de dados');

    // 1. Verificar configurações da API WhatsApp
    console.log('\n📋 Configurações da API WhatsApp:');
    const [apiSettings] = await connection.execute(
      'SELECT * FROM whatsapp_api_settings ORDER BY created_at DESC LIMIT 1'
    );

    if (apiSettings.length > 0) {
      const settings = apiSettings[0];
      console.log('✅ Configurações encontradas:');
      console.log('  ID:', settings.id);
      console.log('  Evolution API URL:', settings.evolution_api_url);
      console.log('  Token (primeiros 20 chars):', settings.global_token?.substring(0, 20) + '...');
      console.log('  Ativo:', settings.is_active ? 'Sim' : 'Não');
      console.log('  Criado em:', settings.created_at);
      
      if (!settings.is_active) {
        console.log('⚠️  ATENÇÃO: Configurações estão INATIVAS!');
      }
    } else {
      console.log('❌ Nenhuma configuração da API WhatsApp encontrada');
      console.log('💡 Execute o setup das configurações de WhatsApp no painel admin');
    }

    // 2. Verificar instâncias do WhatsApp
    console.log('\n📱 Instâncias do WhatsApp:');
    const [instances] = await connection.execute(`
      SELECT 
        wi.*,
        c.company_name as client_name,
        c.email as client_email
      FROM whatsapp_instances wi 
      LEFT JOIN clients c ON wi.client_id = c.id 
      ORDER BY wi.created_at DESC
    `);

    if (instances.length > 0) {
      console.log(`✅ ${instances.length} instância(s) encontrada(s):`);
      instances.forEach((instance, index) => {
        console.log(`\n  [${index + 1}] ${instance.instance_name}`);
        console.log('    Instance Key:', instance.instance_key);
        console.log('    Telefone:', instance.phone_number);
        console.log('    Status:', instance.status);
        console.log('    Cliente:', instance.client_name, `(${instance.client_email})`);
        console.log('    Ativo:', instance.is_active ? 'Sim' : 'Não');
        console.log('    Criado em:', instance.created_at);
      });
    } else {
      console.log('❌ Nenhuma instância do WhatsApp encontrada');
    }

    // 3. Verificar usuários cliente
    console.log('\n👥 Usuários cliente:');
    const [users] = await connection.execute(`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.active,
        c.name as company_name
      FROM users u
      LEFT JOIN clients c ON u.id = c.user_id
      WHERE u.role = 'client'
      ORDER BY u.created_at DESC
    `);

    if (users.length > 0) {
      console.log(`✅ ${users.length} usuário(s) cliente encontrado(s):`);
      users.forEach((user, index) => {
        console.log(`\n  [${index + 1}] ${user.email}`);
        console.log('    Nome:', user.first_name, user.last_name);
        console.log('    Empresa:', user.company_name || 'N/A');
        console.log('    Ativo:', user.active ? 'Sim' : 'Não');
      });
    } else {
      console.log('❌ Nenhum usuário cliente encontrado');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Verifique se o banco de dados MySQL está rodando');
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão com banco fechada');
    }
  }
}

checkWhatsAppSettings().then(() => {
  console.log('\n🏁 Verificação finalizada');
}).catch(err => {
  console.error('💥 Falha na verificação:', err);
});