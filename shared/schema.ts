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
  role: varchar("role", { length: 15 }).notNull().default("client"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Planos disponíveis (criados pelo super root)
export const plans = mysqlTable("plans", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  maxFranchises: int("max_franchises").notNull().default(1), // Máximo de franquias permitidas
  maxPhoneNumbers: int("max_phone_numbers").notNull().default(1), // Máximo de números por franquia
  maxAgents: int("max_agents").notNull().default(1), // Máximo de agentes por franquia
  maxPrompts: int("max_prompts").notNull().default(5), // Máximo de prompts por franquia
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  features: json("features").notNull().default("[]"), // Lista de recursos inclusos
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Franqueadores (cadastrados pelo super root)
export const franchisors = mysqlTable("franchisors", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  planId: varchar("plan_id", { length: 36 }).references(() => plans.id).notNull(),

  // Dados da empresa franqueadora
  companyName: varchar("company_name", { length: 255 }).notNull(),
  legalName: varchar("legal_name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 20 }).unique().notNull(),

  // Endereço
  street: varchar("street", { length: 255 }).notNull(),
  number: varchar("number", { length: 20 }).notNull(),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),

  // Contatos
  contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),

  // Status e datas
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, suspended
  planStartDate: timestamp("plan_start_date").notNull(),
  planEndDate: timestamp("plan_end_date"),

  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Franquias/Lojas (cadastradas pelo franqueador)
export const franchises = mysqlTable("franchises", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchisorId: varchar("franchisor_id", { length: 36 }).references(() => franchisors.id).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),

  // Dados da franquia
  franchiseName: varchar("franchise_name", { length: 255 }).notNull(),
  franchiseCode: varchar("franchise_code", { length: 50 }).unique().notNull(),

  // Endereço da franquia
  street: varchar("street", { length: 255 }).notNull(),
  number: varchar("number", { length: 20 }).notNull(),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),

  // Contatos da franquia
  contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),

  // Responsável pela franquia
  managerName: varchar("manager_name", { length: 255 }).notNull(),
  managerPhone: varchar("manager_phone", { length: 20 }),
  managerEmail: varchar("manager_email", { length: 255 }),

  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, suspended

  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Números de telefone das franquias
