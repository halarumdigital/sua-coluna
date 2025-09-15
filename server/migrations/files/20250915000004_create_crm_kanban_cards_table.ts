import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250915000004_create_crm_kanban_cards_table',
  name: 'Create CRM kanban cards table',

  async up() {
    console.log('Executando migration: Create CRM kanban cards table');

    // Criar a tabela crm_kanban_cards conforme definida no schema
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS crm_kanban_cards (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchise_id VARCHAR(36) NOT NULL,
        client_name VARCHAR(255) NOT NULL,
        client_phone VARCHAR(20) NOT NULL,
        type VARCHAR(100) NOT NULL DEFAULT 'Consulta',
        priority VARCHAR(20) NOT NULL DEFAULT 'media',
        status VARCHAR(20) NOT NULL DEFAULT 'novo',
        scheduled_date TIMESTAMP NULL,
        scheduled_time VARCHAR(10),
        notes TEXT,
        last_message_date TIMESTAMP NULL,
        conversation_id VARCHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_crm_kanban_franchise (franchise_id),
        INDEX idx_crm_kanban_phone (client_phone),
        INDEX idx_crm_kanban_status (status),
        INDEX idx_crm_kanban_priority (priority),
        INDEX idx_crm_kanban_conversation (conversation_id),

        CONSTRAINT fk_crm_kanban_franchise
          FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE,
        CONSTRAINT fk_crm_kanban_conversation
          FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE SET NULL
      )
    `);

    console.log('✅ Tabela crm_kanban_cards criada com sucesso');
    console.log('📋 A tabela permite rastrear atendimentos em um kanban com as colunas:');
    console.log('   - novo: Novos contatos que enviaram primeira mensagem');
    console.log('   - atendimento: Em processo de atendimento');
    console.log('   - agendado: Agendamento confirmado');
    console.log('   - finalizado: Atendimento concluído');

    console.log('\n✅ Migration create CRM kanban cards table concluída');
  },

  async down() {
    console.log('Revertendo migration: Create CRM kanban cards table');

    // Remover foreign keys primeiro
    try {
      await db.execute(sql`
        ALTER TABLE crm_kanban_cards
        DROP FOREIGN KEY fk_crm_kanban_franchise
      `);
      console.log('✅ Foreign key franchise removida');
    } catch (error) {
      console.log('⚠️  Foreign key franchise pode não existir');
    }

    try {
      await db.execute(sql`
        ALTER TABLE crm_kanban_cards
        DROP FOREIGN KEY fk_crm_kanban_conversation
      `);
      console.log('✅ Foreign key conversation removida');
    } catch (error) {
      console.log('⚠️  Foreign key conversation pode não existir');
    }

    // Remover a tabela
    await db.execute(sql`DROP TABLE IF EXISTS crm_kanban_cards`);
    console.log('✅ Tabela crm_kanban_cards removida');

    console.log('⚠️  ATENÇÃO: Dados da tabela crm_kanban_cards foram perdidos');
    console.log('ℹ️  Certifique-se de ter backup dos dados antes de fazer rollback');
  }
};