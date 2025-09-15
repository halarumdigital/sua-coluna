import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250915000002_migrate_global_configurations_to_system_settings',
  name: 'Migrate global configurations to system settings',

  async up() {
    console.log('Executando migration: Migrate global configurations to system settings');

    // Esta migration documenta a migração dos dados de global_configurations
    // para system_settings que já foi realizada

    console.log('📋 Configurações migradas de global_configurations para system_settings:');

    const migratedSettings = [
      { key: 'system_name', description: 'Nome do sistema (nome_sistema)' },
      { key: 'system_footer', description: 'Rodapé do sistema (nome_rodape)' },
      { key: 'browser_tab_name', description: 'Nome da aba do navegador (nome_aba_navegador)' },
      { key: 'primary_color', description: 'Cor primária (cores_primaria)' },
      { key: 'secondary_color', description: 'Cor secundária (cores_secundaria)' },
      { key: 'background_color', description: 'Cor de fundo (cores_fundo)' }
    ];

    migratedSettings.forEach((setting, index) => {
      console.log(`   ${index + 1}. ${setting.key} - ${setting.description}`);
    });

    // Verificar se as configurações existem em system_settings
    console.log('\\n🔍 Verificando se as configurações foram migradas...');

    for (const setting of migratedSettings) {
      try {
        const [exists] = await db.execute(sql.raw(`
          SELECT setting_value
          FROM system_settings
          WHERE setting_key = '${setting.key}'
          LIMIT 1
        `));

        if ((exists as any).length > 0) {
          const value = (exists as any)[0].setting_value;
          console.log(`   ✅ ${setting.key} = "${value}"`);
        } else {
          console.log(`   ⚠️  ${setting.key} não encontrada em system_settings`);
        }
      } catch (error) {
        console.log(`   ❌ Erro ao verificar ${setting.key}: ${(error as any).message}`);
      }
    }

    // Verificar se global_configurations ainda existe (não deveria)
    try {
      const [tableExists] = await db.execute(sql.raw(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'global_configurations'
      `));

      if ((tableExists as any)[0].count > 0) {
        console.log('⚠️  Tabela global_configurations ainda existe');
        console.log('   Isso indica que a migração pode não ter sido concluída');
      } else {
        console.log('✅ Tabela global_configurations foi removida com sucesso');
      }
    } catch (error) {
      console.log('❌ Erro ao verificar existência da tabela global_configurations');
    }

    console.log('✅ Documentação da migração de configurações concluída');
    console.log('ℹ️  Os dados já foram fisicamente migrados');
    console.log('ℹ️  Esta migration serve apenas para documentar as mudanças');
  },

  async down() {
    console.log('Revertendo migration: Migrate global configurations to system settings');

    console.log('⚠️  ATENÇÃO: Esta migration não pode ser revertida automaticamente');
    console.log('ℹ️  Para reverter seria necessário:');
    console.log('   1. Recriar a tabela global_configurations');
    console.log('   2. Migrar os dados de volta de system_settings');
    console.log('   3. Remover as configurações de system_settings');
    console.log('ℹ️  Isso não é recomendado pois o novo formato é mais flexível');

    // Listar as configurações que deveriam ser removidas de system_settings
    const settingsToRemove = [
      'system_name',
      'system_footer',
      'browser_tab_name',
      'primary_color',
      'secondary_color',
      'background_color'
    ];

    console.log('\\n📋 Configurações que seriam removidas de system_settings:');
    settingsToRemove.forEach((key, index) => {
      console.log(`   ${index + 1}. ${key}`);
    });

    console.log('\\n⚠️  Rollback NÃO executado - seria destrutivo');
    console.log('✅ Rollback documentado (nenhuma ação realizada)');
  }
};