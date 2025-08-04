import { sql } from 'drizzle-orm';
import {
  index,
  json,
  mysqlTable,
  timestamp,
  varchar,
  text,
  decimal,
  boolean,
  int,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 128 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// System settings table
export const systemSettings = mysqlTable("system_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  settingKey: varchar("setting_key", { length: 100 }).unique().notNull(),
  settingValue: text("setting_value"),
  settingType: varchar("setting_type", { length: 20 }).notNull().default("string"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// User roles table
export const userRoles = mysqlTable("user_roles", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  name: varchar("name", { length: 50 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  permissions: json("permissions").notNull().default("[]"),
  isSystem: boolean("is_system").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// User storage table.
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  password: varchar("password", { length: 255 }),
  role: varchar("role", { length: 10 }).notNull().default("client"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Clients table
export const clients = mysqlTable("clients", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  // Dados básicos
  fullName: varchar("full_name", { length: 255 }), // Nome Completo/Razão Social
  companyName: varchar("company_name", { length: 255 }),
  cpfCnpj: varchar("cpf_cnpj", { length: 20 }), // CPF/CNPJ
  taxId: varchar("tax_id", { length: 50 }),
  
  // Endereço completo
  street: varchar("street", { length: 255 }), // Rua
  number: varchar("number", { length: 20 }), // Número
  neighborhood: varchar("neighborhood", { length: 100 }), // Bairro
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 10 }),
  address: text("address"), // Endereço completo (legacy)
  
  // Contato principal
  primaryContactName: varchar("primary_contact_name", { length: 255 }),
  primaryContactPhone: varchar("primary_contact_phone", { length: 20 }),
  primaryContactEmail: varchar("primary_contact_email", { length: 255 }),
  phone: varchar("phone", { length: 20 }), // Legacy
  
  // Informações adicionais
  businessSector: varchar("business_sector", { length: 100 }), // Setor de Atuação
  generalNotes: text("general_notes"), // Observações Gerais
  status: varchar("status", { length: 20 }).notNull().default("active"), // Status (Ativo, Inativo, Potencial)
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Team members table
export const teamMembers = mysqlTable("team_members", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  salary: decimal("salary", { precision: 10, scale: 2 }),
  hireDate: timestamp("hire_date"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Projects table
export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  status: varchar("status", { length: 15 }).notNull().default("planning"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: decimal("budget", { precision: 10, scale: 2 }),
  progress: int("progress").default(0),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Project assignments table
export const projectAssignments = mysqlTable("project_assignments", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  teamMemberId: varchar("team_member_id", { length: 36 }).references(() => teamMembers.id),
  role: varchar("role", { length: 100 }),
  assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
});

// Invoices table
export const invoices = mysqlTable("invoices", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  number: varchar("number", { length: 50 }).unique().notNull(),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 15 }).notNull().default("draft"),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Contatos adicionais dos clientes
export const clientContacts = mysqlTable("client_contacts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  department: varchar("department", { length: 100 }), // Departamento ou área
  position: varchar("position", { length: 100 }), // Cargo
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Planos contratados pelos clientes
export const clientPlans = mysqlTable("client_plans", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  planName: varchar("plan_name", { length: 255 }).notNull(),
  description: text("description"),
  value: decimal("value", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, expired
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Histórico de comunicações (CRM)
export const clientCommunications = mysqlTable("client_communications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id), // Quem fez a comunicação
  type: varchar("type", { length: 50 }).notNull(), // email, phone, meeting, whatsapp, etc
  subject: varchar("subject", { length: 255 }),
  content: text("content"),
  direction: varchar("direction", { length: 20 }).notNull(), // inbound, outbound
  status: varchar("status", { length: 20 }).notNull().default("completed"), // completed, pending, scheduled
  scheduledFor: timestamp("scheduled_for"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Acessos ao portal do cliente
export const clientPortalAccess = mysqlTable("client_portal_access", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  sessionDuration: int("session_duration"), // em minutos
  pagesVisited: json("pages_visited").default("[]"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
});

// Objetivos mensais dos clientes
export const clientMonthlyGoals = mysqlTable("client_monthly_goals", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: decimal("target_value", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }).default("0"),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
  priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Anotações de reuniões
export const meetingNotes = mysqlTable("meeting_notes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id), // Quem fez a anotação
  projectId: varchar("project_id", { length: 36 }).references(() => projects.id), // Opcional
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),
  meetingDate: timestamp("meeting_date").notNull(),
  participants: json("participants").default("[]"), // Lista de participantes
  actionItems: json("action_items").default("[]"), // Itens de ação
  nextMeetingDate: timestamp("next_meeting_date"),
  tags: json("tags").default("[]"), // Tags para categorização
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  client: one(clients, { fields: [users.id], references: [clients.userId] }),
  teamMember: one(teamMembers, { fields: [users.id], references: [teamMembers.userId] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  invoices: many(invoices),
  projects: many(projects),
  contacts: many(clientContacts),
  plans: many(clientPlans),
  communications: many(clientCommunications),
  portalAccess: many(clientPortalAccess),
  monthlyGoals: many(clientMonthlyGoals),
  meetingNotes: many(meetingNotes),
}));

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, { fields: [clientContacts.clientId], references: [clients.id] }),
}));

export const clientPlansRelations = relations(clientPlans, ({ one }) => ({
  client: one(clients, { fields: [clientPlans.clientId], references: [clients.id] }),
}));

export const clientCommunicationsRelations = relations(clientCommunications, ({ one }) => ({
  client: one(clients, { fields: [clientCommunications.clientId], references: [clients.id] }),
  user: one(users, { fields: [clientCommunications.userId], references: [users.id] }),
}));

export const clientPortalAccessRelations = relations(clientPortalAccess, ({ one }) => ({
  client: one(clients, { fields: [clientPortalAccess.clientId], references: [clients.id] }),
  user: one(users, { fields: [clientPortalAccess.userId], references: [users.id] }),
}));

export const clientMonthlyGoalsRelations = relations(clientMonthlyGoals, ({ one }) => ({
  client: one(clients, { fields: [clientMonthlyGoals.clientId], references: [clients.id] }),
}));

export const meetingNotesRelations = relations(meetingNotes, ({ one }) => ({
  client: one(clients, { fields: [meetingNotes.clientId], references: [clients.id] }),
  user: one(users, { fields: [meetingNotes.userId], references: [users.id] }),
  project: one(projects, { fields: [meetingNotes.projectId], references: [projects.id] }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
  assignments: many(projectAssignments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  assignments: many(projectAssignments),
  invoices: many(invoices),
}));

export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, { fields: [projectAssignments.projectId], references: [projects.id] }),
  teamMember: one(teamMembers, { fields: [projectAssignments.teamMemberId], references: [teamMembers.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientPlanSchema = createInsertSchema(clientPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientPortalAccessSchema = createInsertSchema(clientPortalAccess).omit({
  id: true,
  createdAt: true,
});

export const insertClientMonthlyGoalSchema = createInsertSchema(clientMonthlyGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingNoteSchema = createInsertSchema(meetingNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for creating/updating roles
export const createRoleSchema = z.object({
  name: z.string().min(1, "Nome da role é obrigatório").regex(/^[a-z_]+$/, "Nome deve conter apenas letras minúsculas e underscore"),
  displayName: z.string().min(1, "Nome de exibição é obrigatório"),
  description: z.string().optional(),
  permissions: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type ProjectAssignment = typeof projectAssignments.$inferSelect;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// Custom schema for creating team member with user data
export const createTeamMemberSchema = z.object({
  // User data
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["admin", "team", "client"]).default("team"),
  
  // Team member specific data
  position: z.string().min(1, "Cargo é obrigatório"),
  department: z.string().min(1, "Departamento é obrigatório"),
  salary: z.number().positive("Salário deve ser positivo").optional(),
  hireDate: z.string().optional(),
});

export type CreateTeamMember = z.infer<typeof createTeamMemberSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type CreateRole = z.infer<typeof createRoleSchema>;
