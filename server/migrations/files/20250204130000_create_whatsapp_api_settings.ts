import { sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";

export async function up(db: MySql2Database<any>) {
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
}

export async function down(db: MySql2Database<any>) {
  await db.execute(sql`DROP TABLE IF EXISTS whatsapp_api_settings`);
}