require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkWhatsAppTokens() {
  console.log('🔐 Verificando tokens do WhatsApp...');
  
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
  
  try {
    // 1. Verificar configurações globais
    console.log('\n📋 Configurações globais da API:');
    const [settings] = await conn.execute('SELECT * FROM whatsapp_api_settings WHERE is_active = TRUE');
    
    if (settings.length > 0) {
      const setting = settings[0];
      console.log(`   Evolution API URL: ${setting.evolution_api_url}`);
      console.log(`   Global Token: ${setting.global_token ? setting.global_token.substring(0, 20) + '...' : 'Não configurado'}`);
      console.log(`   Token completo: ${setting.global_token || 'Não configurado'}`);
    } else {
      console.log('   ❌ Nenhuma configuração ativa encontrada');
    }
    
    // 2. Verificar instância específica
    console.log('\n📱 Instância deploy1:');
    const [instances] = await conn.execute('SELECT * FROM whatsapp_instances WHERE instance_key = ?', ['deploy1']);
    
    if (instances.length > 0) {
      const instance = instances[0];
      console.log(`   Instance Key: ${instance.instance_key}`);
      console.log(`   Status: ${instance.status}`);
      console.log(`   Token: ${instance.token || 'Não configurado'}`);
      console.log(`   Phone Number: ${instance.phone_number || 'Não configurado'}`);
      console.log(`   Webhook: ${instance.webhook || 'Não configurado'}`);
    } else {
      console.log('   ❌ Instância deploy1 não encontrada');
    }
    
    // 3. Verificar se token está correto (baseado nos logs que você mostrou)
    console.log('\n🔍 Comparando com token dos logs da Evolution API:');
    const expectedToken = '74DCEF06-5FAE-4B1E-B090-F023D3CC9798';
    console.log(`   Token esperado: ${expectedToken}`);
    
    if (settings.length > 0) {
      const actualToken = settings[0].global_token;
      if (actualToken === expectedToken) {
        console.log('   ✅ Token está correto!');
      } else {
        console.log('   ❌ Token está incorreto!');
        console.log('   🔧 Corrigindo token...');
        
        await conn.execute(
          'UPDATE whatsapp_api_settings SET global_token = ? WHERE is_active = TRUE',
          [expectedToken]
        );
        
        console.log('   ✅ Token corrigido com sucesso!');
      }
    }
    
    await conn.end();
    console.log('\n✅ Verificação concluída!');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await conn.end();
  }
}

checkWhatsAppTokens().catch(console.error);