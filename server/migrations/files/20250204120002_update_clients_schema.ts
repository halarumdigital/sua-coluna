import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250204120002_update_clients_schema',
  name: 'Update Clients Schema',
  
  async up() {
    console.log('Executando migration: Update Clients Schema');
    
    try {
      // Add new fields to clients table
      await db.execute(sql`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS legal_name VARCHAR(255) AFTER company_name,
        ADD COLUMN IF NOT EXISTS complement VARCHAR(100) AFTER number,
        ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20) AFTER address,
        ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20) AFTER contact_phone,
        ADD COLUMN IF NOT EXISTS website VARCHAR(255) AFTER whatsapp,
        ADD COLUMN IF NOT EXISTS system_password VARCHAR(255) AFTER website
      `);
      
      // Update email column to be part of clients table (if not exists)
      await db.execute(sql`
        ALTER TABLE clients 
        ADD COLUMN IF NOT EXISTS email VARCHAR(255) AFTER system_password
      `);
      
      console.log("✅ Client schema updated successfully!");
    } catch (error) {
      console.log("ℹ️  Some columns may already exist, continuing...");
    }
  },
  
  async down() {
    console.log('Revertendo migration: Update Clients Schema');
    
    // Remove the added columns
    await db.execute(sql`
      ALTER TABLE clients 
      DROP COLUMN IF EXISTS legal_name,
      DROP COLUMN IF EXISTS complement,
      DROP COLUMN IF EXISTS contact_phone,
      DROP COLUMN IF EXISTS whatsapp,
      DROP COLUMN IF EXISTS website,
      DROP COLUMN IF EXISTS system_password,
      DROP COLUMN IF EXISTS email
    `);
    
    console.log("✅ Client schema reverted successfully!");
  }
};