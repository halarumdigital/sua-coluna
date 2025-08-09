import { sql } from "drizzle-orm";
import { mysqlTable, varchar, text, decimal, boolean, timestamp } from "drizzle-orm/mysql-core";

// Define the global_prompts table for migration
export const globalPrompts = mysqlTable("global_prompts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchisorId: varchar("franchisor_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).notNull().default("0.7"),
  category: varchar("category", { length: 100 }),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export async function up(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS global_prompts (
      id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
      franchisor_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      prompt TEXT NOT NULL,
      temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
      category VARCHAR(100),
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (franchisor_id) REFERENCES franchisors(id) ON DELETE CASCADE
    )
  `);
  
  console.log('✅ Created global_prompts table');
}

export async function down(db: any) {
  await db.execute(sql`DROP TABLE IF EXISTS global_prompts`);
  console.log('✅ Dropped global_prompts table');
}
