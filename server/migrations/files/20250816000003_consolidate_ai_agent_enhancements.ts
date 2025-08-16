import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250816000003_consolidate_ai_agent_enhancements',
  name: 'Consolidate AI Agent Enhancements',
  
  async up() {
    console.log('Executando migration: Consolidate AI Agent Enhancements');
    
    // 1. Garantir que a tabela custom_ai_agents existe com todos os campos necessários
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS custom_ai_agents (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        system_prompt TEXT NOT NULL,
        temperature DECIMAL(3,2) DEFAULT 0.7,
        max_tokens INT DEFAULT 1000,
        is_active BOOLEAN DEFAULT TRUE,
        client_id VARCHAR(36),
        franchise_id VARCHAR(36),
        franchisor_id VARCHAR(36),
        pdf_files JSON DEFAULT ('[]'),
        pdf_contents JSON DEFAULT ('[]'),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_custom_ai_agents_client (client_id),
        INDEX idx_custom_ai_agents_franchise (franchise_id),
        INDEX idx_custom_ai_agents_franchisor (franchisor_id),
        INDEX idx_custom_ai_agents_active (is_active)
      )
    `);
    console.log('✅ Tabela custom_ai_agents verificada/criada');

    // 2. Adicionar colunas PDF se não existirem (para casos de upgrade)
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN IF NOT EXISTS pdf_files JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_files verificada');
    } catch (error: any) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Coluna pdf_files já existe ou erro esperado');
      }
    }
    
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN IF NOT EXISTS pdf_contents JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_contents verificada');
    } catch (error: any) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Coluna pdf_contents já existe ou erro esperado');
      }
    }

    // 3. Garantir que a tabela agent_conversation_context existe
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_conversation_context (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        conversation_id VARCHAR(36) NOT NULL,
        instance_id VARCHAR(36) NOT NULL,
        agent_id VARCHAR(36) NOT NULL,
        message_text TEXT NOT NULL,
        message_role VARCHAR(20) NOT NULL,
        message_order INT NOT NULL,
        sender_phone VARCHAR(20),
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_agent_context_conversation (conversation_id),
        INDEX idx_agent_context_instance (instance_id),
        INDEX idx_agent_context_agent (agent_id),
        INDEX idx_agent_context_order (conversation_id, message_order),
        INDEX idx_agent_context_timestamp (timestamp)
      )
    `);
    console.log('✅ Tabela agent_conversation_context verificada/criada');

    // 4. Verificar e adicionar foreign keys se as tabelas existirem
    try {
      // Verificar se as tabelas referenciadas existem antes de adicionar foreign keys
      const tablesCheck = await db.execute(sql`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('whatsapp_conversations', 'whatsapp_instances')
      `);
      
      const existingTables = (tablesCheck as any[]).map(row => row.TABLE_NAME);
      
      if (existingTables.includes('whatsapp_conversations')) {
        try {
          await db.execute(sql`
            ALTER TABLE agent_conversation_context 
            ADD CONSTRAINT fk_agent_context_conversation 
            FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE
          `);
          console.log('✅ Foreign key para whatsapp_conversations adicionada');
        } catch (error: any) {
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️  Foreign key para whatsapp_conversations já existe');
          }
        }
      }
      
      if (existingTables.includes('whatsapp_instances')) {
        try {
          await db.execute(sql`
            ALTER TABLE agent_conversation_context 
            ADD CONSTRAINT fk_agent_context_instance 
            FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE
          `);
          console.log('✅ Foreign key para whatsapp_instances adicionada');
        } catch (error: any) {
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log('ℹ️  Foreign key para whatsapp_instances já existe');
          }
        }
      }
      
      // Foreign key para custom_ai_agents (self-reference)
      try {
        await db.execute(sql`
          ALTER TABLE agent_conversation_context 
          ADD CONSTRAINT fk_agent_context_agent 
          FOREIGN KEY (agent_id) REFERENCES custom_ai_agents(id) ON DELETE CASCADE
        `);
        console.log('✅ Foreign key para custom_ai_agents adicionada');
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️  Foreign key para custom_ai_agents já existe');
        }
      }
      
    } catch (error) {
      console.log('⚠️  Algumas foreign keys podem não ter sido criadas:', (error as any).message);
    }
    
    console.log('✅ Migration de consolidação de melhorias dos agentes IA concluída');
  },
  
  async down() {
    console.log('Revertendo migration: Consolidate AI Agent Enhancements');
    
    // Remover foreign keys primeiro
    try {
      await db.execute(sql`ALTER TABLE agent_conversation_context DROP FOREIGN KEY fk_agent_context_conversation`);
      await db.execute(sql`ALTER TABLE agent_conversation_context DROP FOREIGN KEY fk_agent_context_instance`);
      await db.execute(sql`ALTER TABLE agent_conversation_context DROP FOREIGN KEY fk_agent_context_agent`);
    } catch (error) {
      console.log('⚠️  Alguns foreign keys podem não existir');
    }
    
    // Remover tabela de contexto
    await db.execute(sql`DROP TABLE IF EXISTS agent_conversation_context`);
    
    // Remover colunas PDF (cuidado - isso pode causar perda de dados)
    try {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        DROP COLUMN pdf_files,
        DROP COLUMN pdf_contents
      `);
    } catch (error) {
      console.log('⚠️  Erro ao remover colunas PDF (podem não existir)');
    }
    
    console.log('✅ Migration de consolidação revertida');
  }
};