import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250915000001_remove_obsolete_database_tables',
  name: 'Remove obsolete database tables',

  async up() {
    console.log('Executando migration: Remove obsolete database tables');

    // Esta migration documenta a remoção das tabelas obsoletas que já foi realizada
    // As tabelas foram removidas em uma limpeza do banco de dados

    console.log('📋 Tabelas obsoletas que foram removidas:');

    const removedTables = [
      'ai_agents',
      'companies',
      'conversations',
      'evolution_api_configurations',
      'franchisor_instance_agents',
      'franchisor_phone_numbers',
      'franchisor_whatsapp_instances',
      'invoices',
      'messages',
      'phone_number_prompt_mapping',
      'project_assignments',
      'projects',
      'global_configurations',
      'old_clients'
    ];

    removedTables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table} - REMOVIDA (estava vazia ou obsoleta)`);
    });

    console.log('✅ Documentação das tabelas removidas concluída');
    console.log('ℹ️  As tabelas já foram fisicamente removidas do banco de dados');
    console.log('ℹ️  Esta migration serve apenas para documentar as mudanças');

    // Verificar se alguma tabela ainda existe (não deveria)
    for (const table of removedTables) {
      try {
        const [exists] = await db.execute(sql.raw(`
          SELECT COUNT(*) as count
          FROM information_schema.tables
          WHERE table_schema = DATABASE()
          AND table_name = '${table}'
        `));

        if ((exists as any)[0].count > 0) {
          console.log(`⚠️  Tabela ${table} ainda existe - pode precisar ser removida manualmente`);
        }
      } catch (error) {
        // Ignorar erros de verificação
      }
    }
  },

  async down() {
    console.log('Revertendo migration: Remove obsolete database tables');

    console.log('⚠️  ATENÇÃO: Esta migration não pode ser revertida automaticamente');
    console.log('ℹ️  As tabelas removidas continham dados obsoletos ou estavam vazias');
    console.log('ℹ️  Para reverter, seria necessário recriar as tabelas manualmente');
    console.log('ℹ️  Isso não é recomendado pois as tabelas eram obsoletas');

    // Não fazemos nada no rollback pois não queremos recriar tabelas obsoletas
    console.log('✅ Rollback documentado (nenhuma ação realizada)');
  }
};