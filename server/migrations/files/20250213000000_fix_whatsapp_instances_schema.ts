import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250213000000_fix_whatsapp_instances_schema',
  name: 'Fix WhatsApp Instances Table Schema',
  
  async up() {
    console.log('Executando migration: Fix WhatsApp Instances Table Schema');
    
    try {
      // 1. Adicionar coluna franchise_id se não existir
      await db.execute(sql`
        ALTER TABLE whatsapp_instances 
        ADD COLUMN IF NOT EXISTS franchise_id VARCHAR(36) AFTER id
      `);
      console.log('✅ Coluna franchise_id adicionada/verificada');
      
      // 2. Remover coluna client_id se existir
      await db.execute(sql`
        ALTER TABLE whatsapp_instances 
        DROP COLUMN IF EXISTS client_id
      `);
      console.log('✅ Coluna client_id removida');
      
      // 3. Remover índices antigos se existirem
      try {
        await db.execute(sql`DROP INDEX IF EXISTS idx_whatsapp_instances_client ON whatsapp_instances`);
        console.log('✅ Índice antigo removido');
      } catch (error) {
        console.log('ℹ️  Índice antigo não existia ou já foi removido');
      }
      
      // 4. Adicionar novo índice para franchise_id
      await db.execute(sql`
        ALTER TABLE whatsapp_instances 
        ADD INDEX idx_whatsapp_instances_franchise (franchise_id)
      `);
      console.log('✅ Novo índice para franchise_id adicionado');
      
      // 5. Verificar se a coluna franchise_id é NOT NULL
      await db.execute(sql`
        ALTER TABLE whatsapp_instances 
        MODIFY COLUMN franchise_id VARCHAR(36) NOT NULL
      `);
      console.log('✅ Coluna franchise_id definida como NOT NULL');
      
      console.log('✅ Migration de correção da tabela whatsapp_instances executada com sucesso');
      
    } catch (error) {
      console.error('❌ Erro durante a migration:', error);
      throw error;
    }
  },
  
  async down() {
    console.log('Revertendo migration: Fix WhatsApp Instances Table Schema');
    
    try {
      // Reverter as mudanças (adicionar client_id de volta)
      await db.execute(sql`
        ALTER TABLE whatsapp_instances 
        ADD COLUMN client_id VARCHAR(36) NOT NULL AFTER id
      `);
      
      await db.execute(sql`
        ALTER TABLE whatsapp_instances 
        DROP COLUMN franchise_id
      `);
      
      await db.execute(sql`
        ALTER TABLE whatsapp_instances 
        ADD INDEX idx_whatsapp_instances_client (client_id)
      `);
      
      console.log('✅ Migration revertida');
    } catch (error) {
      console.error('❌ Erro ao reverter migration:', error);
      throw error;
    }
  }
};
