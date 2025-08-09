import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250204140000_create_whatsapp_instances',
  name: 'Create WhatsApp Instances Table',
  
  async up() {
    console.log('Executando migration: Create WhatsApp Instances Table');
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS whatsapp_instances (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        client_id VARCHAR(36) NOT NULL,
        instance_name VARCHAR(100) NOT NULL,
        instance_key VARCHAR(100) UNIQUE NOT NULL,
        webhook VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'disconnected',
        qr_code TEXT,
        last_connection TIMESTAMP NULL,
        phone_number VARCHAR(20),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_whatsapp_instances_client (client_id),
        INDEX idx_whatsapp_instances_status (status),
        INDEX idx_whatsapp_instances_active (is_active),
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ Tabela whatsapp_instances criada');
  },
  
  async down() {
    console.log('Revertendo migration: Create WhatsApp Instances Table');
    
    await db.execute(sql`DROP TABLE IF EXISTS whatsapp_instances`);
    
    console.log('✅ Tabela whatsapp_instances removida');
  }
};