import { sql } from "drizzle-orm";
import { mysqlTable, varchar, text, boolean, timestamp, int, index } from "drizzle-orm/mysql-core";

// Define as novas tabelas para migração
export const franchisorWhatsappInstances = mysqlTable("franchisor_whatsapp_instances", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchisorId: varchar("franchisor_id", { length: 36 }).notNull(),
  instanceName: varchar("instance_name", { length: 100 }).notNull(),
  instanceKey: varchar("instance_key", { length: 100 }).unique().notNull(),
  webhook: varchar("webhook", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("disconnected"),
  qrCode: text("qr_code"),
  lastConnection: timestamp("last_connection"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const franchisorPhoneNumbers = mysqlTable("franchisor_phone_numbers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchisorId: varchar("franchisor_id", { length: 36 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  whatsappInstanceId: varchar("whatsapp_instance_id", { length: 36 }),
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const phoneNumberPromptMapping = mysqlTable("phone_number_prompt_mapping", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  phoneNumberId: varchar("phone_number_id", { length: 36 }).notNull(),
  phoneNumberType: varchar("phone_number_type", { length: 20 }).notNull(),
  promptId: varchar("prompt_id", { length: 36 }).notNull(),
  promptType: varchar("prompt_type", { length: 20 }).notNull(),
  priority: int("priority").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});
