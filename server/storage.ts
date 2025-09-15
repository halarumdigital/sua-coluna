import {
  users,
  // TABELAS REMOVIDAS - NÃO MAIS UTILIZADAS
  // clients,
  teamMembers,
  // projects,
  // invoices,
  // projectAssignments,
  systemSettings,
  userRoles,
  aiConfigurations,
  aiUsage,
  whatsappApiSettings,
  whatsappInstances,
  adminWhatsappInstances,
  whatsappConversations,
  whatsappMessages,
  plans,
  franchisors,
  franchises,
  franchisePhoneNumbers,
  franchiseAgents,
  franchisePrompts,
  globalPrompts,
  whatsappAgents,
  whatsappInstanceAgentBindings,
  clientWhatsappInstanceAgentBindings,
  customAIAgents,
  agentConversationContext,
  franchiseClients,
  crmKanbanCards,
  type User,
  type UpsertUser,
  // TIPOS REMOVIDOS - TABELAS NÃO MAIS UTILIZADAS
  // type Client,
  // type InsertClient,
  type TeamMember,
  type InsertTeamMember,
  // type Project,
  // type InsertProject,
  // type Invoice,
  // type InsertInvoice,
  // type ProjectAssignment,
  type SystemSetting,
  type InsertSystemSetting,
  type UserRole,
  type AISettings,
  type AIConfiguration,
  type InsertAIConfiguration,
  type AIUsage,
  type InsertAIUsage,
  type WhatsappApiSettings,
  type InsertWhatsappApiSettings,
  type WhatsappApiSettingsForm,
  type WhatsappInstance,
  type InsertWhatsappInstance,
  type AdminWhatsappInstance,
  type InsertAdminWhatsappInstance,
  type WhatsappConversation,
  type InsertWhatsappConversation,
  type WhatsappMessage,
  type InsertWhatsappMessage,
  type Plan,
  type InsertPlan,
  type CreatePlan,
  type Franchisor,
  type InsertFranchisor,
  type CreateFranchisor,
  type Franchise,
  type InsertFranchise,
  type CreateFranchise,
  type FranchisePhoneNumber,
  type InsertFranchisePhoneNumber,
  type CreateFranchisePhoneNumber,
  type FranchiseAgent,
  type InsertFranchiseAgent,
  type CreateFranchiseAgent,
  type FranchisePrompt,
  type InsertFranchisePrompt,
  type CreateFranchisePrompt,
  type GlobalPrompt,
  type CreateGlobalPrompt,
  type WhatsappAgent,
  type InsertWhatsappAgent,
  type WhatsappInstanceAgentBinding,
  type InsertWhatsappInstanceAgentBinding,
  // TIPOS REMOVIDOS - TABELAS NÃO MAIS UTILIZADAS
  // type ClientWhatsappInstanceAgentBinding,
  // type InsertClientWhatsappInstanceAgentBinding,
  type AgentConversationContext,
  type InsertAgentConversationContext,
  type FranchiseClient,
  type InsertFranchiseClient,
  type CreateFranchiseClient,
  type UpdateFranchiseClient,
  type CrmKanbanCard,
  type InsertCrmKanbanCard,
  type CreateCrmKanbanCard,
  type UpdateCrmKanbanCard,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sum, sql, like, gte, lte, or, between, asc } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Client operations - REMOVIDAS - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientByUserId(userId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  */

  // Team operations
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;

  // Project operations - REMOVIDAS - TABELA PROJECTS NÃO MAIS UTILIZADA
  /*
  getProjects(): Promise<Project[]>;
  getProjectsByTeamMember(teamMemberId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  */

  // Invoice operations - REMOVIDAS - TABELA INVOICES NÃO MAIS UTILIZADA
  /*
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByClient(clientId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;
  */

  // Dashboard stats
  getAdminStats(): Promise<{
    totalClients: number;
    totalRevenue: number;
    activeProjects: number;
    teamMembers: number;
  }>;
  // MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  getClientStats(clientId: string): Promise<{
    pendingInvoices: number;
    totalOpen: number;
    nextDue: string | null;
  }>;
  */
  getTeamStats(teamMemberId: string): Promise<{
    activeProjects: number;
    pendingTasks: number;
    completedToday: number;
  }>;

  // System settings operations
  getSystemSettings(): Promise<Record<string, any>>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(key: string, value: string, type?: string): Promise<SystemSetting>;
  deleteSystemSetting(key: string): Promise<void>;

  // Team member with user creation
  createTeamMemberWithUser(data: any): Promise<TeamMember>;

  // Client with user creation - REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  createClientWithUser(data: any): Promise<Client>;
  */

  // Roles operations
  getRoles(): Promise<UserRole[]>;
  getRole(id: string): Promise<UserRole | undefined>;
  createRole(data: any): Promise<UserRole>;
  updateRole(id: string, data: any): Promise<UserRole>;
  deleteRole(id: string): Promise<void>;

  // AI Settings operations
  getAISettings(): Promise<AISettings>;
  saveAISettings(settings: AISettings): Promise<void>;
  
  // Client AI Settings operations
  getClientAISettings(userId: string): Promise<{
    systemPrompt?: string | null;
    maxTokens?: number | null;
    temperature?: number | null;
  } | null>;
  saveClientAISettings(userId: string, settings: {
    systemPrompt?: string | null;
    maxTokens?: number | null;
    temperature?: number | null;
  }): Promise<void>;

  // AI Configurations operations (advanced)
  getAIConfigurations(): Promise<AIConfiguration[]>;
  getAIConfiguration(id: string): Promise<AIConfiguration | undefined>;
  getDefaultAIConfiguration(): Promise<AIConfiguration | undefined>;
  createAIConfiguration(config: InsertAIConfiguration): Promise<AIConfiguration>;
  updateAIConfiguration(id: string, config: Partial<InsertAIConfiguration>): Promise<AIConfiguration>;
  deleteAIConfiguration(id: string): Promise<void>;
  setDefaultAIConfiguration(id: string): Promise<void>;

  // AI Usage operations
  recordAIUsage(usage: InsertAIUsage): Promise<AIUsage>;
  getAIUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    requestsToday: number;
    requestsThisMonth: number;
    lastUsed: string | null;
  }>;
  getAIUsageByUser(userId: string): Promise<AIUsage[]>;
  getAIUsageByDateRange(startDate: Date, endDate: Date): Promise<AIUsage[]>;

  // WhatsApp API Settings operations
  getWhatsappApiSettings(): Promise<WhatsappApiSettings | undefined>;
  saveWhatsappApiSettings(settings: WhatsappApiSettingsForm, userId: string): Promise<WhatsappApiSettings>;
  updateWhatsappApiSettings(id: string, settings: Partial<WhatsappApiSettingsForm>): Promise<WhatsappApiSettings>;
  deleteWhatsappApiSettings(id: string): Promise<void>;

  // WhatsApp Instances operations
  getWhatsappInstances(): Promise<WhatsappInstance[]>;
  getWhatsappInstancesByClient(clientId: string): Promise<WhatsappInstance[]>;
  getWhatsappInstancesByFranchise(franchiseId: string): Promise<WhatsappInstance[]>;
  getWhatsappInstance(id: string): Promise<WhatsappInstance | undefined>;
  getWhatsappInstanceByKey(instanceKey: string): Promise<WhatsappInstance | undefined>;
  createWhatsappInstance(instance: InsertWhatsappInstance): Promise<WhatsappInstance>;
  updateWhatsappInstance(id: string, instance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance>;
  deleteWhatsappInstance(id: string): Promise<void>;

  // Admin WhatsApp Instances operations
  getAdminWhatsappInstances(): Promise<AdminWhatsappInstance[]>;
  getAdminWhatsappInstance(id: string): Promise<AdminWhatsappInstance | undefined>;
  getAdminWhatsappInstanceByKey(instanceKey: string): Promise<AdminWhatsappInstance | undefined>;
  createAdminWhatsappInstance(instance: InsertAdminWhatsappInstance): Promise<AdminWhatsappInstance>;
  updateAdminWhatsappInstance(id: string, instance: Partial<InsertAdminWhatsappInstance>): Promise<AdminWhatsappInstance>;
  deleteAdminWhatsappInstance(id: string): Promise<void>;

  // WhatsApp Conversations operations
  getWhatsappConversationsByInstance(instanceId: string): Promise<WhatsappConversation[]>;
  createWhatsappConversation(conversation: InsertWhatsappConversation): Promise<WhatsappConversation>;
  updateWhatsappConversation(id: string, conversation: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation>;
  getWhatsappConversationById(id: string): Promise<WhatsappConversation | undefined>;
  getWhatsappConversationByChatId(instanceId: string, chatId: string): Promise<WhatsappConversation | undefined>;
  getWhatsappConversationsByClient(clientId: string, filters?: {
    search?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<WhatsappConversation[]>;
  updateConversationStatus(id: string, status: string): Promise<WhatsappConversation>;
  
  // WhatsApp Messages operations
  createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage>;
  getWhatsappMessagesByConversation(conversationId: string): Promise<WhatsappMessage[]>;

  // Agent Conversation Context operations
  addToAgentContext(context: InsertAgentConversationContext): Promise<void>;
  getAgentContext(conversationId: string, agentId: string, limit?: number): Promise<AgentConversationContext[]>;
  cleanupAgentContext(conversationId: string, agentId: string, maxMessages?: number): Promise<void>;

  // Global Prompts operations
  getGlobalPrompts(franchisorId: string): Promise<GlobalPrompt[]>;
  createGlobalPrompt(franchisorId: string, promptData: CreateGlobalPrompt): Promise<GlobalPrompt>;
  updateGlobalPrompt(id: string, promptData: Partial<CreateGlobalPrompt>): Promise<GlobalPrompt>;
  deleteGlobalPrompt(id: string): Promise<void>;
  getGlobalPromptById(id: string): Promise<GlobalPrompt | undefined>;
  testGlobalPrompt(id: string, testMessage: string): Promise<{success: boolean, response?: string, error?: string}>;

  // WhatsApp Agents operations
  getWhatsappAgents(): Promise<WhatsappAgent[]>;
  getWhatsappAgent(id: string): Promise<WhatsappAgent | undefined>;
  createWhatsappAgent(agentData: InsertWhatsappAgent): Promise<WhatsappAgent>;
  updateWhatsappAgent(id: string, agentData: Partial<InsertWhatsappAgent>): Promise<WhatsappAgent>;
  deleteWhatsappAgent(id: string): Promise<void>;

  // WhatsApp Instance Agent Bindings operations
  getWhatsappInstanceAgentBindings(): Promise<WhatsappInstanceAgentBinding[]>;
  createWhatsappInstanceAgentBinding(bindingData: InsertWhatsappInstanceAgentBinding): Promise<WhatsappInstanceAgentBinding>;
  updateWhatsappInstanceAgentBinding(id: string, bindingData: Partial<InsertWhatsappInstanceAgentBinding>): Promise<WhatsappInstanceAgentBinding>;
  deleteWhatsappInstanceAgentBinding(id: string): Promise<void>;
  toggleWhatsappInstanceAgentBinding(id: string): Promise<WhatsappInstanceAgentBinding>;

  // Client WhatsApp Instance Agent Bindings operations
  getClientInstanceAgentBindings(clientId: string): Promise<WhatsappInstanceAgentBinding[]>;
  getFranchiseInstanceAgentBindings(franchiseId: string): Promise<WhatsappInstanceAgentBinding[]>;
  createClientWhatsappInstanceAgentBinding(bindingData: InsertWhatsappInstanceAgentBinding): Promise<WhatsappInstanceAgentBinding>;
  updateClientWhatsappInstanceAgentBinding(id: string, bindingData: Partial<InsertWhatsappInstanceAgentBinding>): Promise<WhatsappInstanceAgentBinding>;
  deleteClientWhatsappInstanceAgentBinding(id: string): Promise<void>;
  getClientInstanceAgentBindingById(id: string): Promise<WhatsappInstanceAgentBinding | undefined>;
  getClientWhatsappAgents(clientId: string): Promise<GlobalPrompt[]>;
  
  // Custom AI Agents operations
  getCustomAIAgentsByUserId(userId: string): Promise<any[]>;
  getCustomAIAgentById(id: string): Promise<any | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateSuperRootProfile(userId: string, profileData: any): Promise<User> {
    const updateData: any = {
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      phone: profileData.phone,
    };

    // Se está alterando senha, hash da nova senha
    if (profileData.newPassword) {
      const bcrypt = await import('bcrypt');
      updateData.password = await bcrypt.hash(profileData.newPassword, 10);
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    // Buscar o usuário atualizado
    const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
    
    // Retornar sem a senha
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to find existing user first
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      // Update existing user
      await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id));
      
      // Get the updated user
      const [updatedUser] = await db.select().from(users).where(eq(users.id, userData.id));
      return updatedUser;
    } else {
      // Insert new user
      await db
        .insert(users)
        .values(userData);
      
      // Get the newly created user
      const [newUser] = await db.select().from(users).where(eq(users.email, userData.email)).limit(1);
      return newUser;
    }
  }

  // Client operations
  // MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }
  */

  // MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  async getClient(id: string): Promise<Client | undefined> {
    if (!id) {
      console.error('getClient called with undefined or empty id');
      return undefined;
    }
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }
  */

  async getClientByUserId(userId: string): Promise<any | undefined> {
    // Na nova estrutura, usuários não são diretamente clientes
    // Usuários podem ser donos de franquias, e clientes pertencem a franquias
    // Este método agora retorna undefined pois a relação mudou
    return undefined;
  }

  // MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }
  */

  // MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    try {
      console.log("updateClient - ID:", id);
      console.log("updateClient - Original data:", client);
      
      // Verificar se o cliente existe
      const existingClient = await this.getClient(id);
      if (!existingClient) {
        throw new Error(`Client with ID ${id} not found`);
      }
      
      console.log("updateClient - Existing client found:", existingClient.companyName);
      
      // Filtrar campos undefined, null ou strings vazias
      const filteredClient = Object.fromEntries(
        Object.entries(client).filter(([_, value]) => 
          value !== undefined && value !== null && value !== ""
        )
      );
      
      console.log("updateClient - Filtered data:", filteredClient);
      
      if (Object.keys(filteredClient).length === 0) {
        console.log("updateClient - No data to update, returning existing client");
        return existingClient;
      }
      
      // Fazer o update sem returning
      await db
        .update(clients)
        .set({ ...filteredClient, updatedAt: new Date() })
        .where(eq(clients.id, id));
        
      console.log("updateClient - Update executed successfully");
      
      // Buscar o cliente atualizado
      const updatedClient = await this.getClient(id);
      if (!updatedClient) {
        throw new Error("Failed to retrieve updated client");
      }
      
      console.log("updateClient - Updated client retrieved:", updatedClient.companyName);
      return updatedClient;
    } catch (error) {
      console.error("updateClient - Error:", error);
      throw error;
    }
  }
  */

  // MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }
  */

  // Team operations
  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    await db
      .insert(teamMembers)
      .values(member);
    
    // Get the newly created member
    const [newMember] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, member.id))
      .limit(1);
    
    return newMember;
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember> {
    await db
      .update(teamMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(teamMembers.id, id));

    // Get the updated member
    const [updatedMember] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id))
      .limit(1);
    
    return updatedMember;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Project operations - REMOVIDAS - TABELA PROJECTS NÃO MAIS UTILIZADA
  /*
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProjectsByTeamMember(teamMemberId: string): Promise<Project[]> {
    return await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        clientId: projects.clientId,
        status: projects.status,
        startDate: projects.startDate,
        endDate: projects.endDate,
        budget: projects.budget,
        progress: projects.progress,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(eq(projectAssignments.teamMemberId, teamMemberId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async updateProject(id: string, project: Partial<InsertProject>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...project, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }
  */

  // Invoice operations - REMOVIDAS - TABELA INVOICES NÃO MAIS UTILIZADA
  /*
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByClient(clientId: string): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.clientId, clientId))
      .orderBy(desc(invoices.createdAt));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set({ ...invoice, updatedAt: new Date() })
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async deleteInvoice(id: string): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }
  */

  // Dashboard stats
  async getAdminStats(): Promise<{
    totalClients: number;
    totalRevenue: number;
    activeProjects: number;
    teamMembers: number;
  }> {
    // const [clientCount] = await db.select({ count: count() }).from(clients); // TABELA REMOVIDA
    // const [revenueSum] = await db
    //   .select({ sum: sum(invoices.amount) })
    //   .from(invoices)
    //   .where(eq(invoices.status, "paid"));
    // const [projectCount] = await db
    //   .select({ count: count() })
    //   .from(projects)
    //   .where(eq(projects.status, "active"));
    const [memberCount] = await db.select({ count: count() }).from(teamMembers);

    return {
      totalClients: 0, // TABELA CLIENTS REMOVIDA
      totalRevenue: 0, // TABELA INVOICES REMOVIDA
      activeProjects: 0, // TABELA PROJECTS REMOVIDA
      teamMembers: memberCount.count,
    };
  }

  // MÉTODO REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  async getClientStats(clientId: string): Promise<{
    pendingInvoices: number;
    totalOpen: number;
    nextDue: string | null;
  }> {
    const [pendingCount] = await db
      .select({ count: count() })
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), eq(invoices.status, "sent")));
    
    const [openSum] = await db
      .select({ sum: sum(invoices.amount) })
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), eq(invoices.status, "sent")));

    const [nextInvoice] = await db
      .select({ dueDate: invoices.dueDate })
      .from(invoices)
      .where(and(eq(invoices.clientId, clientId), eq(invoices.status, "sent")))
      .orderBy(invoices.dueDate)
      .limit(1);

    return {
      pendingInvoices: pendingCount.count,
      totalOpen: Number(openSum.sum || 0),
      nextDue: nextInvoice?.dueDate?.toISOString().split('T')[0] || null,
    };
  }
  */

  async getTeamStats(teamMemberId: string): Promise<{
    activeProjects: number;
    pendingTasks: number;
    completedToday: number;
  }> {
    // For now, using mock values for tasks as we don't have a tasks table
    return {
      activeProjects: 0, // TABELA PROJECTS REMOVIDA
      pendingTasks: 12, // This would come from a tasks table in a real implementation
      completedToday: 8, // This would come from a tasks table in a real implementation
    };
  }

  // System settings operations
  async getSystemSettings(): Promise<Record<string, any>> {
    const settings = await db.select().from(systemSettings);
    const result: Record<string, any> = {};
    
    settings.forEach(setting => {
      let value = setting.settingValue;
      
      // Parse value based on type
      switch (setting.settingType) {
        case 'boolean':
          value = value === 'true';
          break;
        case 'number':
          value = parseFloat(value || '0');
          break;
        case 'json':
          try {
            value = JSON.parse(value || '{}');
          } catch {
            value = {};
          }
          break;
        default:
          // Keep as string
          break;
      }
      
      // Store all settings with original keys first
      result[setting.settingKey] = value;
      
      // Map database keys to frontend expected keys (only if not already set by a more recent key)
      switch (setting.settingKey) {
        case 'system_name':
          if (!result['systemName']) result['systemName'] = value;
          break;
        case 'system_title':
          if (!result['systemTitle']) result['systemTitle'] = value;
          break;
        case 'primary_color':
          if (!result['systemColor']) result['systemColor'] = value;
          break;
        case 'system_logo':
          // Only use system_logo if logo doesn't exist (prioritize newer 'logo' key)
          if (!result['logo']) result['logo'] = value;
          break;
        case 'system_favicon':
          // Only use system_favicon if favicon doesn't exist (prioritize newer 'favicon' key)
          if (!result['favicon']) result['favicon'] = value;
          break;
        case 'footer_name':
          if (!result['systemSubtitle']) result['systemSubtitle'] = value;
          break;
        default:
          // Keep original key
          break;
      }
    });
    
    return result;
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, key));
    return setting;
  }

  async setSystemSetting(
    key: string, 
    value: string, 
    type: string = 'string'
  ): Promise<SystemSetting> {
    const existingSetting = await this.getSystemSetting(key);
    
    if (existingSetting) {
      // Update existing setting
      await db
        .update(systemSettings)
        .set({
          settingValue: value,
          settingType: type,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.settingKey, key));
      
      // Return the updated setting
      const updatedSetting = await this.getSystemSetting(key);
      return updatedSetting!;
    } else {
      // Insert new setting
      await db
        .insert(systemSettings)
        .values({
          settingKey: key,
          settingValue: value,
          settingType: type,
        });
      
      // Return the newly created setting
      const newSetting = await this.getSystemSetting(key);
      return newSetting!;
    }
  }

  async updateSystemSettings(formData: any, files?: any): Promise<Record<string, any>> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      // Handle text settings
      if (formData.systemName) {
        await this.setSystemSetting('system_name', formData.systemName, 'string');
        await this.setSystemSetting('systemName', formData.systemName, 'string');
      }
      
      if (formData.systemSubtitle) {
        await this.setSystemSetting('system_subtitle', formData.systemSubtitle, 'string');
        await this.setSystemSetting('systemSubtitle', formData.systemSubtitle, 'string');
      }
      
      if (formData.systemDescription) {
        await this.setSystemSetting('system_description', formData.systemDescription, 'string');
        await this.setSystemSetting('systemDescription', formData.systemDescription, 'string');
      }
      
      if (formData.systemColor || formData.systemColorHex) {
        const color = formData.systemColorHex || formData.systemColor;
        await this.setSystemSetting('primary_color', color, 'string');
        await this.setSystemSetting('systemColor', color, 'string');
      }
      
      // Handle file uploads
      if (files) {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        
        // Ensure uploads directory exists
        try {
          await fs.mkdir(uploadsDir, { recursive: true });
        } catch (error) {
          console.log('Uploads directory already exists or error creating:', error);
        }
        
        // Handle logo upload
        if (files.logo && files.logo[0]) {
          const logoFile = files.logo[0];
          const logoExtension = path.extname(logoFile.originalname);
          const logoFilename = `logo_${Date.now()}${logoExtension}`;
          const logoPath = path.join(uploadsDir, logoFilename);
          
          await fs.writeFile(logoPath, logoFile.buffer);
          const logoUrl = `/uploads/${logoFilename}`;
          
          await this.setSystemSetting('system_logo', logoUrl, 'string');
          await this.setSystemSetting('logo', logoUrl, 'string');
        }
        
        // Handle favicon upload
        if (files.favicon && files.favicon[0]) {
          const faviconFile = files.favicon[0];
          const faviconExtension = path.extname(faviconFile.originalname);
          const faviconFilename = `favicon_${Date.now()}${faviconExtension}`;
          const faviconPath = path.join(uploadsDir, faviconFilename);
          
          await fs.writeFile(faviconPath, faviconFile.buffer);
          const faviconUrl = `/uploads/${faviconFilename}`;
          
          await this.setSystemSetting('system_favicon', faviconUrl, 'string');
          await this.setSystemSetting('favicon', faviconUrl, 'string');
        }
      }
      
      // Return updated settings
      return await this.getSystemSettings();
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  async deleteSystemSetting(key: string): Promise<void> {
    await db.delete(systemSettings).where(eq(systemSettings.settingKey, key));
  }

  // Team member with user creation
  async createTeamMemberWithUser(data: any): Promise<TeamMember> {
    const bcrypt = await import('bcrypt');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Create the user first
    await db
      .insert(users)
      .values({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        password: hashedPassword,
        role: data.role,
        active: true,
      });
    
    // Get the created user
    const [newUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    // Create the team member linked to the user
    await db
      .insert(teamMembers)
      .values({
        userId: newUser.id,
        position: data.position,
        department: data.department,
        salary: data.salary ? data.salary.toString() : null,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      });
    
    // Get the newly created team member
    const [newTeamMember] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, newUser.id))
      .limit(1);

    return newTeamMember;
  }

  // Client with user creation - REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
  /*
  async createClientWithUser(data: any): Promise<Client> {
    const bcrypt = await import('bcrypt');
    
    // Check if user with this email already exists
    const existingUser = await this.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error("Já existe um usuário cadastrado com este email");
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(data.systemPassword, 10);
    
    // Create the user first
    const userData = {
      email: data.email,
      firstName: data.companyName, // Use company name as first name for clients
      lastName: "", // Empty last name for companies
      phone: data.contactPhone,
      password: hashedPassword,
      role: "client",
      active: true,
    };

    await db.insert(users).values(userData);
    
    // Get the created user
    const [newUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    // Build complete address
    const completeAddress = [
      data.street,
      data.number,
      data.complement,
      data.neighborhood,
      data.city,
      data.state,
      data.zipCode
    ].filter(Boolean).join(", ");

    // Create the client linked to the user
    const clientData = {
      userId: newUser.id,
      // Dados básicos da empresa
      companyName: data.companyName,
      legalName: data.legalName,
      cpfCnpj: data.cpfCnpj,
      
      // Endereço completo
      street: data.street,
      number: data.number,
      complement: data.complement,
      neighborhood: data.neighborhood,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      address: completeAddress, // Legacy field
      
      // Contatos
      contactPhone: data.contactPhone,
      whatsapp: data.whatsapp,
      email: data.email,
      website: data.website,
      
      // Senha para sistema (já hashada e salva no user)
      systemPassword: hashedPassword,
      
      // Campos legados para compatibilidade
      fullName: data.legalName, // Use legal name as full name
      primaryContactEmail: data.email,
      primaryContactPhone: data.contactPhone,
      phone: data.contactPhone, // Legacy
      
      // Informações adicionais
      businessSector: data.businessSector,
      generalNotes: data.generalNotes,
      status: "active",
    };

    await db.insert(clients).values(clientData);
    
    // Get the created client
    const [newClient] = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, newUser.id))
      .limit(1);

    return newClient;
  }
  */

  // Roles operations
  async getRoles(): Promise<UserRole[]> {
    const roles = await db.select().from(userRoles).orderBy(desc(userRoles.createdAt));
    
    // Parse permissions JSON for each role
    return roles.map(role => ({
      ...role,
      permissions: typeof role.permissions === 'string' 
        ? JSON.parse(role.permissions) 
        : role.permissions || []
    }));
  }

  async getRole(id: string): Promise<UserRole | undefined> {
    const [role] = await db.select().from(userRoles).where(eq(userRoles.id, id));
    return role;
  }

  async createRole(data: any): Promise<UserRole> {
    await db
      .insert(userRoles)
      .values({
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: JSON.stringify(data.permissions || []),
        isSystem: false,
        active: data.active,
      });
    
    // Get the newly created role
    const [newRole] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.name, data.name))
      .limit(1);
    
    return newRole;
  }

  async updateRole(id: string, data: any): Promise<UserRole> {
    await db
      .update(userRoles)
      .set({
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: JSON.stringify(data.permissions || []),
        active: data.active,
        updatedAt: new Date(),
      })
      .where(eq(userRoles.id, id));

    // Get the updated role
    const [updatedRole] = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.id, id))
      .limit(1);
    
    return updatedRole;
  }

  async deleteRole(id: string): Promise<void> {
    // Check if role is system role
    const role = await this.getRole(id);
    if (role?.isSystem) {
      throw new Error("Cannot delete system role");
    }
    
    await db.delete(userRoles).where(eq(userRoles.id, id));
  }

  // AI Settings operations
  async getAISettings(): Promise<AISettings> {
    const settings = await db.select().from(systemSettings);
    
    // Default AI settings
    const defaultSettings: AISettings = {
      chatGptApiKey: "",
      temperature: 0.7,
      maxTokens: 1000,
      model: "gpt-3.5-turbo",
      systemPrompt: "Você é um assistente útil e prestativo.",
    };

    // Parse existing settings
    const result: Partial<AISettings> = {};
    
    settings.forEach(setting => {
      switch (setting.settingKey) {
        case 'ai_chatgpt_api_key':
          result.chatGptApiKey = setting.settingValue || "";
          break;
        case 'ai_temperature':
          result.temperature = parseFloat(setting.settingValue || "0.7");
          break;
        case 'ai_max_tokens':
          result.maxTokens = parseInt(setting.settingValue || "1000");
          break;
        case 'ai_model':
          result.model = setting.settingValue as AISettings['model'] || "gpt-3.5-turbo";
          break;
        case 'ai_system_prompt':
          result.systemPrompt = setting.settingValue || "Você é um assistente útil e prestativo.";
          break;
      }
    });

    // Merge with defaults
    return { ...defaultSettings, ...result };
  }

  async saveAISettings(settings: AISettings): Promise<void> {
    // Save each setting individually
    await Promise.all([
      this.setSystemSetting('ai_chatgpt_api_key', settings.chatGptApiKey, 'string'),
      this.setSystemSetting('ai_temperature', settings.temperature.toString(), 'number'),
      this.setSystemSetting('ai_max_tokens', settings.maxTokens.toString(), 'number'),
      this.setSystemSetting('ai_model', settings.model, 'string'),
      this.setSystemSetting('ai_system_prompt', settings.systemPrompt, 'string'),
    ]);
  }

  // Client AI Settings operations
  async getClientAISettings(userId: string): Promise<{
    systemPrompt?: string | null;
    maxTokens?: number | null;
    temperature?: number | null;
  } | null> {
    try {
      const settings = await db.select().from(systemSettings).where(
        sql`${systemSettings.settingKey} LIKE CONCAT('client_ai_', ${userId}, '_%')`
      );

      if (settings.length === 0) {
        return null;
      }

      const result: {
        systemPrompt?: string | null;
        maxTokens?: number | null;
        temperature?: number | null;
      } = {};

      settings.forEach(setting => {
        const key = setting.settingKey.replace(`client_ai_${userId}_`, '');
        switch (key) {
          case 'system_prompt':
            result.systemPrompt = setting.settingValue;
            break;
          case 'max_tokens':
            result.maxTokens = setting.settingValue ? parseInt(setting.settingValue) : null;
            break;
          case 'temperature':
            result.temperature = setting.settingValue ? parseFloat(setting.settingValue) : null;
            break;
        }
      });

      return result;
    } catch (error) {
      console.error("Error getting client AI settings:", error);
      return null;
    }
  }

  async saveClientAISettings(userId: string, settings: {
    systemPrompt?: string | null;
    maxTokens?: number | null;
    temperature?: number | null;
  }): Promise<void> {
    try {
      // Save each setting individually
      const promises: Promise<SystemSetting>[] = [];

      if (settings.systemPrompt !== undefined) {
        promises.push(
          this.setSystemSetting(`client_ai_${userId}_system_prompt`, settings.systemPrompt || '', 'string')
        );
      }

      if (settings.maxTokens !== undefined) {
        promises.push(
          this.setSystemSetting(`client_ai_${userId}_max_tokens`, settings.maxTokens?.toString() || '', 'number')
        );
      }

      if (settings.temperature !== undefined) {
        promises.push(
          this.setSystemSetting(`client_ai_${userId}_temperature`, settings.temperature?.toString() || '', 'number')
        );
      }

      await Promise.all(promises);
    } catch (error) {
      console.error("Error saving client AI settings:", error);
      throw error;
    }
  }

  // AI Configurations operations (advanced)
  async getAIConfigurations(): Promise<AIConfiguration[]> {
    return await db.select().from(aiConfigurations).orderBy(desc(aiConfigurations.createdAt));
  }

  async getAIConfiguration(id: string): Promise<AIConfiguration | undefined> {
    const [config] = await db.select().from(aiConfigurations).where(eq(aiConfigurations.id, id));
    return config;
  }

  async getDefaultAIConfiguration(): Promise<AIConfiguration | undefined> {
    const [config] = await db
      .select()
      .from(aiConfigurations)
      .where(and(eq(aiConfigurations.isDefault, true), eq(aiConfigurations.isActive, true)))
      .limit(1);
    return config;
  }

  async createAIConfiguration(config: InsertAIConfiguration): Promise<AIConfiguration> {
    await db
      .insert(aiConfigurations)
      .values(config);
    
    // Get the newly created configuration
    const [newConfig] = await db
      .select()
      .from(aiConfigurations)
      .where(eq(aiConfigurations.name, config.name))
      .limit(1);
    
    return newConfig;
  }

  async updateAIConfiguration(id: string, config: Partial<InsertAIConfiguration>): Promise<AIConfiguration> {
    await db
      .update(aiConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(aiConfigurations.id, id));

    // Get the updated configuration
    const [updatedConfig] = await db
      .select()
      .from(aiConfigurations)
      .where(eq(aiConfigurations.id, id))
      .limit(1);
    
    return updatedConfig;
  }

  async deleteAIConfiguration(id: string): Promise<void> {
    // Check if it's the default configuration
    const config = await this.getAIConfiguration(id);
    if (config?.isDefault) {
      throw new Error("Cannot delete default AI configuration");
    }
    
    await db.delete(aiConfigurations).where(eq(aiConfigurations.id, id));
  }

  async setDefaultAIConfiguration(id: string): Promise<void> {
    // First, remove default flag from all configurations
    await db
      .update(aiConfigurations)
      .set({ isDefault: false, updatedAt: new Date() });

    // Then set the specified configuration as default
    await db
      .update(aiConfigurations)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(aiConfigurations.id, id));
  }

  // AI Usage operations
  async recordAIUsage(usage: InsertAIUsage): Promise<AIUsage> {
    try {
      // Insert the usage record
      await db.insert(aiUsage).values(usage);
      
      // Return a simulated record with the provided data
      return {
        id: crypto.randomUUID(),
        ...usage,
        createdAt: new Date(),
        updatedAt: new Date()
      } as AIUsage;
    } catch (error) {
      console.error('Error recording AI usage:', error);
      // Return a default record to avoid breaking the flow
      return {
        id: crypto.randomUUID(),
        ...usage,
        createdAt: new Date(),
        updatedAt: new Date()
      } as AIUsage;
    }
  }

  async getAIUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    requestsToday: number;
    requestsThisMonth: number;
    lastUsed: string | null;
  }> {
    // Get total tokens and cost
    const [totals] = await db
      .select({
        totalTokens: sum(aiUsage.totalTokens),
        totalCost: sum(aiUsage.cost),
      })
      .from(aiUsage)
      .where(eq(aiUsage.success, true));

    // Get requests today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayStats] = await db
      .select({ count: count() })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.success, true),
        sql`DATE(${aiUsage.createdAt}) = DATE(${today})`
      ));

    // Get requests this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const [monthStats] = await db
      .select({ count: count() })
      .from(aiUsage)
      .where(and(
        eq(aiUsage.success, true),
        sql`${aiUsage.createdAt} >= ${startOfMonth}`
      ));

    // Get last used
    const [lastUsed] = await db
      .select({ createdAt: aiUsage.createdAt })
      .from(aiUsage)
      .where(eq(aiUsage.success, true))
      .orderBy(desc(aiUsage.createdAt))
      .limit(1);

    return {
      totalTokens: Number(totals.totalTokens || 0),
      totalCost: Number(totals.totalCost || 0),
      requestsToday: todayStats.count,
      requestsThisMonth: monthStats.count,
      lastUsed: lastUsed?.createdAt?.toISOString() || null,
    };
  }

  async getAIUsageByUser(userId: string): Promise<AIUsage[]> {
    return await db
      .select()
      .from(aiUsage)
      .where(eq(aiUsage.userId, userId))
      .orderBy(desc(aiUsage.createdAt));
  }

  async getAIUsageByDateRange(startDate: Date, endDate: Date): Promise<AIUsage[]> {
    return await db
      .select()
      .from(aiUsage)
      .where(and(
        sql`${aiUsage.createdAt} >= ${startDate}`,
        sql`${aiUsage.createdAt} <= ${endDate}`
      ))
      .orderBy(desc(aiUsage.createdAt));
  }

  // WhatsApp API Settings operations
  async getWhatsappApiSettings(): Promise<WhatsappApiSettings | undefined> {
    await this.ensureWhatsappApiSettingsTable();
    const [settings] = await db
      .select()
      .from(whatsappApiSettings)
      .where(eq(whatsappApiSettings.isActive, true))
      .orderBy(desc(whatsappApiSettings.createdAt))
      .limit(1);
    return settings;
  }

  async saveWhatsappApiSettings(settings: WhatsappApiSettingsForm, userId: string): Promise<WhatsappApiSettings> {
    await this.ensureWhatsappApiSettingsTable();
    // Deactivate all existing settings first
    await db
      .update(whatsappApiSettings)
      .set({ isActive: false, updatedAt: new Date() });

    // Insert new settings
    await db
      .insert(whatsappApiSettings)
      .values({
        evolutionApiUrl: settings.evolutionApiUrl,
        globalToken: settings.globalToken,
        systemUrl: settings.systemUrl,
        isActive: settings.isActive,
        createdBy: userId,
      });

    // Get the newly inserted settings
    const [newSettings] = await db
      .select()
      .from(whatsappApiSettings)
      .where(eq(whatsappApiSettings.isActive, true))
      .orderBy(desc(whatsappApiSettings.createdAt))
      .limit(1);

    return newSettings;
  }

  async updateWhatsappApiSettings(id: string, settings: Partial<WhatsappApiSettingsForm>): Promise<WhatsappApiSettings> {
    await this.ensureWhatsappApiSettingsTable();
    await db
      .update(whatsappApiSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(whatsappApiSettings.id, id));

    // Get the updated settings
    const [updatedSettings] = await db
      .select()
      .from(whatsappApiSettings)
      .where(eq(whatsappApiSettings.id, id))
      .limit(1);

    return updatedSettings;
  }

  async deleteWhatsappApiSettings(id: string): Promise<void> {
    await this.ensureWhatsappApiSettingsTable();
    await db.delete(whatsappApiSettings).where(eq(whatsappApiSettings.id, id));
  }

  private async ensureWhatsappApiSettingsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS whatsapp_api_settings (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          evolution_api_url VARCHAR(500) NOT NULL,
          global_token VARCHAR(500) NOT NULL,
          system_url VARCHAR(255),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by VARCHAR(36),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_whatsapp_api_active (is_active),
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
    } catch (error: any) {
      if (error?.code !== 'ER_TABLE_EXISTS_ERROR') {
        // Log but don't crash; subsequent queries may still fail and surface meaningful errors
        console.error('Erro ao garantir tabela whatsapp_api_settings:', error);
      }
    }
  }

  // WhatsApp Instances operations
  async getWhatsappInstances(): Promise<WhatsappInstance[]> {
    return await db
      .select()
      .from(whatsappInstances)
      .orderBy(desc(whatsappInstances.createdAt));
  }

  async getWhatsappInstancesByClient(clientId: string): Promise<WhatsappInstance[]> {
    // Esta função agora é obsoleta, usar getWhatsappInstancesByFranchise
    return await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.franchiseId, clientId)) // clientId agora é franchiseId
      .orderBy(desc(whatsappInstances.createdAt));
  }

  async getWhatsappInstancesByFranchise(franchiseId: string): Promise<WhatsappInstance[]> {
    // Agora as instâncias pertencem diretamente à franquia
    return await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.franchiseId, franchiseId))
      .orderBy(desc(whatsappInstances.createdAt));
  }

  async getWhatsappInstance(id: string): Promise<WhatsappInstance | undefined> {
    const [instance] = await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.id, id));
    return instance;
  }

  async getWhatsappInstanceByKey(instanceKey: string): Promise<WhatsappInstance | undefined> {
    const [instance] = await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.instanceKey, instanceKey));
    return instance;
  }

  async createWhatsappInstance(instance: InsertWhatsappInstance): Promise<WhatsappInstance> {
    await db
      .insert(whatsappInstances)
      .values(instance);

    // Get the newly inserted instance
    const [newInstance] = await db
      .select()
      .from(whatsappInstances)
      .where(and(
        eq(whatsappInstances.franchiseId, instance.franchiseId),
        eq(whatsappInstances.instanceKey, instance.instanceKey)
      ))
      .orderBy(desc(whatsappInstances.createdAt))
      .limit(1);

    return newInstance;
  }

  async updateWhatsappInstance(id: string, instance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance> {
    await db
      .update(whatsappInstances)
      .set({ ...instance, updatedAt: new Date() })
      .where(eq(whatsappInstances.id, id));

    // Get the updated instance
    const [updatedInstance] = await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.id, id))
      .limit(1);

    return updatedInstance;
  }

  async deleteWhatsappInstance(id: string): Promise<void> {
    await db.delete(whatsappInstances).where(eq(whatsappInstances.id, id));
  }

  // Admin WhatsApp Instances operations
  async getAdminWhatsappInstances(): Promise<AdminWhatsappInstance[]> {
    await this.ensureAdminWhatsappInstancesTable();
    return await db
      .select()
      .from(adminWhatsappInstances)
      .orderBy(desc(adminWhatsappInstances.createdAt));
  }

  async getAdminWhatsappInstance(id: string): Promise<AdminWhatsappInstance | undefined> {
    await this.ensureAdminWhatsappInstancesTable();
    const [instance] = await db
      .select()
      .from(adminWhatsappInstances)
      .where(eq(adminWhatsappInstances.id, id));
    return instance;
  }

  async getAdminWhatsappInstanceByKey(instanceKey: string): Promise<AdminWhatsappInstance | undefined> {
    await this.ensureAdminWhatsappInstancesTable();
    const [instance] = await db
      .select()
      .from(adminWhatsappInstances)
      .where(eq(adminWhatsappInstances.instanceKey, instanceKey));
    return instance;
  }

  async createAdminWhatsappInstance(instance: InsertAdminWhatsappInstance): Promise<AdminWhatsappInstance> {
    await this.ensureAdminWhatsappInstancesTable();
    // MySQL may not support RETURNING; do a follow-up select by unique key
    await db
      .insert(adminWhatsappInstances)
      .values(instance);
    
    const [inserted] = await db
      .select()
      .from(adminWhatsappInstances)
      .where(eq(adminWhatsappInstances.instanceKey, instance.instanceKey))
      .limit(1);
    
    return inserted;
  }

  async updateAdminWhatsappInstance(id: string, instance: Partial<InsertAdminWhatsappInstance>): Promise<AdminWhatsappInstance> {
    await this.ensureAdminWhatsappInstancesTable();
    await db
      .update(adminWhatsappInstances)
      .set({ ...instance, updatedAt: new Date() })
      .where(eq(adminWhatsappInstances.id, id));

    const [updated] = await db
      .select()
      .from(adminWhatsappInstances)
      .where(eq(adminWhatsappInstances.id, id))
      .limit(1);

    return updated;
  }

  async deleteAdminWhatsappInstance(id: string): Promise<void> {
    await this.ensureAdminWhatsappInstancesTable();
    await db.delete(adminWhatsappInstances).where(eq(adminWhatsappInstances.id, id));
  }

  private async ensureAdminWhatsappInstancesTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS admin_whatsapp_instances (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
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
          INDEX idx_admin_whatsapp_instances_status (status),
          INDEX idx_admin_whatsapp_instances_active (is_active)
        )
      `);
    } catch (error: any) {
      if (error?.code !== 'ER_TABLE_EXISTS_ERROR') {
        // Log but don't crash; subsequent queries may still fail and surface meaningful errors
        console.error('Erro ao garantir tabela admin_whatsapp_instances:', error);
      }
    }
  }

  // ========================================
  // FRANCHISE SYSTEM METHODS
  // ========================================

  // Plans operations
  async getAllPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(desc(plans.createdAt));
  }

  async getPlan(id: string): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async getPlans(): Promise<Plan[]> {
    return await db.select().from(plans).orderBy(plans.name);
  }

  async createPlan(planData: CreatePlan): Promise<Plan> {
    await db
      .insert(plans)
      .values(planData);
    
    // Fetch the created plan by name since MySQL generates UUID for id
    const [newPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.name, planData.name))
      .orderBy(desc(plans.createdAt))
      .limit(1);
      
    return newPlan;
  }

  async updatePlan(id: string, planData: Partial<CreatePlan>): Promise<Plan> {
    await db
      .update(plans)
      .set(planData)
      .where(eq(plans.id, id));
    
    // Fetch the updated plan since MySQL doesn't support returning
    const [updatedPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1);
      
    return updatedPlan;
  }

  async deletePlan(id: string): Promise<void> {
    await db.delete(plans).where(eq(plans.id, id));
  }

  // Franchisors operations
  async getAllFranchisors(): Promise<any[]> {
    const franchisorsData = await db
      .select({
        id: franchisors.id,
        companyName: franchisors.companyName,
        email: franchisors.email,
        status: franchisors.status,
        planName: plans.name,
        planStartDate: franchisors.planStartDate,
        planEndDate: franchisors.planEndDate,
        createdAt: franchisors.createdAt,
      })
      .from(franchisors)
      .leftJoin(plans, eq(franchisors.planId, plans.id))
      .orderBy(desc(franchisors.createdAt));

    // Get franchise count for each franchisor
    const franchisorsWithCount = await Promise.all(
      franchisorsData.map(async (franchisor) => {
        const [franchiseCount] = await db
          .select({ count: count() })
          .from(franchises)
          .where(eq(franchises.franchisorId, franchisor.id));
        
        return {
          ...franchisor,
          franchiseCount: franchiseCount.count,
        };
      })
    );

    return franchisorsWithCount;
  }

  async getFranchisor(id: string): Promise<Franchisor | undefined> {
    const [franchisor] = await db.select().from(franchisors).where(eq(franchisors.id, id));
    return franchisor;
  }

  async getFranchisorByUserId(userId: string): Promise<Franchisor | undefined> {
    const [franchisor] = await db.select().from(franchisors).where(eq(franchisors.userId, userId));
    return franchisor;
  }

  async createFranchisor(franchisorData: CreateFranchisor): Promise<Franchisor> {
    try {
      const bcrypt = await import('bcrypt');
      
      // Check if email already exists
      const existingUser = await this.getUserByEmail(franchisorData.email);
      if (existingUser) {
        throw new Error('Email já está em uso');
      }
      
      // Create user first
      const hashedPassword = await bcrypt.hash(franchisorData.password, 10);
      const userId = crypto.randomUUID();
      await db
        .insert(users)
        .values({
          id: userId,
          email: franchisorData.email,
          firstName: franchisorData.firstName,
          lastName: franchisorData.lastName,
          phone: franchisorData.phone,
          password: hashedPassword,
          role: 'franchisor',
          active: true,
        });

      const newUser = await this.getUser(userId);
      if (!newUser) {
        throw new Error('Erro ao criar usuário');
      }

      // Create franchisor
      const franchisorId = crypto.randomUUID();
      await db
        .insert(franchisors)
        .values({
          id: franchisorId,
          userId: newUser.id,
          planId: franchisorData.planId,
          companyName: franchisorData.companyName,
          legalName: franchisorData.legalName,
          cnpj: franchisorData.cnpj,
          street: franchisorData.street,
          number: franchisorData.number,
          complement: franchisorData.complement,
          neighborhood: franchisorData.neighborhood,
          city: franchisorData.city,
          state: franchisorData.state,
          zipCode: franchisorData.zipCode,
          contactPhone: franchisorData.contactPhone,
          email: franchisorData.email,
          website: franchisorData.website,
          planStartDate: new Date(franchisorData.planStartDate),
          planEndDate: franchisorData.planEndDate ? new Date(franchisorData.planEndDate) : null,
        });

      const newFranchisor = await this.getFranchisor(franchisorId);
      if (!newFranchisor) {
        throw new Error('Erro ao criar franqueador');
      }

      return newFranchisor;
    } catch (error) {
      console.error('Erro ao criar franqueador:', error);
      throw error;
    }
  }

  async updateFranchisor(id: string, franchisorData: Partial<CreateFranchisor>): Promise<Franchisor> {
    try {
      // Update user if user data is provided
      if (franchisorData.firstName || franchisorData.lastName || franchisorData.email || franchisorData.phone) {
        const franchisor = await this.getFranchisor(id);
        if (!franchisor) {
          throw new Error('Franqueador não encontrado');
        }

        const userUpdateData: any = {};
        if (franchisorData.firstName) userUpdateData.firstName = franchisorData.firstName;
        if (franchisorData.lastName) userUpdateData.lastName = franchisorData.lastName;
        if (franchisorData.email) userUpdateData.email = franchisorData.email;
        if (franchisorData.phone) userUpdateData.phone = franchisorData.phone;

        if (Object.keys(userUpdateData).length > 0) {
          await db
            .update(users)
            .set(userUpdateData)
            .where(eq(users.id, franchisor.userId));
        }
      }

      // Update franchisor data
      const franchisorUpdateData: any = {};
      if (franchisorData.planId) franchisorUpdateData.planId = franchisorData.planId;
      if (franchisorData.companyName) franchisorUpdateData.companyName = franchisorData.companyName;
      if (franchisorData.legalName) franchisorUpdateData.legalName = franchisorData.legalName;
      if (franchisorData.cnpj) franchisorUpdateData.cnpj = franchisorData.cnpj;
      if (franchisorData.street) franchisorUpdateData.street = franchisorData.street;
      if (franchisorData.number) franchisorUpdateData.number = franchisorData.number;
      if (franchisorData.complement !== undefined) franchisorUpdateData.complement = franchisorData.complement;
      if (franchisorData.neighborhood) franchisorUpdateData.neighborhood = franchisorData.neighborhood;
      if (franchisorData.city) franchisorUpdateData.city = franchisorData.city;
      if (franchisorData.state) franchisorUpdateData.state = franchisorData.state;
      if (franchisorData.zipCode) franchisorUpdateData.zipCode = franchisorData.zipCode;
      if (franchisorData.contactPhone) franchisorUpdateData.contactPhone = franchisorData.contactPhone;
      if (franchisorData.email) franchisorUpdateData.email = franchisorData.email;
      if (franchisorData.website !== undefined) franchisorUpdateData.website = franchisorData.website;
      if (franchisorData.planStartDate) franchisorUpdateData.planStartDate = new Date(franchisorData.planStartDate);
      if (franchisorData.planEndDate) franchisorUpdateData.planEndDate = franchisorData.planEndDate ? new Date(franchisorData.planEndDate) : null;

      if (Object.keys(franchisorUpdateData).length > 0) {
        await db
          .update(franchisors)
          .set(franchisorUpdateData)
          .where(eq(franchisors.id, id));
      }

      const updatedFranchisor = await this.getFranchisor(id);
      if (!updatedFranchisor) {
        throw new Error('Erro ao recuperar franqueador atualizado');
      }

      return updatedFranchisor;
    } catch (error) {
      console.error('Erro ao atualizar franqueador:', error);
      throw error;
    }
  }

  async deleteFranchisor(id: string): Promise<void> {
    try {
      const franchisor = await this.getFranchisor(id);
      if (!franchisor) {
        throw new Error('Franqueador não encontrado');
      }

      // Delete franchisor first (due to foreign key constraints)
      await db.delete(franchisors).where(eq(franchisors.id, id));
      
      // Delete associated user
      await db.delete(users).where(eq(users.id, franchisor.userId));
    } catch (error) {
      console.error('Erro ao excluir franqueador:', error);
      throw error;
    }
  }

  // Franchises operations
  async getFranchisesByFranchisorId(franchisorId: string): Promise<any[]> {
    return await db
      .select({
        id: franchises.id,
        franchiseName: franchises.franchiseName,
        franchiseCode: franchises.franchiseCode,
        email: franchises.email,
        status: franchises.status,
        managerName: franchises.managerName,
        city: franchises.city,
        state: franchises.state,
        createdAt: franchises.createdAt,
      })
      .from(franchises)
      .where(eq(franchises.franchisorId, franchisorId))
      .orderBy(desc(franchises.createdAt));
  }

  async getFranchise(id: string): Promise<Franchise | undefined> {
    const [franchise] = await db.select().from(franchises).where(eq(franchises.id, id));
    return franchise;
  }

  async getFranchiseByUserId(userId: string): Promise<Franchise | undefined> {
    const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));
    return franchise;
  }

  async createFranchise(franchisorId: string, franchiseData: CreateFranchise): Promise<Franchise> {
    const bcrypt = await import('bcrypt');
    
    try {
      // Create user first
      const hashedPassword = await bcrypt.hash(franchiseData.password, 10);
      await db
        .insert(users)
        .values({
          email: franchiseData.email,
          firstName: franchiseData.firstName,
          lastName: franchiseData.lastName,
          phone: franchiseData.phone,
          password: hashedPassword,
          role: 'franchise',
          active: true,
        });

      // Get the newly created user
      const [newUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, franchiseData.email))
        .orderBy(desc(users.createdAt))
        .limit(1);

      if (!newUser) {
        throw new Error('Falha ao criar usuário da franquia');
      }

      // Create franchise
      await db
        .insert(franchises)
        .values({
          franchisorId: franchisorId,
          userId: newUser.id,
          franchiseName: franchiseData.franchiseName,
          franchiseCode: franchiseData.franchiseCode,
          street: franchiseData.street,
          number: franchiseData.number,
          complement: franchiseData.complement,
          neighborhood: franchiseData.neighborhood,
          city: franchiseData.city,
          state: franchiseData.state,
          zipCode: franchiseData.zipCode,
          contactPhone: franchiseData.contactPhone,
          email: franchiseData.email,
          managerName: franchiseData.managerName,
          managerPhone: franchiseData.managerPhone,
          managerEmail: franchiseData.managerEmail,
        });

      // Get the newly created franchise
      const [newFranchise] = await db
        .select()
        .from(franchises)
        .where(eq(franchises.userId, newUser.id))
        .orderBy(desc(franchises.createdAt))
        .limit(1);

      if (!newFranchise) {
        throw new Error('Falha ao criar franquia');
      }

      return newFranchise;
    } catch (error) {
      console.error('Erro ao criar franquia:', error);
      throw error;
    }
  }

  // Franchise Phone Numbers operations
  async getFranchisePhoneNumbers(franchiseId: string): Promise<FranchisePhoneNumber[]> {
    return await db
      .select()
      .from(franchisePhoneNumbers)
      .where(eq(franchisePhoneNumbers.franchiseId, franchiseId))
      .orderBy(desc(franchisePhoneNumbers.isPrimary), desc(franchisePhoneNumbers.createdAt));
  }

  async createFranchisePhoneNumber(franchiseId: string, phoneData: CreateFranchisePhoneNumber): Promise<FranchisePhoneNumber> {
    // Enforce plan limit: maxPhoneNumbers per franchise
    const [franchise] = await db.select().from(franchises).where(eq(franchises.id, franchiseId)).limit(1);
    if (!franchise) {
      throw new Error('Franquia não encontrada');
    }
    const [franchisor] = await db.select().from(franchisors).where(eq(franchisors.id, franchise.franchisorId)).limit(1);
    if (!franchisor) {
      throw new Error('Franqueador não encontrado');
    }
    const [plan] = await db.select().from(plans).where(eq(plans.id, franchisor.planId)).limit(1);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }
    const [currentCountRow] = await db
      .select({ value: count() })
      .from(franchisePhoneNumbers)
      .where(eq(franchisePhoneNumbers.franchiseId, franchiseId));
    const currentCount = Number(currentCountRow?.value || 0);
    if (currentCount >= Number(plan.maxPhoneNumbers)) {
      throw new Error(`Limite de números de telefone atingido para esta franquia (${plan.maxPhoneNumbers}).`);
    }

    await db
      .insert(franchisePhoneNumbers)
      .values({
        franchiseId: franchiseId,
        phoneNumber: phoneData.phoneNumber,
        isPrimary: phoneData.isPrimary,
        isActive: true,
      });

    // Get the newly created phone number
    const [newPhoneNumber] = await db
      .select()
      .from(franchisePhoneNumbers)
      .where(and(
        eq(franchisePhoneNumbers.franchiseId, franchiseId),
        eq(franchisePhoneNumbers.phoneNumber, phoneData.phoneNumber)
      ))
      .orderBy(desc(franchisePhoneNumbers.createdAt))
      .limit(1);

    return newPhoneNumber;
  }

  // Franchise Agents operations
  async getFranchiseAgents(franchiseId: string): Promise<FranchiseAgent[]> {
    return await db
      .select()
      .from(franchiseAgents)
      .where(eq(franchiseAgents.franchiseId, franchiseId))
      .orderBy(desc(franchiseAgents.createdAt));
  }

  async createFranchiseAgent(franchiseId: string, agentData: CreateFranchiseAgent): Promise<FranchiseAgent> {
    // Enforce plan limit: maxAgents per franchise
    const [franchise] = await db.select().from(franchises).where(eq(franchises.id, franchiseId)).limit(1);
    if (!franchise) {
      throw new Error('Franquia não encontrada');
    }
    const [franchisor] = await db.select().from(franchisors).where(eq(franchisors.id, franchise.franchisorId)).limit(1);
    if (!franchisor) {
      throw new Error('Franqueador não encontrado');
    }
    const [plan] = await db.select().from(plans).where(eq(plans.id, franchisor.planId)).limit(1);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }
    const [currentCountRow] = await db
      .select({ value: count() })
      .from(franchiseAgents)
      .where(eq(franchiseAgents.franchiseId, franchiseId));
    const currentCount = Number(currentCountRow?.value || 0);
    if (currentCount >= Number(plan.maxAgents)) {
      throw new Error(`Limite de agentes atingido para esta franquia (${plan.maxAgents}).`);
    }

    await db
      .insert(franchiseAgents)
      .values({
        franchiseId: franchiseId,
        name: agentData.name,
        email: agentData.email,
        phone: agentData.phone,
        department: agentData.department,
        specialties: JSON.stringify(agentData.specialties),
        isActive: true,
      });

    // Get the newly created agent
    const [newAgent] = await db
      .select()
      .from(franchiseAgents)
      .where(and(
        eq(franchiseAgents.franchiseId, franchiseId),
        eq(franchiseAgents.name, agentData.name)
      ))
      .orderBy(desc(franchiseAgents.createdAt))
      .limit(1);

    return newAgent;
  }

  // Franchise Prompts operations
  async getFranchisePrompts(franchiseId: string): Promise<FranchisePrompt[]> {
    return await db
      .select()
      .from(franchisePrompts)
      .where(eq(franchisePrompts.franchiseId, franchiseId))
      .orderBy(desc(franchisePrompts.isDefault), desc(franchisePrompts.createdAt));
  }

  async createFranchisePrompt(franchiseId: string, promptData: CreateFranchisePrompt): Promise<FranchisePrompt> {
    // Enforce plan limit: maxPrompts per franchise
    const [franchise] = await db.select().from(franchises).where(eq(franchises.id, franchiseId)).limit(1);
    if (!franchise) {
      throw new Error('Franquia não encontrada');
    }
    const [franchisor] = await db.select().from(franchisors).where(eq(franchisors.id, franchise.franchisorId)).limit(1);
    if (!franchisor) {
      throw new Error('Franqueador não encontrado');
    }
    const [plan] = await db.select().from(plans).where(eq(plans.id, franchisor.planId)).limit(1);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }
    const [currentCountRow] = await db
      .select({ value: count() })
      .from(franchisePrompts)
      .where(eq(franchisePrompts.franchiseId, franchiseId));
    const currentCount = Number(currentCountRow?.value || 0);
    if (currentCount >= Number(plan.maxPrompts)) {
      throw new Error(`Limite de prompts atingido para esta franquia (${plan.maxPrompts}).`);
    }

    await db
      .insert(franchisePrompts)
      .values({
        franchiseId: franchiseId,
        name: promptData.name,
        description: promptData.description,
        prompt: promptData.prompt,
        category: promptData.category,
        isDefault: promptData.isDefault,
        isActive: true,
      });

    // Get the newly created prompt
    const [newPrompt] = await db
      .select()
      .from(franchisePrompts)
      .where(and(
        eq(franchisePrompts.franchiseId, franchiseId),
        eq(franchisePrompts.name, promptData.name)
      ))
      .orderBy(desc(franchisePrompts.createdAt))
      .limit(1);

    return newPrompt;
  }

  async updateFranchise(id: string, franchiseData: Partial<CreateFranchise>): Promise<Franchise> {
    try {
      const franchise = await this.getFranchise(id);
      if (!franchise) {
        throw new Error('Franquia não encontrada');
      }

      // If password is being updated, hash it
      const updateData: any = { ...franchiseData };
      if (franchiseData.password) {
        const bcrypt = await import('bcrypt');
        updateData.password = await bcrypt.hash(franchiseData.password, 10);
      }

      // Update user first if user-related fields are provided
      const userFields = ['firstName', 'lastName', 'email', 'phone', 'password'];
      const userUpdates: any = {};
      let hasUserUpdates = false;

      userFields.forEach(field => {
        if (updateData[field] !== undefined) {
          userUpdates[field] = updateData[field];
          hasUserUpdates = true;
          delete updateData[field];
        }
      });

      if (hasUserUpdates) {
        await db
          .update(users)
          .set({ ...userUpdates, updatedAt: new Date() })
          .where(eq(users.id, franchise.userId));
      }

      // Update franchise
      await db
        .update(franchises)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(franchises.id, id));

      // Get the updated franchise
      const [updatedFranchise] = await db
        .select()
        .from(franchises)
        .where(eq(franchises.id, id))
        .limit(1);

      return updatedFranchise;
    } catch (error) {
      console.error('Erro ao atualizar franquia:', error);
      throw error;
    }
  }

  async deleteFranchise(id: string): Promise<void> {
    try {
      const franchise = await this.getFranchise(id);
      if (!franchise) {
        throw new Error('Franquia não encontrada');
      }

      // Delete franchise-related data first (due to foreign key constraints)
      await db.delete(franchisePhoneNumbers).where(eq(franchisePhoneNumbers.franchiseId, id));
      await db.delete(franchiseAgents).where(eq(franchiseAgents.franchiseId, id));
      await db.delete(franchisePrompts).where(eq(franchisePrompts.franchiseId, id));
      
      // Delete franchise
      await db.delete(franchises).where(eq(franchises.id, id));
      
      // Delete associated user
      await db.delete(users).where(eq(users.id, franchise.userId));
    } catch (error) {
      console.error('Erro ao excluir franquia:', error);
      throw error;
    }
  }

  // WhatsApp Conversations operations
  async getWhatsappConversationsByInstance(instanceId: string): Promise<WhatsappConversation[]> {
    return await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.instanceId, instanceId))
      .orderBy(desc(whatsappConversations.lastMessageAt));
  }

  async createWhatsappConversation(conversation: InsertWhatsappConversation): Promise<WhatsappConversation> {
    try {
      await db
        .insert(whatsappConversations)
        .values({
          ...conversation,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      // Get the newly created conversation
      const [newConversation] = await db
        .select()
        .from(whatsappConversations)
        .where(and(
          eq(whatsappConversations.instanceId, conversation.instanceId),
          eq(whatsappConversations.chatId, conversation.chatId)
        ))
        .orderBy(desc(whatsappConversations.createdAt))
        .limit(1);

      return newConversation;
    } catch (error: any) {
      // If duplicate, update instead
      if (error.code === 'ER_DUP_ENTRY') {
        const updated = await this.updateWhatsappConversationByChatId(
          conversation.instanceId!,
          conversation.chatId!,
          {
            contactName: conversation.contactName,
            lastMessage: conversation.lastMessage,
            lastMessageAt: conversation.lastMessageAt,
            status: conversation.status,
            updatedAt: new Date()
          }
        );
        return updated;
      }
      throw error;
    }
  }

  async updateWhatsappConversation(id: string, conversation: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation> {
    await db
      .update(whatsappConversations)
      .set({ ...conversation, updatedAt: new Date() })
      .where(eq(whatsappConversations.id, id));

    // Get the updated conversation
    const [updatedConversation] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.id, id))
      .limit(1);

    return updatedConversation;
  }

  async updateWhatsappConversationByChatId(instanceId: string, chatId: string, conversation: Partial<InsertWhatsappConversation>): Promise<WhatsappConversation> {
    await db
      .update(whatsappConversations)
      .set({ ...conversation, updatedAt: new Date() })
      .where(
        and(
          eq(whatsappConversations.instanceId, instanceId),
          eq(whatsappConversations.chatId, chatId)
        )
      );

    // Get the updated conversation
    const [updatedConversation] = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.instanceId, instanceId),
          eq(whatsappConversations.chatId, chatId)
        )
      )
      .limit(1);

    return updatedConversation;
  }

  async getWhatsappConversationById(id: string): Promise<WhatsappConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.id, id));
    return conversation;
  }

  async getWhatsappConversationByChatId(instanceId: string, chatId: string): Promise<WhatsappConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(and(
        eq(whatsappConversations.instanceId, instanceId),
        eq(whatsappConversations.chatId, chatId)
      ));

    return conversation;
  }

  async getWhatsappConversationsByClient(clientId: string, filters?: {
    search?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<WhatsappConversation[]> {
    // Base query
    let query = db
      .select()
      .from(whatsappConversations)
      .innerJoin(whatsappInstances, eq(whatsappConversations.instanceId, whatsappInstances.id))
      .where(eq(whatsappInstances.franchiseId, clientId));

    // Build conditions array
    const conditions = [eq(whatsappInstances.franchiseId, clientId)];

    // Apply search filter (busca por nome do contato ou telefone)
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          like(whatsappConversations.contactName, searchTerm),
          like(whatsappConversations.phoneNumber, searchTerm)
        )
      );
    }

    // Apply date range filter
    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        between(whatsappConversations.lastMessageAt, filters.startDate, filters.endDate)
      );
    } else if (filters?.startDate) {
      conditions.push(gte(whatsappConversations.lastMessageAt, filters.startDate));
    } else if (filters?.endDate) {
      conditions.push(lte(whatsappConversations.lastMessageAt, filters.endDate));
    }

    // Execute query with conditions
    const results = await db
      .select({
        id: whatsappConversations.id,
        instanceId: whatsappConversations.instanceId,
        chatId: whatsappConversations.chatId,
        phoneNumber: whatsappConversations.phoneNumber,
        contactName: whatsappConversations.contactName,
        lastMessage: whatsappConversations.lastMessage,
        lastMessageAt: whatsappConversations.lastMessageAt,
        unreadCount: whatsappConversations.unreadCount,
        isGroup: whatsappConversations.isGroup,
        groupName: whatsappConversations.groupName,
        status: whatsappConversations.status,
        createdAt: whatsappConversations.createdAt,
        updatedAt: whatsappConversations.updatedAt,
      })
      .from(whatsappConversations)
      .innerJoin(whatsappInstances, eq(whatsappConversations.instanceId, whatsappInstances.id))
      .where(and(...conditions))
      .orderBy(desc(whatsappConversations.lastMessageAt));

    return results;
  }

  async createWhatsappMessage(message: InsertWhatsappMessage): Promise<WhatsappMessage> {
    await db
      .insert(whatsappMessages)
      .values(message);
    
    // Get the newly created message
    const [newMessage] = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.messageId, message.messageId || ''))
      .limit(1);

    return newMessage;
  }

  async getWhatsappMessagesByConversation(conversationId: string): Promise<WhatsappMessage[]> {
    return await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.conversationId, conversationId))
      .orderBy(asc(whatsappMessages.timestamp));
  }

  // Agent Conversation Context operations
  async addToAgentContext(context: InsertAgentConversationContext): Promise<void> {
    await db.insert(agentConversationContext).values(context);
    
    // Automatically cleanup to maintain only last 100 messages
    await this.cleanupAgentContext(context.conversationId, context.agentId, 100);
  }

  async getAgentContext(conversationId: string, agentId: string, limit: number = 100): Promise<AgentConversationContext[]> {
    return await db
      .select()
      .from(agentConversationContext)
      .where(
        and(
          eq(agentConversationContext.conversationId, conversationId),
          eq(agentConversationContext.agentId, agentId)
        )
      )
      .orderBy(desc(agentConversationContext.messageOrder))
      .limit(limit);
  }

  async cleanupAgentContext(conversationId: string, agentId: string, maxMessages: number = 100): Promise<void> {
    // Get total count of messages for this conversation and agent
    const [countResult] = await db
      .select({ count: count() })
      .from(agentConversationContext)
      .where(
        and(
          eq(agentConversationContext.conversationId, conversationId),
          eq(agentConversationContext.agentId, agentId)
        )
      );
    
    const totalMessages = countResult.count;
    
    if (totalMessages > maxMessages) {
      // Get the oldest messages to delete
      const messagesToDelete = totalMessages - maxMessages;
      
      const oldestMessages = await db
        .select({ id: agentConversationContext.id })
        .from(agentConversationContext)
        .where(
          and(
            eq(agentConversationContext.conversationId, conversationId),
            eq(agentConversationContext.agentId, agentId)
          )
        )
        .orderBy(asc(agentConversationContext.messageOrder))
        .limit(messagesToDelete);
      
      if (oldestMessages.length > 0) {
        const idsToDelete = oldestMessages.map(msg => msg.id);
        await db
          .delete(agentConversationContext)
          .where(
            and(
              eq(agentConversationContext.conversationId, conversationId),
              eq(agentConversationContext.agentId, agentId),
              sql`${agentConversationContext.id} IN (${idsToDelete.map(() => '?').join(',')})`
            )
          );
      }
    }
  }

  async updateConversationStatus(id: string, status: string): Promise<WhatsappConversation> {
    await db
      .update(whatsappConversations)
      .set({ status, updatedAt: new Date() })
      .where(eq(whatsappConversations.id, id));

    // Get the updated conversation
    const [updatedConversation] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.id, id))
      .limit(1);

    return updatedConversation;
  }

  // Global Prompts operations
  async getGlobalPrompts(franchisorId: string): Promise<GlobalPrompt[]> {
    return await db
      .select()
      .from(globalPrompts)
      .where(eq(globalPrompts.franchisorId, franchisorId))
      .orderBy(desc(globalPrompts.isDefault), desc(globalPrompts.createdAt));
  }

  async createGlobalPrompt(franchisorId: string, promptData: CreateGlobalPrompt): Promise<GlobalPrompt> {
    await db
      .insert(globalPrompts)
      .values({
        franchisorId: franchisorId,
        name: promptData.name,
        description: promptData.description,
        prompt: promptData.prompt,
        temperature: promptData.temperature.toString(),
        category: promptData.category,
        isDefault: promptData.isDefault,
        isActive: true,
      });

    // Get the newly created prompt
    const [newPrompt] = await db
      .select()
      .from(globalPrompts)
      .where(and(
        eq(globalPrompts.franchisorId, franchisorId),
        eq(globalPrompts.name, promptData.name)
      ))
      .orderBy(desc(globalPrompts.createdAt))
      .limit(1);

    return newPrompt;
  }

  async updateGlobalPrompt(id: string, promptData: Partial<CreateGlobalPrompt>): Promise<GlobalPrompt> {
    const updateData: any = { ...promptData, updatedAt: new Date() };
    if (promptData.temperature !== undefined) {
      updateData.temperature = promptData.temperature.toString();
    }

    await db
      .update(globalPrompts)
      .set(updateData)
      .where(eq(globalPrompts.id, id));

    // Get the updated prompt
    const [updatedPrompt] = await db
      .select()
      .from(globalPrompts)
      .where(eq(globalPrompts.id, id))
      .limit(1);

    return updatedPrompt;
  }

  async deleteGlobalPrompt(id: string): Promise<void> {
    await db.delete(globalPrompts).where(eq(globalPrompts.id, id));
  }

  async getGlobalPromptById(id: string): Promise<GlobalPrompt | undefined> {
    const [prompt] = await db
      .select()
      .from(globalPrompts)
      .where(eq(globalPrompts.id, id))
      .limit(1);
    
    return prompt;
  }

  async testGlobalPrompt(id: string, testMessage: string): Promise<{success: boolean, response?: string, error?: string}> {
    try {
      // Get the prompt details
      const [prompt] = await db
        .select()
        .from(globalPrompts)
        .where(eq(globalPrompts.id, id))
        .limit(1);

      if (!prompt) {
        return {
          success: false,
          error: "Prompt não encontrado"
        };
      }

      // Get AI settings
      const aiSettings = await this.getAISettings();
      
      // For testing purposes, return a simulated response if no API key is configured
      if (!aiSettings.chatGptApiKey) {
        return {
          success: true,
          response: `[SIMULAÇÃO] Resposta simulada usando o prompt "${prompt.name}" com temperatura ${prompt.temperature}:\n\nEste é um exemplo de como o agente responderia à mensagem: "${testMessage}"\n\nO prompt utilizado: "${prompt.prompt.substring(0, 100)}..."`
        };
      }

      // Test with OpenAI
      const { openaiService } = await import("./openai");
      const result = await openaiService.chat(testMessage, {
        ...aiSettings,
        temperature: Number(prompt.temperature),
        systemPrompt: prompt.prompt
      }, 'test-user');

      if (result.success) {
        return {
          success: true,
          response: result.response
        };
      } else {
        return {
          success: false,
          error: result.error || "Falha ao gerar resposta"
        };
      }
    } catch (error: any) {
      console.error("Error testing global prompt:", error);
      return {
        success: false,
        error: error.message || "Erro interno do servidor"
      };
    }
  }

  // WhatsApp Agents operations
  async getWhatsappAgents(): Promise<WhatsappAgent[]> {
    await this.ensureWhatsappAgentsTable();
    return await db
      .select()
      .from(whatsappAgents)
      .orderBy(desc(whatsappAgents.createdAt));
  }

  async getWhatsappAgent(id: string): Promise<WhatsappAgent | undefined> {
    await this.ensureWhatsappAgentsTable();
    const [agent] = await db
      .select()
      .from(whatsappAgents)
      .where(eq(whatsappAgents.id, id));
    
    return agent;
  }

  async createWhatsappAgent(agentData: InsertWhatsappAgent): Promise<WhatsappAgent> {
    await this.ensureWhatsappAgentsTable();
    await db
      .insert(whatsappAgents)
      .values(agentData);
    
    const [inserted] = await db
      .select()
      .from(whatsappAgents)
      .where(eq(whatsappAgents.name, agentData.name))
      .orderBy(desc(whatsappAgents.createdAt))
      .limit(1);
    
    return inserted;
  }

  async updateWhatsappAgent(id: string, agentData: Partial<InsertWhatsappAgent>): Promise<WhatsappAgent> {
    await this.ensureWhatsappAgentsTable();
    await db
      .update(whatsappAgents)
      .set({ ...agentData, updatedAt: new Date() })
      .where(eq(whatsappAgents.id, id));

    const [updated] = await db
      .select()
      .from(whatsappAgents)
      .where(eq(whatsappAgents.id, id))
      .limit(1);

    return updated;
  }

  async deleteWhatsappAgent(id: string): Promise<void> {
    await this.ensureWhatsappAgentsTable();
    await db.delete(whatsappAgents).where(eq(whatsappAgents.id, id));
  }

  // WhatsApp Instance Agent Bindings operations
  async getWhatsappInstanceAgentBindings(): Promise<WhatsappInstanceAgentBinding[]> {
    await this.ensureWhatsappInstanceAgentBindingsTable();
    return await db
      .select()
      .from(whatsappInstanceAgentBindings)
      .orderBy(desc(whatsappInstanceAgentBindings.createdAt));
  }

  async createWhatsappInstanceAgentBinding(bindingData: InsertWhatsappInstanceAgentBinding): Promise<WhatsappInstanceAgentBinding> {
    await this.ensureWhatsappInstanceAgentBindingsTable();
    await db
      .insert(whatsappInstanceAgentBindings)
      .values(bindingData);
    
    const [inserted] = await db
      .select()
      .from(whatsappInstanceAgentBindings)
      .where(and(
        eq(whatsappInstanceAgentBindings.instanceId, bindingData.instanceId),
        eq(whatsappInstanceAgentBindings.agentId, bindingData.agentId)
      ))
      .orderBy(desc(whatsappInstanceAgentBindings.createdAt))
      .limit(1);
    
    return inserted;
  }

  async updateWhatsappInstanceAgentBinding(id: string, bindingData: Partial<InsertWhatsappInstanceAgentBinding>): Promise<WhatsappInstanceAgentBinding> {
    await this.ensureWhatsappInstanceAgentBindingsTable();
    await db
      .update(whatsappInstanceAgentBindings)
      .set({ ...bindingData, updatedAt: new Date() })
      .where(eq(whatsappInstanceAgentBindings.id, id));

    const [updated] = await db
      .select()
      .from(whatsappInstanceAgentBindings)
      .where(eq(whatsappInstanceAgentBindings.id, id))
      .limit(1);

    return updated;
  }

  async deleteWhatsappInstanceAgentBinding(id: string): Promise<void> {
    await this.ensureWhatsappInstanceAgentBindingsTable();
    await db.delete(whatsappInstanceAgentBindings).where(eq(whatsappInstanceAgentBindings.id, id));
  }

  async toggleWhatsappInstanceAgentBinding(id: string): Promise<WhatsappInstanceAgentBinding> {
    await this.ensureWhatsappInstanceAgentBindingsTable();
    
    // Get current binding
    const [currentBinding] = await db
      .select()
      .from(whatsappInstanceAgentBindings)
      .where(eq(whatsappInstanceAgentBindings.id, id));

    if (!currentBinding) {
      throw new Error('Binding not found');
    }

    // Toggle the isActive status
    await db
      .update(whatsappInstanceAgentBindings)
      .set({ 
        isActive: !currentBinding.isActive,
        updatedAt: new Date() 
      })
      .where(eq(whatsappInstanceAgentBindings.id, id));

    // Return updated binding
    const [updated] = await db
      .select()
      .from(whatsappInstanceAgentBindings)
      .where(eq(whatsappInstanceAgentBindings.id, id))
      .limit(1);

    return updated;
  }

  // Client WhatsApp Instance Agent Bindings operations
  async getClientInstanceAgentBindings(clientId: string): Promise<WhatsappInstanceAgentBinding[]> {
    await this.ensureWhatsappInstanceAgentBindingsTable();
    
    // Get bindings for instances that belong to the client
    const bindings = await db
      .select({
        id: whatsappInstanceAgentBindings.id,
        instanceId: whatsappInstanceAgentBindings.instanceId,
        agentId: whatsappInstanceAgentBindings.agentId,
        isActive: whatsappInstanceAgentBindings.isActive,
        createdAt: whatsappInstanceAgentBindings.createdAt,
        updatedAt: whatsappInstanceAgentBindings.updatedAt,
      })
      .from(whatsappInstanceAgentBindings)
      .innerJoin(whatsappInstances, eq(whatsappInstanceAgentBindings.instanceId, whatsappInstances.id))
      .where(eq(whatsappInstances.franchiseId, clientId))
      .orderBy(desc(whatsappInstanceAgentBindings.createdAt));

    return bindings;
  }

  async getFranchiseInstanceAgentBindings(franchiseId: string): Promise<WhatsappInstanceAgentBinding[]> {
    console.log('🔍 getFranchiseInstanceAgentBindings chamado com franchiseId:', franchiseId);
    
    await this.ensureClientWhatsappInstanceAgentBindingsTable();
    
    // Validate franchiseId parameter
    if (!franchiseId || franchiseId.trim() === '') {
      console.error('getFranchiseInstanceAgentBindings: franchiseId is undefined or empty:', franchiseId);
      return [];
    }
    
    console.log('✅ franchiseId válido, buscando vinculações...');
    
    try {
      // Get bindings for instances that belong to clients of the franchise
      console.log('🔍 Executando query SQL para buscar vinculações...');
      
      // Primeiro, vamos verificar se existem vinculações na tabela
      const allBindings = await db
        .select()
        .from(clientWhatsappInstanceAgentBindings);
      console.log('📊 Todas as vinculações na tabela:', allBindings.length, allBindings);
      
      // Verificar se existem instâncias para esta franquia
      const franchiseInstances = await db
        .select()
        .from(whatsappInstances)
        .where(eq(whatsappInstances.franchiseId, franchiseId));
      console.log('📱 Instâncias da franquia:', franchiseInstances.length, franchiseInstances);
      
      // Agora executar a query principal
      const bindings = await db
        .select({
          id: clientWhatsappInstanceAgentBindings.id,
          instanceId: clientWhatsappInstanceAgentBindings.instanceId,
          agentId: clientWhatsappInstanceAgentBindings.agentId,
          userId: clientWhatsappInstanceAgentBindings.userId,
          isActive: clientWhatsappInstanceAgentBindings.isActive,
          createdAt: clientWhatsappInstanceAgentBindings.createdAt,
          updatedAt: clientWhatsappInstanceAgentBindings.updatedAt,
        })
        .from(clientWhatsappInstanceAgentBindings)
        .innerJoin(whatsappInstances, eq(clientWhatsappInstanceAgentBindings.instanceId, whatsappInstances.id))
        .where(eq(whatsappInstances.franchiseId, franchiseId))
        .orderBy(desc(clientWhatsappInstanceAgentBindings.createdAt));

      console.log('📊 Vinculações encontradas na query:', bindings.length, bindings);
      return bindings;
    } catch (error) {
      console.error('❌ Erro na query getFranchiseInstanceAgentBindings:', error);
      return [];
    }
  }

  async createClientWhatsappInstanceAgentBinding(bindingData: InsertWhatsappInstanceAgentBinding): Promise<WhatsappInstanceAgentBinding> {
    console.log('📝 createClientWhatsappInstanceAgentBinding chamado com dados:', bindingData);
    
    await this.ensureClientWhatsappInstanceAgentBindingsTable();
    
    try {
      console.log('✅ Tabela verificada, inserindo dados...');
      await db
        .insert(clientWhatsappInstanceAgentBindings)
        .values({
          ...bindingData,
          userId: bindingData.userId || 'default-user' // Provide default userId if not present
        });
      console.log('✅ Dados inseridos com sucesso');
      
      console.log('🔍 Buscando dados inseridos...');
      const [inserted] = await db
        .select()
        .from(clientWhatsappInstanceAgentBindings)
        .where(and(
          eq(clientWhatsappInstanceAgentBindings.instanceId, bindingData.instanceId),
          eq(clientWhatsappInstanceAgentBindings.agentId, bindingData.agentId)
        ))
        .orderBy(desc(clientWhatsappInstanceAgentBindings.createdAt))
        .limit(1);
      
      console.log('✅ Dados inseridos encontrados:', inserted);
      return inserted;
    } catch (error) {
      console.error('❌ Erro ao criar vinculação:', error);
      throw error;
    }
  }

  async updateClientWhatsappInstanceAgentBinding(id: string, bindingData: Partial<InsertWhatsappInstanceAgentBinding>): Promise<WhatsappInstanceAgentBinding> {
    await this.ensureClientWhatsappInstanceAgentBindingsTable();
    await db
      .update(clientWhatsappInstanceAgentBindings)
      .set({ ...bindingData, updatedAt: new Date() })
      .where(eq(clientWhatsappInstanceAgentBindings.id, id));

    const [updated] = await db
      .select()
      .from(clientWhatsappInstanceAgentBindings)
      .where(eq(clientWhatsappInstanceAgentBindings.id, id))
      .limit(1);

    return updated;
  }

  async deleteClientWhatsappInstanceAgentBinding(id: string): Promise<void> {
    await this.ensureClientWhatsappInstanceAgentBindingsTable();
    await db.delete(clientWhatsappInstanceAgentBindings).where(eq(clientWhatsappInstanceAgentBindings.id, id));
  }

  async getClientInstanceAgentBindingById(id: string): Promise<WhatsappInstanceAgentBinding | undefined> {
    await this.ensureClientWhatsappInstanceAgentBindingsTable();
    
    const [binding] = await db
      .select()
      .from(clientWhatsappInstanceAgentBindings)
      .where(eq(clientWhatsappInstanceAgentBindings.id, id));

    return binding ? {
      id: binding.id,
      instanceId: binding.instanceId,
      agentId: binding.agentId,
      userId: binding.userId,
      isActive: binding.isActive,
      createdAt: binding.createdAt,
      updatedAt: binding.updatedAt,
    } : undefined;
  }

  async getClientWhatsappAgents(clientId: string): Promise<GlobalPrompt[]> {
    // Get client's franchisor to access global prompts
    const franchise = await this.getFranchise(clientId);
    if (!franchise) {
      return [];
    }

    // Get user to find franchisor
    const user = await this.getUser(franchise.userId);
    if (!user) {
      return [];
    }

    // Get franchisor
    const franchisor = await this.getFranchisorByUserId(user.id);
    if (!franchisor) {
      return [];
    }

    // Return global prompts for this franchisor
    return await this.getGlobalPrompts(franchisor.id);
  }

  async getCustomAIAgentsByUserId(userId: string): Promise<any[]> {
    return await db
      .select()
      .from(customAIAgents)
      .where(eq(customAIAgents.userId, userId))
      .orderBy(desc(customAIAgents.createdAt));
  }

  async getCustomAIAgentById(id: string): Promise<any | undefined> {
    const [agent] = await db
      .select()
      .from(customAIAgents)
      .where(eq(customAIAgents.id, id));
    
    return agent;
  }

  // ========================================
  // FRANCHISE CLIENTS METHODS
  // ========================================

  // Franchise Clients operations
  async getFranchiseClients(franchiseId: string): Promise<FranchiseClient[]> {
    return await db
      .select()
      .from(franchiseClients)
      .where(eq(franchiseClients.franchiseId, franchiseId))
      .orderBy(desc(franchiseClients.createdAt));
  }

  async getFranchiseClient(id: string): Promise<FranchiseClient | undefined> {
    const [client] = await db.select().from(franchiseClients).where(eq(franchiseClients.id, id));
    return client;
  }

  async getFranchiseClientByEmail(email: string, franchiseId: string): Promise<FranchiseClient | undefined> {
    const [client] = await db
      .select()
      .from(franchiseClients)
      .where(and(
        eq(franchiseClients.email, email),
        eq(franchiseClients.franchiseId, franchiseId)
      ));
    return client;
  }

  async createFranchiseClient(franchiseId: string, clientData: CreateFranchiseClient): Promise<FranchiseClient> {
    // Check if client with this email already exists for this franchise
    const existingClient = await this.getFranchiseClientByEmail(clientData.email, franchiseId);
    if (existingClient) {
      throw new Error("Já existe um cliente cadastrado com este email para esta franquia");
    }

    await db
      .insert(franchiseClients)
      .values({
        franchiseId: franchiseId,
        fullName: clientData.fullName,
        phone: clientData.phone,
        email: clientData.email,
        cpf: clientData.cpf,
        street: clientData.street,
        number: clientData.number,
        complement: clientData.complement,
        neighborhood: clientData.neighborhood,
        city: clientData.city,
        state: clientData.state,
        zipCode: clientData.zipCode,
        notes: clientData.notes,
        source: clientData.source || "whatsapp",
        status: "active",
      });

    // Get the newly created client
    const [newClient] = await db
      .select()
      .from(franchiseClients)
      .where(and(
        eq(franchiseClients.franchiseId, franchiseId),
        eq(franchiseClients.email, clientData.email)
      ))
      .orderBy(desc(franchiseClients.createdAt))
      .limit(1);

    return newClient;
  }

  async updateFranchiseClient(id: string, clientData: UpdateFranchiseClient): Promise<FranchiseClient> {
    // Check if email is being changed and if it already exists
    if (clientData.email) {
      const existingClient = await this.getFranchiseClient(id);
      if (existingClient && existingClient.email !== clientData.email) {
        const emailExists = await this.getFranchiseClientByEmail(clientData.email, existingClient.franchiseId);
        if (emailExists) {
          throw new Error("Já existe um cliente cadastrado com este email para esta franquia");
        }
      }
    }

    await db
      .update(franchiseClients)
      .set({ ...clientData, updatedAt: new Date() })
      .where(eq(franchiseClients.id, id));

    // Get the updated client
    const [updatedClient] = await db
      .select()
      .from(franchiseClients)
      .where(eq(franchiseClients.id, id))
      .limit(1);

    return updatedClient;
  }

  async deleteFranchiseClient(id: string): Promise<void> {
    await db.delete(franchiseClients).where(eq(franchiseClients.id, id));
  }

  // Method to automatically create client from WhatsApp conversation
  async createClientFromWhatsApp(
    franchiseId: string,
    phoneNumber: string,
    contactName?: string,
    additionalData?: Partial<CreateFranchiseClient>
  ): Promise<FranchiseClient> {
    try {
      // Check if client already exists with this phone number
      const [existingClient] = await db
        .select()
        .from(franchiseClients)
        .where(and(
          eq(franchiseClients.franchiseId, franchiseId),
          eq(franchiseClients.phone, phoneNumber)
        ))
        .limit(1);

      if (existingClient) {
        // Update client with new information if provided
        if (contactName || additionalData) {
          const updateData: any = {};
          if (contactName) updateData.fullName = contactName;
          if (additionalData) {
            Object.assign(updateData, additionalData);
          }
          
          await this.updateFranchiseClient(existingClient.id, updateData);
          const updatedClient = await this.getFranchiseClient(existingClient.id);
          if (!updatedClient) {
            throw new Error("Falha ao recuperar cliente atualizado");
          }
          return updatedClient;
        }
        return existingClient;
      }

      // Create new client
      const clientData: CreateFranchiseClient = {
        fullName: contactName || `Cliente ${phoneNumber}`,
        email: `${phoneNumber}@whatsapp.auto`,
        phone: phoneNumber,
        cpf: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
        notes: "Cliente criado automaticamente via WhatsApp",
        source: "whatsapp",
        ...additionalData
      };

      return await this.createFranchiseClient(franchiseId, clientData);
    } catch (error) {
      console.error("Error creating client from WhatsApp:", error);
      throw error;
    }
  }

  // Method to get or create client from WhatsApp conversation
  async getOrCreateClientFromWhatsApp(
    franchiseId: string,
    phoneNumber: string,
    contactName?: string,
    additionalData?: Partial<CreateFranchiseClient>
  ): Promise<FranchiseClient> {
    try {
      // First try to find existing client
      const [existingClient] = await db
        .select()
        .from(franchiseClients)
        .where(and(
          eq(franchiseClients.franchiseId, franchiseId),
          eq(franchiseClients.phone, phoneNumber)
        ))
        .limit(1);

      if (existingClient) {
        return existingClient;
      }

      // If not found, create new client
      return await this.createClientFromWhatsApp(franchiseId, phoneNumber, contactName, additionalData);
    } catch (error) {
      console.error("Error getting or creating client from WhatsApp:", error);
      throw error;
    }
  }

  private async ensureWhatsappAgentsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS whatsapp_agents (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(20) NOT NULL DEFAULT 'global',
          franchisor_id VARCHAR(36),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (franchisor_id) REFERENCES franchisors(id)
        )
      `);
    } catch (error) {
      console.error("Error ensuring whatsapp_agents table:", error);
    }
  }

  private async ensureWhatsappInstanceAgentBindingsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS whatsapp_instance_agent_bindings (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          instance_id VARCHAR(36) NOT NULL,
          agent_id VARCHAR(36) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (instance_id) REFERENCES admin_whatsapp_instances(id),
          FOREIGN KEY (agent_id) REFERENCES whatsapp_agents(id)
        )
      `);
    } catch (error) {
      console.error("Error ensuring whatsapp_instance_agent_bindings table:", error);
    }
  }

  // CRM Kanban Cards operations
  async getCrmKanbanCards(franchiseId: string): Promise<CrmKanbanCard[]> {
    return await db
      .select()
      .from(crmKanbanCards)
      .where(eq(crmKanbanCards.franchiseId, franchiseId))
      .orderBy(desc(crmKanbanCards.createdAt));
  }

  async getCrmKanbanCard(id: string): Promise<CrmKanbanCard | undefined> {
    const [card] = await db
      .select()
      .from(crmKanbanCards)
      .where(eq(crmKanbanCards.id, id))
      .limit(1);
    return card;
  }

  async getCrmKanbanCardByPhone(franchiseId: string, phone: string): Promise<CrmKanbanCard | undefined> {
    const [card] = await db
      .select()
      .from(crmKanbanCards)
      .where(and(
        eq(crmKanbanCards.franchiseId, franchiseId),
        eq(crmKanbanCards.clientPhone, phone)
      ))
      .limit(1);
    return card;
  }

  async createCrmKanbanCard(cardData: InsertCrmKanbanCard): Promise<CrmKanbanCard> {
    const [newCard] = await db
      .insert(crmKanbanCards)
      .values(cardData)
      .returning();
    return newCard;
  }

  async createOrUpdateCrmKanbanCard(
    franchiseId: string,
    phone: string,
    name: string,
    conversationId?: string,
    lastMessageDate?: Date
  ): Promise<CrmKanbanCard> {
    // First try to find existing card
    const existingCard = await this.getCrmKanbanCardByPhone(franchiseId, phone);

    if (existingCard) {
      // Update existing card with new message date
      const updateData: Partial<InsertCrmKanbanCard> = {
        lastMessageDate: lastMessageDate || new Date(),
      };

      // Update conversation ID if provided
      if (conversationId) {
        updateData.conversationId = conversationId;
      }

      await db
        .update(crmKanbanCards)
        .set(updateData)
        .where(eq(crmKanbanCards.id, existingCard.id));

      // Return updated card
      return await this.getCrmKanbanCard(existingCard.id) as CrmKanbanCard;
    } else {
      // Create new card
      const cardData: InsertCrmKanbanCard = {
        franchiseId,
        clientName: name,
        clientPhone: phone,
        type: "Consulta",
        priority: "media",
        status: "novo",
        lastMessageDate: lastMessageDate || new Date(),
        conversationId: conversationId || null,
      };

      return await this.createCrmKanbanCard(cardData);
    }
  }

  async updateCrmKanbanCard(id: string, cardData: Partial<InsertCrmKanbanCard>): Promise<CrmKanbanCard> {
    await db
      .update(crmKanbanCards)
      .set(cardData)
      .where(eq(crmKanbanCards.id, id));

    return await this.getCrmKanbanCard(id) as CrmKanbanCard;
  }

  async deleteCrmKanbanCard(id: string): Promise<void> {
    await db.delete(crmKanbanCards).where(eq(crmKanbanCards.id, id));
  }

  private async ensureClientWhatsappInstanceAgentBindingsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS client_whatsapp_instance_agent_bindings (
          id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
          instance_id VARCHAR(36) NOT NULL,
          agent_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(36) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES custom_ai_agents(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
    } catch (error) {
      console.error("Error ensuring client_whatsapp_instance_agent_bindings table:", error);
    }
  }
}

export const storage = new DatabaseStorage();
