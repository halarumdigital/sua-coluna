import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250204130000_create_whatsapp_api_settings',
  name: 'Create WhatsApp API Settings Table',
  
  async up() {
    console.log('Executando migration: Create WhatsApp API Settings Table');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_api_settings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        evolution_api_url VARCHAR(500) NOT NULL,
        global_token VARCHAR(500) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_whatsapp_api_active (is_active),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    console.log('✅ Tabela whatsapp_api_settings criada');
  },
  
  async down() {
    console.log('Revertendo migration: Create WhatsApp API Settings Table');
    
    await db.execute(sql`DROP TABLE IF EXISTS whatsapp_api_settings`);
    
    console.log('✅ Tabela whatsapp_api_settings removida');
  }
};