export const franchisePhoneNumbers = mysqlTable("franchise_phone_numbers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  whatsappInstanceId: varchar("whatsapp_instance_id", { length: 36 }).references(() => whatsappInstances.id),
  isActive: boolean("is_active").notNull().default(true),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Agentes das franquias
export const franchiseAgents = mysqlTable("franchise_agents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  department: varchar("department", { length: 100 }), // Vendas, Suporte, etc.
  specialties: json("specialties").default("[]"), // Especialidades do agente
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Prompts de atendimento das franquias
export const franchisePrompts = mysqlTable("franchise_prompts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  category: varchar("category", { length: 100 }), // Vendas, Suporte, Geral, etc.
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Prompts globais (servem para todas as franquias)
export const globalPrompts = mysqlTable("global_prompts", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchisorId: varchar("franchisor_id", { length: 36 }).references(() => franchisors.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  prompt: text("prompt").notNull(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).notNull().default("0.7"),
  category: varchar("category", { length: 100 }), // Vendas, Suporte, Geral, etc.
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Agentes WhatsApp (para vinculação com instâncias)
export const whatsappAgents = mysqlTable("whatsapp_agents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 20 }).notNull().default("global"), // 'global' ou 'franchise'
  franchisorId: varchar("franchisor_id", { length: 36 }).references(() => franchisors.id), // Null para agentes globais
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Vinculações entre instâncias WhatsApp de admin e agentes
export const whatsappInstanceAgentBindings = mysqlTable("whatsapp_instance_agent_bindings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  instanceId: varchar("instance_id", { length: 36 }).references(() => adminWhatsappInstances.id).notNull(),
  agentId: varchar("agent_id", { length: 36 }).references(() => globalPrompts.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Vinculações entre instâncias WhatsApp de clientes e agentes
export const clientWhatsappInstanceAgentBindings = mysqlTable("client_whatsapp_instance_agent_bindings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  instanceId: varchar("instance_id", { length: 36 }).references(() => whatsappInstances.id).notNull(),
  agentId: varchar("agent_id", { length: 36 }).references(() => customAIAgents.id).notNull(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Clients table - Agora são clientes finais das franquias
// TABELA REMOVIDA - NÃO MAIS UTILIZADA
// export const clients = mysqlTable("clients", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(), // Cliente pertence a uma franquia
// 
//   // Dados básicos do cliente
//   fullName: varchar("full_name", { length: 255 }).notNull(), // Nome completo
//   email: varchar("email", { length: 255 }), // Email
//   phone: varchar("phone", { length: 20 }), // Telefone
//   cpfCnpj: varchar("cpf_cnpj", { length: 20 }), // CPF/CNPJ
// 
//   // Endereço
//   street: varchar("street", { length: 255 }), // Rua
//   number: varchar("number", { length: 20 }), // Número
//   complement: varchar("complement", { length: 100 }), // Complemento
//   neighborhood: varchar("neighborhood", { length: 100 }), // Bairro
//   city: varchar("city", { length: 100 }), // Cidade
//   state: varchar("state", { length: 50 }), // Estado
//   zipCode: varchar("zip_code", { length: 10 }), // CEP
// 
//   // Informações adicionais
//   notes: text("notes"), // Observações
//   status: varchar("status", { length: 20 }).notNull().default("active"), // Status (active, inactive)
// 
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

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

// Projects table - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const projects = mysqlTable("projects", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   name: varchar("name", { length: 255 }).notNull(),
//   description: text("description"),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   status: varchar("status", { length: 15 }).notNull().default("planning"),
//   startDate: timestamp("start_date"),
//   endDate: timestamp("end_date"),
//   budget: decimal("budget", { precision: 10, scale: 2 }),
//   progress: int("progress").default(0),
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

// Project assignments table - TABELA REMOVIDA - REFERENCIA PROJECTS
// export const projectAssignments = mysqlTable("project_assignments", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
//   teamMemberId: varchar("team_member_id", { length: 36 }).references(() => teamMembers.id),
//   role: varchar("role", { length: 100 }),
//   assignedAt: timestamp("assigned_at").default(sql`CURRENT_TIMESTAMP`),
// });

// Invoices table - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const invoices = mysqlTable("invoices", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   number: varchar("number", { length: 50 }).unique().notNull(),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   projectId: varchar("project_id", { length: 36 }).references(() => projects.id),
//   amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
//   status: varchar("status", { length: 15 }).notNull().default("draft"),
//   issueDate: timestamp("issue_date").notNull(),
//   dueDate: timestamp("due_date").notNull(),
//   paidDate: timestamp("paid_date"),
//   description: text("description"),
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

// Contatos adicionais dos clientes - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const clientContacts = mysqlTable("client_contacts", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   name: varchar("name", { length: 255 }).notNull(),
//   phone: varchar("phone", { length: 20 }),
//   email: varchar("email", { length: 255 }),
//   department: varchar("department", { length: 100 }), // Departamento ou área
//   position: varchar("position", { length: 100 }), // Cargo
//   isPrimary: boolean("is_primary").notNull().default(false),
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

// Planos contratados pelos clientes - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const clientPlans = mysqlTable("client_plans", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   planName: varchar("plan_name", { length: 255 }).notNull(),
//   description: text("description"),
//   value: decimal("value", { precision: 10, scale: 2 }),
//   startDate: timestamp("start_date"),
//   endDate: timestamp("end_date"),
//   status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive, expired
//   isActive: boolean("is_active").notNull().default(true),
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

// Histórico de comunicações (CRM) - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const clientCommunications = mysqlTable("client_communications", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   userId: varchar("user_id", { length: 36 }).references(() => users.id), // Quem fez a comunicação
//   type: varchar("type", { length: 50 }).notNull(), // email, phone, meeting, whatsapp, etc
//   subject: varchar("subject", { length: 255 }),
//   content: text("content"),
//   direction: varchar("direction", { length: 20 }).notNull(), // inbound, outbound
//   status: varchar("status", { length: 20 }).notNull().default("completed"), // completed, pending, scheduled
//   scheduledFor: timestamp("scheduled_for"),
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

// Acessos ao portal do cliente - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const clientPortalAccess = mysqlTable("client_portal_access", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   userId: varchar("user_id", { length: 36 }).references(() => users.id),
//   ipAddress: varchar("ip_address", { length: 45 }),
//   userAgent: text("user_agent"),
//   sessionDuration: int("session_duration"), // em minutos
//   pagesVisited: json("pages_visited").default("[]"),
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
// });

// Objetivos mensais dos clientes - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const clientMonthlyGoals = mysqlTable("client_monthly_goals", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   month: int("month").notNull(), // 1-12
//   year: int("year").notNull(),
//   title: varchar("title", { length: 255 }).notNull(),
//   description: text("description"),
//   targetValue: decimal("target_value", { precision: 10, scale: 2 }),
//   currentValue: decimal("current_value", { precision: 10, scale: 2 }).default("0"),
//   status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, in_progress, completed, cancelled
//   priority: varchar("priority", { length: 20 }).notNull().default("medium"), // low, medium, high
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

// Anotações de reuniões - TABELA REMOVIDA - REFERENCIA CLIENTS
// export const meetingNotes = mysqlTable("meeting_notes", {
//   id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
//   clientId: varchar("client_id", { length: 36 }).references(() => clients.id),
//   userId: varchar("user_id", { length: 36 }).references(() => users.id), // Quem fez a anotação
//   projectId: varchar("project_id", { length: 36 }).references(() => projects.id), // Opcional
//   title: varchar("title", { length: 255 }).notNull(),
//   content: text("content"),
//   meetingDate: timestamp("meeting_date").notNull(),
//   participants: json("participants").default("[]"), // Lista de participantes
//   actionItems: json("action_items").default("[]"), // Itens de ação
//   nextMeetingDate: timestamp("next_meeting_date"),
//   tags: json("tags").default("[]"), // Tags para categorização
//   createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
//   updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
// });

// Configurações de IA
export const aiConfigurations = mysqlTable("ai_configurations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  name: varchar("name", { length: 100 }).unique().notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  description: text("description"),
  apiKey: varchar("api_key", { length: 500 }),
  model: varchar("model", { length: 50 }).notNull().default("gpt-3.5-turbo"),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).notNull().default("0.7"),
  maxTokens: int("max_tokens").notNull().default(1000),
  systemPrompt: text("system_prompt").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_ai_config_active").on(table.isActive),
  index("idx_ai_config_default").on(table.isDefault),
]);

// Uso da API de IA
export const aiUsage = mysqlTable("ai_usage", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  model: varchar("model", { length: 50 }).notNull(),
  promptTokens: int("prompt_tokens").notNull().default(0),
  completionTokens: int("completion_tokens").notNull().default(0),
  totalTokens: int("total_tokens").notNull().default(0),
  cost: decimal("cost", { precision: 10, scale: 6 }).notNull().default("0"),
  requestType: varchar("request_type", { length: 50 }).notNull().default("chat"),
  success: boolean("success").notNull().default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_ai_usage_user").on(table.userId),
  index("idx_ai_usage_date").on(table.createdAt),
  index("idx_ai_usage_model").on(table.model),
]);

// Agentes personalizados de IA dos clientes
export const customAIAgents = mysqlTable("custom_ai_agents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  systemPrompt: text("system_prompt").notNull(),
  temperature: decimal("temperature", { precision: 3, scale: 2 }).notNull().default("0.7"),
  maxTokens: int("max_tokens").notNull().default(1000),
  isActive: boolean("is_active").notNull().default(true),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  // PDF Training fields
  pdfFiles: json("pdf_files").default("[]"), // Array de nomes de arquivos PDF
  pdfContents: json("pdf_contents").default("[]"), // Array de objetos {fileName, content}
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_custom_ai_agents_user").on(table.userId),
  index("idx_custom_ai_agents_active").on(table.isActive),
]);

// Configurações da API WhatsApp
export const whatsappApiSettings = mysqlTable("whatsapp_api_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  evolutionApiUrl: varchar("evolution_api_url", { length: 500 }).notNull(),
  globalToken: varchar("global_token", { length: 500 }).notNull(),
  systemUrl: varchar("system_url", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_whatsapp_api_active").on(table.isActive),
]);

// Instâncias WhatsApp das franquias
export const whatsappInstances = mysqlTable("whatsapp_instances", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(),
  instanceName: varchar("instance_name", { length: 100 }).notNull(),
  instanceKey: varchar("instance_key", { length: 100 }).unique().notNull(),
  webhook: varchar("webhook", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("disconnected"), // connected, disconnected, connecting, error
  qrCode: text("qr_code"),
  lastConnection: timestamp("last_connection"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_whatsapp_instances_franchise").on(table.franchiseId),
  index("idx_whatsapp_instances_status").on(table.status),
  index("idx_whatsapp_instances_active").on(table.isActive),
]);

// Conversas do WhatsApp
export const whatsappConversations = mysqlTable("whatsapp_conversations", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  instanceId: varchar("instance_id", { length: 36 }).references(() => whatsappInstances.id).notNull(),
  chatId: varchar("chat_id", { length: 100 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  lastMessage: text("last_message"),
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: int("unread_count").default(0),
  isGroup: boolean("is_group").default(false),
  groupName: varchar("group_name", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, archived, blocked
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_whatsapp_conversations_instance").on(table.instanceId),
  index("idx_whatsapp_conversations_chat").on(table.chatId),
  index("idx_whatsapp_conversations_phone").on(table.phoneNumber),
  index("idx_whatsapp_conversations_updated").on(table.updatedAt),
  index("unique_instance_chat").on(table.instanceId, table.chatId),
]);

// Mensagens do WhatsApp
export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  conversationId: varchar("conversation_id", { length: 36 }).references(() => whatsappConversations.id).notNull(),
  messageId: varchar("message_id", { length: 100 }), // ID único da mensagem no WhatsApp
  senderPhone: varchar("sender_phone", { length: 20 }).notNull(),
  messageText: text("message_text"),
  messageType: varchar("message_type", { length: 50 }).notNull().default("text"), // text, image, audio, video, document, etc
  mediaUrl: varchar("media_url", { length: 500 }),
  mediaType: varchar("media_type", { length: 50 }),
  mediaCaption: text("media_caption"),
  direction: varchar("direction", { length: 20 }).notNull(), // inbound, outbound
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent, delivered, read, failed
  timestamp: timestamp("timestamp").notNull(),
  isAiResponse: boolean("is_ai_response").default(false),
  aiModel: varchar("ai_model", { length: 50 }),
  rawData: json("raw_data"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_whatsapp_messages_conversation").on(table.conversationId),
  index("idx_whatsapp_messages_sender").on(table.senderPhone),
  index("idx_whatsapp_messages_timestamp").on(table.timestamp),
  index("idx_whatsapp_messages_direction").on(table.direction),
  index("idx_whatsapp_messages_ai").on(table.isAiResponse),
]);

// Contexto de conversação para agentes de IA (últimas 100 mensagens)
export const agentConversationContext = mysqlTable("agent_conversation_context", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  conversationId: varchar("conversation_id", { length: 36 }).references(() => whatsappConversations.id).notNull(),
  instanceId: varchar("instance_id", { length: 36 }).references(() => whatsappInstances.id).notNull(),
  agentId: varchar("agent_id", { length: 36 }).references(() => customAIAgents.id).notNull(),
  messageText: text("message_text").notNull(),
  messageRole: varchar("message_role", { length: 20 }).notNull(), // "user" ou "assistant"
  messageOrder: int("message_order").notNull(), // ordem sequencial para manter histórico
  senderPhone: varchar("sender_phone", { length: 20 }),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_agent_context_conversation").on(table.conversationId),
  index("idx_agent_context_instance").on(table.instanceId),
  index("idx_agent_context_agent").on(table.agentId),
  index("idx_agent_context_order").on(table.conversationId, table.messageOrder),
  index("idx_agent_context_timestamp").on(table.timestamp),
]);

// Instâncias WhatsApp do admin (para o próprio sistema)
export const adminWhatsappInstances = mysqlTable("admin_whatsapp_instances", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  instanceName: varchar("instance_name", { length: 100 }).notNull(),
  instanceKey: varchar("instance_key", { length: 100 }).unique().notNull(),
  webhook: varchar("webhook", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("disconnected"), // connected, disconnected, connecting, error
  qrCode: text("qr_code"),
  lastConnection: timestamp("last_connection"),
  phoneNumber: varchar("phone_number", { length: 20 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_admin_whatsapp_instances_status").on(table.status),
  index("idx_admin_whatsapp_instances_active").on(table.isActive),
]);

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  // // client: one(clients, { fields: [users.id], references: [clients.userId]  // RELAÇÃO REMOVIDA}), // Comentado - não usar mais clients
  teamMember: one(teamMembers, { fields: [users.id], references: [teamMembers.userId] }),
  franchisor: one(franchisors, { fields: [users.id], references: [franchisors.userId] }),
  franchise: one(franchises, { fields: [users.id], references: [franchises.userId] }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  franchisors: many(franchisors),
}));

export const franchisorsRelations = relations(franchisors, ({ one, many }) => ({
  user: one(users, { fields: [franchisors.userId], references: [users.id] }),
  plan: one(plans, { fields: [franchisors.planId], references: [plans.id] }),
  franchises: many(franchises),
  globalPrompts: many(globalPrompts),
}));

export const franchisesRelations = relations(franchises, ({ one, many }) => ({
  user: one(users, { fields: [franchises.userId], references: [users.id] }),
  franchisor: one(franchisors, { fields: [franchises.franchisorId], references: [franchisors.id] }),
  // clients: many(clients), // Comentado - não usar mais clients
  phoneNumbers: many(franchisePhoneNumbers),
  agents: many(franchiseAgents),
  prompts: many(franchisePrompts),
}));

export const franchisePhoneNumbersRelations = relations(franchisePhoneNumbers, ({ one }) => ({
  franchise: one(franchises, { fields: [franchisePhoneNumbers.franchiseId], references: [franchises.id] }),
  whatsappInstance: one(whatsappInstances, { fields: [franchisePhoneNumbers.whatsappInstanceId], references: [whatsappInstances.id] }),
}));

export const franchiseAgentsRelations = relations(franchiseAgents, ({ one }) => ({
  franchise: one(franchises, { fields: [franchiseAgents.franchiseId], references: [franchises.id] }),
}));

export const franchisePromptsRelations = relations(franchisePrompts, ({ one }) => ({
  franchise: one(franchises, { fields: [franchisePrompts.franchiseId], references: [franchises.id] }),
}));

export const globalPromptsRelations = relations(globalPrompts, ({ one }) => ({
  franchisor: one(franchisors, { fields: [globalPrompts.franchisorId], references: [franchisors.id] }),
}));

// export const clientsRelations = relations(clients, ({ one, many }) => ({
//   franchise: one(franchises, { fields: [clients.franchiseId], references: [franchises.id] }),
//   invoices: many(invoices),
//   projects: many(projects),
//   contacts: many(clientContacts),
//   plans: many(clientPlans),
//   communications: many(clientCommunications),
//   portalAccess: many(clientPortalAccess),
//   monthlyGoals: many(clientMonthlyGoals),
//   meetingNotes: many(meetingNotes),
//   whatsappInstances: many(whatsappInstances),
// }));

// export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
//   // client: one(clients, { fields: [clientContacts.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}),
// }));

// export const clientPlansRelations = relations(clientPlans, ({ one }) => ({
//   // client: one(clients, { fields: [clientPlans.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}),
// }));

// export const clientCommunicationsRelations = relations(clientCommunications, ({ one }) => ({
//   // client: one(clients, { fields: [clientCommunications.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}),
//   user: one(users, { fields: [clientCommunications.userId], references: [users.id] }),
// }));

// export const clientPortalAccessRelations = relations(clientPortalAccess, ({ one }) => ({
//   // client: one(clients, { fields: [clientPortalAccess.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}),
//   user: one(users, { fields: [clientPortalAccess.userId], references: [users.id] }),
// }));

// export const clientMonthlyGoalsRelations = relations(clientMonthlyGoals, ({ one }) => ({
//   // client: one(clients, { fields: [clientMonthlyGoals.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}),
// }));

// export const meetingNotesRelations = relations(meetingNotes, ({ one }) => ({
//   // client: one(clients, { fields: [meetingNotes.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}),
//   user: one(users, { fields: [meetingNotes.userId], references: [users.id] }),
//   project: one(projects, { fields: [meetingNotes.projectId], references: [projects.id] }),
// }));

export const teamMembersRelations = relations(teamMembers, ({ one, many }) => ({
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
  // assignments: many(projectAssignments), // REMOVIDO - TABELA PROJECT_ASSIGNMENTS NÃO MAIS UTILIZADA
}));

// RELAÇÕES REMOVIDAS - TABELA PROJECTS NÃO MAIS UTILIZADA
/*
export const projectsRelations = relations(projects, ({ one, many }) => ({
  // // client: one(clients, { fields: [projects.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}), // Comentado - não usar mais clients
  assignments: many(projectAssignments),
  invoices: many(invoices),
}));
*/

// RELAÇÕES REMOVIDAS - TABELA PROJECT_ASSIGNMENTS NÃO MAIS UTILIZADA
/*
export const projectAssignmentsRelations = relations(projectAssignments, ({ one }) => ({
  project: one(projects, { fields: [projectAssignments.projectId], references: [projects.id] }),
  teamMember: one(teamMembers, { fields: [projectAssignments.teamMemberId], references: [teamMembers.id] }),
}));
*/

// RELAÇÕES REMOVIDAS - TABELA INVOICES NÃO MAIS UTILIZADA
/*
export const invoicesRelations = relations(invoices, ({ one }) => ({
  // // client: one(clients, { fields: [invoices.clientId], references: [clients.id]  // RELAÇÃO REMOVIDA}), // Comentado - não usar mais clients
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
}));
*/

export const aiConfigurationsRelations = relations(aiConfigurations, ({ one }) => ({
  createdByUser: one(users, { fields: [aiConfigurations.createdBy], references: [users.id] }),
}));

export const aiUsageRelations = relations(aiUsage, ({ one }) => ({
  user: one(users, { fields: [aiUsage.userId], references: [users.id] }),
}));

export const customAIAgentsRelations = relations(customAIAgents, ({ one }) => ({
  user: one(users, { fields: [customAIAgents.userId], references: [users.id] }),
}));

export const whatsappInstancesRelations = relations(whatsappInstances, ({ one, many }) => ({
  franchise: one(franchises, { fields: [whatsappInstances.franchiseId], references: [franchises.id] }),
  conversations: many(whatsappConversations),
}));

export const whatsappConversationsRelations = relations(whatsappConversations, ({ one, many }) => ({
  instance: one(whatsappInstances, { fields: [whatsappConversations.instanceId], references: [whatsappInstances.id] }),
  messages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  conversation: one(whatsappConversations, { fields: [whatsappMessages.conversationId], references: [whatsappConversations.id] }),
}));

export const whatsappAgentsRelations = relations(whatsappAgents, ({ one, many }) => ({
  franchisor: one(franchisors, { fields: [whatsappAgents.franchisorId], references: [franchisors.id] }),
  bindings: many(whatsappInstanceAgentBindings),
}));

export const whatsappInstanceAgentBindingsRelations = relations(whatsappInstanceAgentBindings, ({ one }) => ({
  instance: one(adminWhatsappInstances, { fields: [whatsappInstanceAgentBindings.instanceId], references: [adminWhatsappInstances.id] }),
  agent: one(whatsappAgents, { fields: [whatsappInstanceAgentBindings.agentId], references: [whatsappAgents.id] }),
}));



// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SCHEMA REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export const insertClientSchema = createInsertSchema(clients).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// SCHEMA REMOVIDO - TABELA PROJECTS NÃO MAIS UTILIZADA
// export const insertProjectSchema = createInsertSchema(projects).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// SCHEMA REMOVIDO - TABELA INVOICES NÃO MAIS UTILIZADA
// export const insertInvoiceSchema = createInsertSchema(invoices).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

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

// SCHEMA REMOVIDO - TABELA CLIENT_CONTACTS NÃO MAIS UTILIZADA
// export const insertClientContactSchema = createInsertSchema(clientContacts).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// SCHEMA REMOVIDO - TABELA CLIENT_PLANS NÃO MAIS UTILIZADA
// export const insertClientPlanSchema = createInsertSchema(clientPlans).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// SCHEMA REMOVIDO - TABELA CLIENT_COMMUNICATIONS NÃO MAIS UTILIZADA
// export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// SCHEMA REMOVIDO - TABELA CLIENT_PORTAL_ACCESS NÃO MAIS UTILIZADA
// export const insertClientPortalAccessSchema = createInsertSchema(clientPortalAccess).omit({
//   id: true,
//   createdAt: true,
// });

// SCHEMA REMOVIDO - TABELA CLIENT_MONTHLY_GOALS NÃO MAIS UTILIZADA
// export const insertClientMonthlyGoalSchema = createInsertSchema(clientMonthlyGoals).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

// SCHEMA REMOVIDO - TABELA MEETING_NOTES NÃO MAIS UTILIZADA
// export const insertMeetingNoteSchema = createInsertSchema(meetingNotes).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

export const insertAIConfigurationSchema = createInsertSchema(aiConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAIUsageSchema = createInsertSchema(aiUsage).omit({
  id: true,
  createdAt: true,
});

export const insertCustomAIAgentSchema = createInsertSchema(customAIAgents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createCustomAIAgentSchema = z.object({
  name: z.string().min(1, "Nome do agente é obrigatório").max(255, "Nome muito longo"),
  description: z.string().optional(),
  systemPrompt: z.string().min(1, "Prompt do sistema é obrigatório"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
  // PDF Training fields
  pdfFiles: z.array(z.string()).optional().default([]),
  pdfContents: z.array(z.object({
    fileName: z.string(),
    content: z.string()
  })).optional().default([]),
  // Campo para processamento de PDFs no frontend
  pdfData: z.array(z.object({
    fileName: z.string(),
    base64Data: z.string()
  })).optional(),
  isActive: z.boolean().default(true),
});

export const insertWhatsappApiSettingsSchema = createInsertSchema(whatsappApiSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappInstanceSchema = createInsertSchema(whatsappInstances).omit({
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

// Schema for AI settings
export const aiSettingsSchema = z.object({
  chatGptApiKey: z.string().min(1, "Chave da API do ChatGPT é obrigatória"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).max(4000).default(1000),
  model: z.string().min(1, "Modelo é obrigatório").default("gpt-3.5-turbo"),
  systemPrompt: z.string().min(1, "Prompt do sistema é obrigatório").default("Você é um assistente útil e prestativo."),
});

// Schema for admin-level AI settings (without API key, tokens, and model)
export const adminAiSettingsSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.7),
  systemPrompt: z.string().min(1, "Prompt do sistema é obrigatório").default("Você é um assistente útil e prestativo."),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// TIPO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export type Client = typeof clients.$inferSelect;
// TIPO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export type InsertClient = z.infer<typeof insertClientSchema>;

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;

// TIPO REMOVIDO - TABELA PROJECTS NÃO MAIS UTILIZADA
// export type Project = typeof projects.$inferSelect;
// export type InsertProject = z.infer<typeof insertProjectSchema>;

// TIPO REMOVIDO - TABELA INVOICES NÃO MAIS UTILIZADA
// export type Invoice = typeof invoices.$inferSelect;
// export type InsertInvoice = z.infer<typeof insertInvoiceSchema);

// TIPO REMOVIDO - TABELA PROJECT_ASSIGNMENTS NÃO MAIS UTILIZADA
// export type ProjectAssignment = typeof projectAssignments.$inferSelect;

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
  role: z.enum(["super_root", "admin", "team", "client", "franchisor", "franchise"]).default("team"),

  // Team member specific data
  position: z.string().min(1, "Cargo é obrigatório"),
  department: z.string().min(1, "Departamento é obrigatório"),
  salary: z.number().positive("Salário deve ser positivo").optional(),
  hireDate: z.string().optional(),
});

export type CreateTeamMember = z.infer<typeof createTeamMemberSchema>;

// Schema para criação de cliente final (pertence a uma franquia)
// SCHEMA REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export const createClientSchema = z.object({
//   // Dados básicos do cliente
//   fullName: z.string().min(1, "Nome completo é obrigatório"),
//   email: z.string().email("Email inválido").optional().or(z.literal("")),
//   phone: z.string().optional(),
//   cpfCnpj: z.string().optional(),
// 
//   // Endereço
//   street: z.string().optional(),
//   number: z.string().optional(),
//   complement: z.string().optional(),
//   neighborhood: z.string().optional(),
//   city: z.string().optional(),
//   state: z.string().optional(),
//   zipCode: z.string().optional(),
// 
//   // Informações adicionais
//   notes: z.string().optional(),
// });

// TIPO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export type CreateClient = z.infer<typeof createClientSchema>;

// Schema para edição de cliente - todos os campos opcionais
// SCHEMA REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export const editClientSchema = z.object({
//   fullName: z.string().optional(),
//   email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
//   phone: z.string().optional(),
//   cpfCnpj: z.string().optional(),
//   street: z.string().optional(),
//   number: z.string().optional(),
//   complement: z.string().optional(),
//   neighborhood: z.string().optional(),
//   city: z.string().optional(),
//   state: z.string().optional(),
//   zipCode: z.string().optional(),
//   notes: z.string().optional(),
// });

// TIPO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export type EditClient = z.infer<typeof editClientSchema>;

export type UserRole = typeof userRoles.$inferSelect;
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type CreateRole = z.infer<typeof createRoleSchema>;
export type AISettings = z.infer<typeof aiSettingsSchema>;
export type AdminAISettings = z.infer<typeof adminAiSettingsSchema>;

// WhatsApp Agents types
export type WhatsappAgent = typeof whatsappAgents.$inferSelect;
export type InsertWhatsappAgent = typeof whatsappAgents.$inferInsert;

// WhatsApp Instance Agent Bindings types
export type WhatsappInstanceAgentBinding = typeof whatsappInstanceAgentBindings.$inferSelect;
export type InsertWhatsappInstanceAgentBinding = typeof whatsappInstanceAgentBindings.$inferInsert;
// TIPO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export type ClientWhatsappInstanceAgentBinding = typeof clientWhatsappInstanceAgentBindings.$inferSelect;
// TIPO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// export type InsertClientWhatsappInstanceAgentBinding = typeof clientWhatsappInstanceAgentBindings.$inferInsert;
export type AIConfiguration = typeof aiConfigurations.$inferSelect;
export type InsertAIConfiguration = z.infer<typeof insertAIConfigurationSchema>;
export type AIUsage = typeof aiUsage.$inferSelect;
export type InsertAIUsage = z.infer<typeof insertAIUsageSchema>;
export type CustomAIAgent = typeof customAIAgents.$inferSelect;
export type InsertCustomAIAgent = typeof customAIAgents.$inferInsert;
export type CreateCustomAIAgent = z.infer<typeof createCustomAIAgentSchema>;

// Schema para configurações da API WhatsApp
export const whatsappApiSettingsSchema = z.object({
  evolutionApiUrl: z.string().url("URL da Evolution API é obrigatória e deve ser válida"),
  globalToken: z.string().min(1, "Token Global é obrigatório"),
  systemUrl: z.string().url("URL do Sistema é obrigatória e deve ser válida").optional(),
  isActive: z.boolean().default(true),
});

export type WhatsappApiSettings = typeof whatsappApiSettings.$inferSelect;
export type InsertWhatsappApiSettings = z.infer<typeof insertWhatsappApiSettingsSchema>;
export type WhatsappApiSettingsForm = z.infer<typeof whatsappApiSettingsSchema>;

// Schema para criação de instância WhatsApp
export const createWhatsappInstanceSchema = z.object({
  instanceName: z.string().min(1, "Nome da instância é obrigatório"),
  instanceKey: z.string().min(1, "Chave da instância é obrigatória"),
  webhook: z.string().url("URL de webhook inválida").optional().or(z.literal("")),
});

// Schema para criação de plano
export const createPlanSchema = z.object({
  name: z.string().min(1, "Nome do plano é obrigatório"),
  description: z.string().optional(),
  maxFranchises: z.number().min(1, "Máximo de franquias deve ser pelo menos 1"),
  maxPhoneNumbers: z.number().min(1, "Máximo de números deve ser pelo menos 1"),
  maxAgents: z.number().min(1, "Máximo de agentes deve ser pelo menos 1"),
  maxPrompts: z.number().min(1, "Máximo de prompts deve ser pelo menos 1"),
  monthlyPrice: z.number().min(0, "Preço mensal deve ser positivo"),
  features: z.array(z.string()).default([]),
  active: z.boolean().default(true),
});

// Schema para criação de franqueador
export const createFranchisorSchema = z.object({
  // Dados do usuário
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),

  // Dados da empresa
  planId: z.string().min(1, "Plano é obrigatório"),
  companyName: z.string().min(1, "Nome fantasia é obrigatório"),
  legalName: z.string().min(1, "Razão social é obrigatória"),
  cnpj: z.string().min(1, "CNPJ é obrigatório"),

  // Endereço
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  zipCode: z.string().min(1, "CEP é obrigatório"),

  // Contatos
  contactPhone: z.string().min(1, "Telefone de contato é obrigatório"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),

  // Datas do plano
  planStartDate: z.string().min(1, "Data de início do plano é obrigatória"),
  planEndDate: z.string().optional(),
});

// Schema para criação de franquia
export const createFranchiseSchema = z.object({
  // Dados do usuário
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),

  // Dados da franquia
  franchiseName: z.string().min(1, "Nome da franquia é obrigatório"),
  franchiseCode: z.string().min(1, "Código da franquia é obrigatório"),

  // Endereço
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  zipCode: z.string().min(1, "CEP é obrigatório"),

  // Contatos
  contactPhone: z.string().min(1, "Telefone de contato é obrigatório"),

  // Responsável
  managerName: z.string().min(1, "Nome do responsável é obrigatório"),
  managerPhone: z.string().optional(),
  managerEmail: z.string().email("Email do responsável inválido").optional().or(z.literal("")),
});

// Schema para criação de número de telefone da franquia
export const createFranchisePhoneNumberSchema = z.object({
  phoneNumber: z.string().min(1, "Número de telefone é obrigatório"),
  isPrimary: z.boolean().default(false),
});

// Schema para criação de agente da franquia
export const createFranchiseAgentSchema = z.object({
  name: z.string().min(1, "Nome do agente é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  department: z.string().optional(),
  specialties: z.array(z.string()).default([]),
});

// Schema para criação de prompt da franquia
export const createFranchisePromptSchema = z.object({
  name: z.string().min(1, "Nome do prompt é obrigatório"),
  description: z.string().optional(),
  prompt: z.string().min(1, "Conteúdo do prompt é obrigatório"),
  category: z.string().optional(),
  isDefault: z.boolean().default(false),
});

// Schema para criação de prompt global
export const createGlobalPromptSchema = z.object({
  name: z.string().min(1, "Nome do prompt é obrigatório"),
  description: z.string().optional(),
  prompt: z.string().min(1, "Conteúdo do prompt é obrigatório"),
  temperature: z.number().min(0).max(2).default(0.7),
  category: z.string().optional(),
  isDefault: z.boolean().default(false),
});

// Schema para edição de perfil do super root
export const editSuperRootProfileSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres").optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Para alterar a senha, informe a senha atual e confirme a nova senha",
  path: ["confirmPassword"],
});

export type WhatsappInstance = typeof whatsappInstances.$inferSelect;
export type InsertWhatsappInstance = z.infer<typeof insertWhatsappInstanceSchema>;
export type CreateWhatsappInstance = z.infer<typeof createWhatsappInstanceSchema>;

export type AdminWhatsappInstance = typeof adminWhatsappInstances.$inferSelect;
export type InsertAdminWhatsappInstance = typeof adminWhatsappInstances.$inferInsert;

export type GlobalPrompt = typeof globalPrompts.$inferSelect;
export type CreateGlobalPrompt = z.infer<typeof createGlobalPromptSchema>;

export type AgentConversationContext = typeof agentConversationContext.$inferSelect;
export type InsertAgentConversationContext = typeof agentConversationContext.$inferInsert;

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

export type WhatsappConversation = typeof whatsappConversations.$inferSelect;
export type InsertWhatsappConversation = typeof whatsappConversations.$inferInsert;

// Franchise types
export type Franchise = typeof franchises.$inferSelect;
export type InsertFranchise = typeof franchises.$inferInsert;
export type CreateFranchise = z.infer<typeof createFranchiseSchema>;

// Schema para atualização parcial de franquia (usado pelo admin)
export const updateFranchiseSchema = createFranchiseSchema.partial().extend({
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export type UpdateFranchise = z.infer<typeof updateFranchiseSchema>;

// Schema para edição de perfil da franquia
export const editFranchiseProfileSchema = z.object({
  franchiseName: z.string().min(1, "Nome da franquia é obrigatório"),
  
  // Endereço
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Bairro é obrigatório"),
  city: z.string().min(1, "Cidade é obrigatória"),
  state: z.string().min(1, "Estado é obrigatório"),
  zipCode: z.string().min(1, "CEP é obrigatório"),

  // Contatos
  contactPhone: z.string().min(1, "Telefone de contato é obrigatório"),
  email: z.string().email("Email inválido"),

  // Responsável
  managerName: z.string().min(1, "Nome do responsável é obrigatório"),
  managerPhone: z.string().optional(),
  managerEmail: z.union([
    z.string().email("Email do responsável inválido"),
    z.literal(""),
    z.undefined()
  ]).optional(),

  // Campos de senha (opcionais)
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres").optional().or(z.literal("")),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // Só valida senha se nova senha foi informada e não for string vazia
  if (data.newPassword && data.newPassword !== "") {
    // Se nova senha foi informada, senha atual é obrigatória
    if (!data.currentPassword) {
      return false;
    }
    // Se nova senha foi informada, confirmação deve ser igual
    if (data.newPassword !== data.confirmPassword) {
      return false;
    }
  }
  return true;
}, {
  message: "Para alterar a senha, informe a senha atual e confirme a nova senha",
  path: ["confirmPassword"],
});

export type EditFranchiseProfile = z.infer<typeof editFranchiseProfileSchema>;

// Clientes finais das franquias (pessoas que fazem agendamentos)
export const franchiseClients = mysqlTable("franchise_clients", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(),
  
  // Dados básicos do cliente final
  fullName: varchar("full_name", { length: 255 }).notNull(), // Nome completo
  phone: varchar("phone", { length: 20 }).notNull(), // Telefone (obrigatório para agendamento)
  email: varchar("email", { length: 255 }), // Email (opcional)
  cpf: varchar("cpf", { length: 14 }), // CPF (opcional)
  
  // Endereço (opcional)
  street: varchar("street", { length: 255 }),
  number: varchar("number", { length: 20 }),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 10 }),
  
  // Informações de agendamento
  lastAppointmentDate: timestamp("last_appointment_date"),
  totalAppointments: int("total_appointments").notNull().default(0),
  
  // Observações
  notes: text("notes"), // Observações gerais
  source: varchar("source", { length: 50 }).notNull().default("whatsapp"), // whatsapp, phone, website, etc
  
  // Status
  status: varchar("status", { length: 20 }).notNull().default("active"), // active, inactive
  
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_franchise_clients_franchise").on(table.franchiseId),
  index("idx_franchise_clients_phone").on(table.phone),
  index("idx_franchise_clients_status").on(table.status),
]);

// Configurações do Google Calendar das franquias
export const googleCalendarSettings = mysqlTable("google_calendar_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  clientId: varchar("client_id", { length: 500 }).notNull(),
  clientSecret: varchar("client_secret", { length: 500 }).notNull(),
  refreshToken: varchar("refresh_token", { length: 500 }),
  calendarId: varchar("calendar_id", { length: 255 }).notNull().default("primary"),
  defaultEventDuration: int("default_event_duration").notNull().default(60),
  eventTitle: varchar("event_title", { length: 255 }).notNull().default("Consulta Agendada"),
  eventDescription: text("event_description").default("Consulta agendada via WhatsApp"),
  eventLocation: varchar("event_location", { length: 500 }),
  isConnected: boolean("is_connected").notNull().default(false),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_calendar_settings_franchise").on(table.franchiseId),
]);

// Schema para configurações do Google Calendar
export const googleCalendarSettingsSchema = z.object({
  isEnabled: z.boolean().default(false),
  clientId: z.string().min(1, "Client ID é obrigatório"),
  clientSecret: z.string().min(1, "Client Secret é obrigatório"),
  refreshToken: z.string().optional(),
  calendarId: z.string().min(1, "Calendar ID é obrigatório").default("primary"),
  defaultEventDuration: z.number().min(15).max(480).default(60),
  eventTitle: z.string().min(1, "Título do evento é obrigatório").default("Consulta Agendada"),
  eventDescription: z.string().default("Consulta agendada via WhatsApp"),
  eventLocation: z.string().optional(),
});

export const insertGoogleCalendarSettingsSchema = createInsertSchema(googleCalendarSettings);

export type GoogleCalendarSettings = typeof googleCalendarSettings.$inferSelect;
export type InsertGoogleCalendarSettings = z.infer<typeof insertGoogleCalendarSettingsSchema>;
export type GoogleCalendarSettingsForm = z.infer<typeof googleCalendarSettingsSchema>;

// Franchise Client types
export type FranchiseClient = typeof franchiseClients.$inferSelect;
export type InsertFranchiseClient = typeof franchiseClients.$inferInsert;

// Schema para criação de cliente da franquia
export const createFranchiseClientSchema = z.object({
  fullName: z.string().min(1, "Nome completo é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  cpf: z.string().optional(),
  
  // Endereço (opcional)
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  
  notes: z.string().optional(),
  source: z.string().default("whatsapp"),
});

// Schema para atualização de cliente da franquia
export const updateFranchiseClientSchema = createFranchiseClientSchema.partial();

export type CreateFranchiseClient = z.infer<typeof createFranchiseClientSchema>;
export type UpdateFranchiseClient = z.infer<typeof updateFranchiseClientSchema>;

// CRM Kanban Cards - Cards de atendimento para o sistema CRM
export const crmKanbanCards = mysqlTable("crm_kanban_cards", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(uuid())`),
  franchiseId: varchar("franchise_id", { length: 36 }).references(() => franchises.id).notNull(),

  // Dados do cliente
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientPhone: varchar("client_phone", { length: 20 }).notNull(),

  // Dados do atendimento
  type: varchar("type", { length: 100 }).notNull().default("Consulta"),
  priority: varchar("priority", { length: 20 }).notNull().default("media"), // alta, media, baixa
  status: varchar("status", { length: 20 }).notNull().default("novo"), // novo, atendimento, agendado, finalizado

  // Agendamento (opcional)
  scheduledDate: timestamp("scheduled_date"),
  scheduledTime: varchar("scheduled_time", { length: 10 }),

  // Observações
  notes: text("notes"),

  // Dados de rastreamento
  lastMessageDate: timestamp("last_message_date"),
  conversationId: varchar("conversation_id", { length: 36 }).references(() => whatsappConversations.id),

  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_crm_kanban_franchise").on(table.franchiseId),
  index("idx_crm_kanban_phone").on(table.clientPhone),
  index("idx_crm_kanban_status").on(table.status),
  index("idx_crm_kanban_priority").on(table.priority),
  index("idx_crm_kanban_conversation").on(table.conversationId),
]);

// Schema para criação de card do kanban
export const createCrmKanbanCardSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  clientPhone: z.string().min(1, "Telefone do cliente é obrigatório"),
  type: z.string().default("Consulta"),
  priority: z.enum(["alta", "media", "baixa"]).default("media"),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  notes: z.string().optional(),
});

// Schema para atualização de card do kanban
export const updateCrmKanbanCardSchema = createCrmKanbanCardSchema.partial().extend({
  status: z.enum(["novo", "atendimento", "agendado", "finalizado"]).optional(),
});

export type CrmKanbanCard = typeof crmKanbanCards.$inferSelect;
export type InsertCrmKanbanCard = typeof crmKanbanCards.$inferInsert;
export type CreateCrmKanbanCard = z.infer<typeof createCrmKanbanCardSchema>;
export type UpdateCrmKanbanCard = z.infer<typeof updateCrmKanbanCardSchema>;

// CRM Kanban Cards relations
export const crmKanbanCardsRelations = relations(crmKanbanCards, ({ one }) => ({
  franchise: one(franchises, { fields: [crmKanbanCards.franchiseId], references: [franchises.id] }),
  conversation: one(whatsappConversations, { fields: [crmKanbanCards.conversationId], references: [whatsappConversations.id] }),
}));
