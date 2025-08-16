import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250816000002_add_pdf_fields_to_custom_agents',
  name: 'Add PDF Fields to Custom AI Agents - Force Run',
  
  async up() {
    console.log('Executando migration: Add PDF Fields to Custom AI Agents - Force Run');
    
    // Adicionar campos para armazenar dados de PDFs de treinamento
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_files JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_files adicionada');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Coluna pdf_files já existe');
      } else {
        console.error('Erro ao adicionar pdf_files:', error);
        throw error;
      }
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_contents JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_contents adicionada');
    } catch (error: any) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Coluna pdf_contents já existe');
      } else {
        console.error('Erro ao adicionar pdf_contents:', error);
        throw error;
      }
    }
    
    console.log('✅ Campos PDF configurados na tabela custom_ai_agents');
  },
  
  async down() {
    console.log('Revertendo migration: Add PDF Fields to Custom AI Agents - Force Run');
    
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        DROP COLUMN pdf_files
      `);
      console.log('✅ Coluna pdf_files removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover pdf_files (pode não existir)');
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        DROP COLUMN pdf_contents
      `);
      console.log('✅ Coluna pdf_contents removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover pdf_contents (pode não existir)');
    }
    
    console.log('✅ Campos PDF removidos da tabela custom_ai_agents');
  }
};