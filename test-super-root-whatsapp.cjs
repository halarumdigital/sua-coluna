const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSuperRootWhatsApp() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('📱 Testando configurações WhatsApp do Super Root...\n');

    // Verificar se existem configurações do WhatsApp
    const [settings] = await connection.execute(`
      SELECT id, evolution_api_url, global_token, is_active, created_by, created_at
      FROM whatsapp_api_settings
      ORDER BY created_at DESC
    `);

    console.log('📋 Configurações atuais do WhatsApp:');
    if (settings.length > 0) {
      settings.forEach((setting, index) => {
        console.log(`   ${index + 1}. URL: ${setting.evolution_api_url}`);
        console.log(`      Token: ${setting.global_token ? '••••••••••••••••' : 'Não configurado'}`);
        console.log(`      Ativo: ${setting.is_active ? 'Sim' : 'Não'}`);
        console.log(`      Criado em: ${setting.created_at}`);
        console.log('');
      });
    } else {
      console.log('   Nenhuma configuração encontrada');
    }

    // Verificar se a tabela existe
    const [tableExists] = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'whatsapp_api_settings'
    `, [process.env.MYSQL_DATABASE]);

    console.log(`📊 Tabela whatsapp_api_settings existe: ${tableExists[0].count > 0 ? 'Sim' : 'Não'}`);

    // Verificar usuário super root
    const [superRootUsers] = await connection.execute(`
      SELECT id, email, first_name, last_name, role, active
      FROM users 
      WHERE role = 'super_root'
    `);

    console.log('\n👤 Usuários Super Root:');
    superRootUsers.forEach(user => {
      console.log(`   ✅ ${user.first_name} ${user.last_name} (${user.email}) - ${user.active ? 'Ativo' : 'Inativo'}`);
    });

    // Adicionar configuração de exemplo se não existir
    if (settings.length === 0 && superRootUsers.length > 0) {
      console.log('\n🔧 Adicionando configuração de exemplo...');
      
      try {
        await connection.execute(`
          INSERT INTO whatsapp_api_settings (
            evolution_api_url, global_token, is_active, created_by
          ) VALUES (?, ?, ?, ?)
        `, [
          'https://api.evolution.example.com',
          'example_global_token_12345',
          true,
          superRootUsers[0].id
        ]);
        console.log('✅ Configuração de exemplo adicionada');
      } catch (error) {
        console.log('⚠️  Erro ao adicionar configuração de exemplo:', error.message);
      }
    }

    console.log('\n🎉 Teste do WhatsApp Super Root concluído!');
    console.log('\n📋 Funcionalidades disponíveis:');
    console.log('1. Configurar URL da Evolution API');
    console.log('2. Configurar Token Global');
    console.log('3. Ativar/Desativar configurações');
    console.log('4. Visualizar status das configurações');
    console.log('\n🔐 Acesso: Apenas usuários com role "super_root"');
    console.log('🌐 Interface: /super-root/whatsapp');

  } catch (error) {
    console.error('❌ Erro ao testar WhatsApp:', error);
  } finally {
    await connection.end();
  }
}

testSuperRootWhatsApp();