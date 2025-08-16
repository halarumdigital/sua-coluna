import { sql } from 'drizzle-orm';
import { db } from './db';

async function addPDFColumns() {
  console.log('🔧 Adicionando colunas PDF à tabela custom_ai_agents...');
  
  try {
    // Verificar se as colunas já existem
    const tableInfo = await db.execute(sql`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'custom_ai_agents'
      AND COLUMN_NAME IN ('pdf_files', 'pdf_contents')
    `);
    
    console.log('📊 Colunas existentes:', tableInfo);
    
    const existingColumns = (tableInfo as any[]).map(row => row.COLUMN_NAME);
    
    // Adicionar pdf_files se não existir
    if (!existingColumns.includes('pdf_files')) {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_files JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_files adicionada');
    } else {
      console.log('⚠️  Coluna pdf_files já existe');
    }
    
    // Adicionar pdf_contents se não existir
    if (!existingColumns.includes('pdf_contents')) {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_contents JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_contents adicionada');
    } else {
      console.log('⚠️  Coluna pdf_contents já existe');
    }
    
    console.log('🎉 Script concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar colunas:', error);
    throw error;
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  addPDFColumns().then(() => {
    console.log('✅ Processo finalizado');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });
}

export { addPDFColumns };