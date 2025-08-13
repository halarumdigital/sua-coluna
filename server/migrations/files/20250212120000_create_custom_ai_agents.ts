import { sql } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';

export async function up(db: MySql2Database<any>) {
  await db.execute(sql`
    CREATE TABLE custom_ai_agents (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
      max_tokens INT NOT NULL DEFAULT 1000,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      user_id VARCHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      INDEX idx_custom_ai_agents_user (user_id),
      INDEX idx_custom_ai_agents_active (is_active),
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

export async function down(db: MySql2Database<any>) {
  await db.execute(sql`DROP TABLE IF EXISTS custom_ai_agents`);
}