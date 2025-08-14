const mysql = require('mysql2/promise');

async function testWhatsAppTables() {
  let connection;
  
  try {
    // Conectar ao banco de dados
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'sua_coluna'
    });

    console.log('✅ Conectado ao banco de dados');

    // Verificar se a tabela whatsapp_api_settings existe
    console.log('\n🔍 Verificando tabela whatsapp_api_settings...');
    const [settingsTables] = await connection.execute(
      "SHOW TABLES LIKE 'whatsapp_api_settings'"
    );
    
    if (settingsTables.length === 0) {
      console.log('❌ Tabela whatsapp_api_settings não existe');
    } else {
      console.log('✅ Tabela whatsapp_api_settings existe');
      
      // Verificar estrutura da tabela
      const [settingsStructure] = await connection.execute(
        'DESCRIBE whatsapp_api_settings'
      );
      console.log('📋 Estrutura da tabela whatsapp_api_settings:');
      settingsStructure.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
      
      // Verificar se há dados
      const [settingsCount] = await connection.execute(
        'SELECT COUNT(*) as total FROM whatsapp_api_settings'
      );
      console.log(`📊 Total de configurações: ${settingsCount[0].total}`);
      
      if (settingsCount[0].total > 0) {
        const [settings] = await connection.execute(
          'SELECT id, evolution_api_url, global_token, system_url, is_active, created_at FROM whatsapp_api_settings ORDER BY created_at DESC LIMIT 1'
        );
        console.log('⚙️ Última configuração:', settings[0]);
      }
    }

    // Verificar se a tabela admin_whatsapp_instances existe
    console.log('\n🔍 Verificando tabela admin_whatsapp_instances...');
    const [instancesTables] = await connection.execute(
      "SHOW TABLES LIKE 'admin_whatsapp_instances'"
    );
    
    if (instancesTables.length === 0) {
      console.log('❌ Tabela admin_whatsapp_instances não existe');
    } else {
      console.log('✅ Tabela admin_whatsapp_instances existe');
      
      // Verificar estrutura da tabela
      const [instancesStructure] = await connection.execute(
        'DESCRIBE admin_whatsapp_instances'
      );
      console.log('📋 Estrutura da tabela admin_whatsapp_instances:');
      instancesStructure.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
      });
      
      // Verificar se há dados
      const [instancesCount] = await connection.execute(
        'SELECT COUNT(*) as total FROM admin_whatsapp_instances'
      );
      console.log(`📊 Total de instâncias: ${instancesCount[0].total}`);
      
      if (instancesCount[0].total > 0) {
        const [instances] = await connection.execute(
          'SELECT id, instance_name, instance_key, status, phone_number, is_active, created_at FROM admin_whatsapp_instances ORDER BY created_at DESC LIMIT 5'
        );
        console.log('📱 Últimas instâncias:');
        instances.forEach(instance => {
          console.log(`  - ${instance.instance_name} (${instance.instance_key}): ${instance.status} - ${instance.phone_number}`);
        });
      }
    }

    // Verificar tabela de migrations
    console.log('\n🔍 Verificando tabela de migrations...');
    const [migrationsTables] = await connection.execute(
      "SHOW TABLES LIKE 'migrations'"
    );
    
    if (migrationsTables.length === 0) {
      console.log('❌ Tabela migrations não existe');
    } else {
      console.log('✅ Tabela migrations existe');
      
      // Verificar migrations executadas
      const [migrations] = await connection.execute(
        'SELECT id, name, executed_at, success FROM migrations ORDER BY executed_at DESC'
      );
      console.log('📋 Migrations executadas:');
      migrations.forEach(migration => {
        console.log(`  - ${migration.name}: ${migration.success ? '✅' : '❌'} (${migration.executed_at})`);
      });
    }

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

testWhatsAppTables();
