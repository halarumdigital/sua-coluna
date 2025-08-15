import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250816000000_create_agent_conversation_context',
  name: 'Create Agent Conversation Context Table',
  
  async up() {
    console.log('Executando migration: Create Agent Conversation Context Table');
    
    // Tabela para armazenar contexto de conversação dos agentes (últimas 100 mensagens)
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
        INDEX idx_agent_context_timestamp (timestamp),
        FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES custom_ai_agents(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Tabela agent_conversation_context criada');
  },
  
  async down() {
    console.log('Revertendo migration: Create Agent Conversation Context Table');
    
    await db.execute(sql`DROP TABLE IF EXISTS agent_conversation_context`);
    
    console.log('✅ Tabela agent_conversation_context removida');
  }
};