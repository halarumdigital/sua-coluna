import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250816000001_add_pdf_training_to_agents',
  name: 'Add PDF Training Fields to Custom AI Agents',
  
  async up() {
    console.log('Executando migration: Add PDF Training Fields to Custom AI Agents');
    
    // Adicionar campos para armazenar dados de PDFs de treinamento
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_files JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_files adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Coluna pdf_files já existe');
      } else {
        throw error;
      }
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_contents JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_contents adicionada');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('⚠️  Coluna pdf_contents já existe');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Campos PDF adicionados à tabela custom_ai_agents');
  },
  
  async down() {
    console.log('Revertendo migration: Add PDF Training Fields to Custom AI Agents');
    
    await db.execute(sql`
      ALTER TABLE custom_ai_agents 
      DROP COLUMN pdf_files,
      DROP COLUMN pdf_contents
    `);
    
    console.log('✅ Campos PDF removidos da tabela custom_ai_agents');
  }
};