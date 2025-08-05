import {
  users,
  clients,
  teamMembers,
  projects,
  invoices,
  projectAssignments,
  systemSettings,
  userRoles,
  aiConfigurations,
  aiUsage,
  whatsappApiSettings,
  whatsappInstances,
  type User,
  type UpsertUser,
  type Client,
  type InsertClient,
  type TeamMember,
  type InsertTeamMember,
  type Project,
  type InsertProject,
  type Invoice,
  type InsertInvoice,
  type ProjectAssignment,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sum, sql } from "drizzle-orm";
import crypto from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  getClientByUserId(userId: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Team operations
  getTeamMembers(): Promise<TeamMember[]>;
  getTeamMember(id: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<void>;

  // Project operations
  getProjects(): Promise<Project[]>;
  getProjectsByTeamMember(teamMemberId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Invoice operations
  getInvoices(): Promise<Invoice[]>;
  getInvoicesByClient(clientId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: string): Promise<void>;

  // Dashboard stats
  getAdminStats(): Promise<{
    totalClients: number;
    totalRevenue: number;
    activeProjects: number;
    teamMembers: number;
  }>;
  getClientStats(clientId: string): Promise<{
    pendingInvoices: number;
    totalOpen: number;
    nextDue: string | null;
  }>;
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

  // Client with user creation
  createClientWithUser(data: any): Promise<Client>;

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
  getWhatsappInstance(id: string): Promise<WhatsappInstance | undefined>;
  createWhatsappInstance(instance: InsertWhatsappInstance): Promise<WhatsappInstance>;
  updateWhatsappInstance(id: string, instance: Partial<InsertWhatsappInstance>): Promise<WhatsappInstance>;
  deleteWhatsappInstance(id: string): Promise<void>;
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to find existing user first
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      // Update existing user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id))
        .returning();
      return updatedUser;
    } else {
      // Insert new user
      const [newUser] = await db
        .insert(users)
        .values(userData)
        .returning();
      return newUser;
    }
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByUserId(userId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.userId, userId));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

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

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Team operations
  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).orderBy(desc(teamMembers.createdAt));
  }

  async getTeamMember(id: string): Promise<TeamMember | undefined> {
    const [member] = await db.select().from(teamMembers).where(eq(teamMembers.id, id));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async updateTeamMember(id: string, member: Partial<InsertTeamMember>): Promise<TeamMember> {
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(teamMembers.id, id))
      .returning();
    return updatedMember;
  }

  async deleteTeamMember(id: string): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Project operations
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

  // Invoice operations
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

  // Dashboard stats
  async getAdminStats(): Promise<{
    totalClients: number;
    totalRevenue: number;
    activeProjects: number;
    teamMembers: number;
  }> {
    const [clientCount] = await db.select({ count: count() }).from(clients);
    const [revenueSum] = await db
      .select({ sum: sum(invoices.amount) })
      .from(invoices)
      .where(eq(invoices.status, "paid"));
    const [projectCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, "active"));
    const [memberCount] = await db.select({ count: count() }).from(teamMembers);

    return {
      totalClients: clientCount.count,
      totalRevenue: Number(revenueSum.sum || 0),
      activeProjects: projectCount.count,
      teamMembers: memberCount.count,
    };
  }

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

  async getTeamStats(teamMemberId: string): Promise<{
    activeProjects: number;
    pendingTasks: number;
    completedToday: number;
  }> {
    const [activeCount] = await db
      .select({ count: count() })
      .from(projects)
      .innerJoin(projectAssignments, eq(projects.id, projectAssignments.projectId))
      .where(
        and(
          eq(projectAssignments.teamMemberId, teamMemberId),
          eq(projects.status, "active")
        )
      );

    // For now, using mock values for tasks as we don't have a tasks table
    return {
      activeProjects: activeCount.count,
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

  async deleteSystemSetting(key: string): Promise<void> {
    await db.delete(systemSettings).where(eq(systemSettings.settingKey, key));
  }

  // Team member with user creation
  async createTeamMemberWithUser(data: any): Promise<TeamMember> {
    const bcrypt = await import('bcrypt');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Create the user first
    const [newUser] = await db
      .insert(users)
      .values({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        password: hashedPassword,
        role: data.role,
        active: true,
      })
      .returning();

    // Create the team member linked to the user
    const [newTeamMember] = await db
      .insert(teamMembers)
      .values({
        userId: newUser.id,
        position: data.position,
        department: data.department,
        salary: data.salary ? data.salary.toString() : null,
        hireDate: data.hireDate ? new Date(data.hireDate) : new Date(),
      })
      .returning();

    return newTeamMember;
  }

  // Client with user creation
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
    const [newRole] = await db
      .insert(userRoles)
      .values({
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: JSON.stringify(data.permissions || []),
        isSystem: false,
        active: data.active,
      })
      .returning();
    return newRole;
  }

  async updateRole(id: string, data: any): Promise<UserRole> {
    const [updatedRole] = await db
      .update(userRoles)
      .set({
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        permissions: JSON.stringify(data.permissions || []),
        active: data.active,
        updatedAt: new Date(),
      })
      .where(eq(userRoles.id, id))
      .returning();
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
    const [newConfig] = await db.insert(aiConfigurations).values(config).returning();
    return newConfig;
  }

  async updateAIConfiguration(id: string, config: Partial<InsertAIConfiguration>): Promise<AIConfiguration> {
    const [updatedConfig] = await db
      .update(aiConfigurations)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(aiConfigurations.id, id))
      .returning();
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
    const [settings] = await db
      .select()
      .from(whatsappApiSettings)
      .where(eq(whatsappApiSettings.isActive, true))
      .orderBy(desc(whatsappApiSettings.createdAt))
      .limit(1);
    return settings;
  }

  async saveWhatsappApiSettings(settings: WhatsappApiSettingsForm, userId: string): Promise<WhatsappApiSettings> {
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
    await db
      .update(whatsappApiSettings)
      .set({ ...settings, updatedAt: new Date() })
      .where(eq(whatsappApiSettings.id, id));

    // Get the updated settings
    const [updatedSettings] = await db
      .select()
      .from(whatsappApiSettings)
      .where(eq(whatsappApiSettings.id, id));

    return updatedSettings;
  }

  async deleteWhatsappApiSettings(id: string): Promise<void> {
    await db.delete(whatsappApiSettings).where(eq(whatsappApiSettings.id, id));
  }

  // WhatsApp Instances operations
  async getWhatsappInstances(): Promise<WhatsappInstance[]> {
    return await db
      .select()
      .from(whatsappInstances)
      .orderBy(desc(whatsappInstances.createdAt));
  }

  async getWhatsappInstancesByClient(clientId: string): Promise<WhatsappInstance[]> {
    return await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.clientId, clientId))
      .orderBy(desc(whatsappInstances.createdAt));
  }

  async getWhatsappInstance(id: string): Promise<WhatsappInstance | undefined> {
    const [instance] = await db
      .select()
      .from(whatsappInstances)
      .where(eq(whatsappInstances.id, id));
    return instance;
  }

  async createWhatsappInstance(instance: InsertWhatsappInstance): Promise<WhatsappInstance> {
    await db.insert(whatsappInstances).values(instance);

    // Get the newly inserted instance
    const [newInstance] = await db
      .select()
      .from(whatsappInstances)
      .where(and(
        eq(whatsappInstances.clientId, instance.clientId),
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
      .where(eq(whatsappInstances.id, id));

    return updatedInstance;
  }

  async deleteWhatsappInstance(id: string): Promise<void> {
    await db.delete(whatsappInstances).where(eq(whatsappInstances.id, id));
  }
}

export const storage = new DatabaseStorage();
