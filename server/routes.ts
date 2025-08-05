import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClientSchema, insertTeamMemberSchema, insertProjectSchema, insertInvoiceSchema, aiSettingsSchema, createClientSchema, editClientSchema } from "@shared/schema";
import { openaiService } from "./openai";
import { whatsappAIHandler } from "./whatsapp-ai-handler";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Local auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      // Find user in database by email
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Check if user is active
      if (!user.active) {
        return res.status(401).json({ message: "Usuário inativo" });
      }

      // Verify password
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password || '');
      
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Create session
      (req as any).session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        claims: { sub: user.id }
      };

      res.json({ 
        message: "Login realizado com sucesso",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  // Helper function to get current user ID
  const getCurrentUserId = (req: any): string | null => {
    if (req.session?.user) {
      return req.session.user.id;
    }
    if (req.user?.claims?.sub) {
      return req.user.claims.sub;
    }
    return null;
  };

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin routes (protected)
  app.get("/api/admin/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Client routes
  app.get("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = createClientSchema.parse(req.body);
      
      // Create client with user account
      const client = await storage.createClientWithUser(validatedData);
      res.json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      console.log("Updating client with ID:", id);
      console.log("Request body:", req.body);
      
      const validatedData = editClientSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      
      const client = await storage.updateClient(id, validatedData);
      console.log("Updated client:", client);
      
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client", error: error.message });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      await storage.deleteClient(id);
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Team routes
  app.get("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const team = await storage.getTeamMembers();
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post("/api/team", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { createTeamMemberSchema } = await import("@shared/schema");
      const validatedData = createTeamMemberSchema.parse(req.body);
      
      // Create the team member with user data
      const member = await storage.createTeamMemberWithUser(validatedData);
      res.json(member);
    } catch (error) {
      console.error("Error creating team member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create team member" });
    }
  });

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      let projects;
      
      if (user?.role === 'admin') {
        projects = await storage.getProjects();
      } else if (user?.role === 'team') {
        // Get team member record first
        const teamMembers = await storage.getTeamMembers();
        const teamMember = teamMembers.find(tm => tm.userId === user.id);
        if (!teamMember) {
          return res.status(404).json({ message: "Team member not found" });
        }
        projects = await storage.getProjectsByTeamMember(teamMember.id);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'team') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      let invoices;
      
      if (user?.role === 'admin') {
        invoices = await storage.getInvoices();
      } else if (user?.role === 'client') {
        // Get client record first
        const clients = await storage.getClients();
        const client = clients.find(c => c.userId === user.id);
        if (!client) {
          return res.status(404).json({ message: "Client not found" });
        }
        invoices = await storage.getInvoicesByClient(client.id);
      } else {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.post("/api/invoices", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(validatedData);
      res.json(invoice);
    } catch (error) {
      console.error("Error creating invoice:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // Dashboard stats routes
  app.get("/api/stats/client/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const { clientId } = req.params;
      
      // Only allow clients to see their own stats or admins to see any stats
      if (user?.role === 'client') {
        const clients = await storage.getClients();
        const client = clients.find(c => c.userId === user.id);
        if (!client || client.id !== clientId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stats = await storage.getClientStats(clientId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching client stats:", error);
      res.status(500).json({ message: "Failed to fetch client stats" });
    }
  });

  app.get("/api/stats/team/:teamMemberId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      const { teamMemberId } = req.params;
      
      // Only allow team members to see their own stats or admins to see any stats
      if (user?.role === 'team') {
        const teamMembers = await storage.getTeamMembers();
        const teamMember = teamMembers.find(tm => tm.userId === user.id);
        if (!teamMember || teamMember.id !== teamMemberId) {
          return res.status(403).json({ message: "Access denied" });
        }
      } else if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const stats = await storage.getTeamStats(teamMemberId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  // Configure multer for file uploads
  const upload = multer({
    dest: 'uploads/temp/', // Temporary directory for multer
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Apenas arquivos de imagem são permitidos'));
      }
    },
  });

  // System settings routes
  app.get("/api/admin/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      console.log("Settings update request received");
      console.log("Body:", req.body);
      console.log("Files:", req.files);
      
      const userId = getCurrentUserId(req);
      if (!userId) {
        console.log("No user ID found");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        console.log("User is not admin:", user?.role);
        return res.status(403).json({ message: "Access denied" });
      }

      const { systemName, systemSubtitle, systemColor, systemColorHex } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      console.log("Processing settings:", { systemName, systemSubtitle, systemColor, systemColorHex });

      // Create uploads directory if it doesn't exist
      try {
        await fs.access('public/uploads');
      } catch {
        await fs.mkdir('public/uploads', { recursive: true });
      }

      // Handle logo upload
      if (files?.logo?.[0]) {
        console.log("Processing logo upload");
        const logoFile = files.logo[0];
        console.log("Logo file:", logoFile);
        
        const logoExtension = path.extname(logoFile.originalname);
        const logoFilename = `logo_${Date.now()}${logoExtension}`;
        const logoPath = path.join('public/uploads', logoFilename);
        
        console.log("Copying logo from", logoFile.path, "to", logoPath);
        await fs.copyFile(logoFile.path, logoPath);
        await fs.unlink(logoFile.path); // Remove temp file
        
        console.log("Saving logo setting to database");
        await storage.setSystemSetting('logo', `/uploads/${logoFilename}`, 'string');
        console.log("Logo upload completed");
      }

      // Handle favicon upload
      if (files?.favicon?.[0]) {
        console.log("Processing favicon upload");
        const faviconFile = files.favicon[0];
        console.log("Favicon file:", faviconFile);
        
        const faviconExtension = path.extname(faviconFile.originalname);
        const faviconFilename = `favicon_${Date.now()}${faviconExtension}`;
        const faviconPath = path.join('public/uploads', faviconFilename);
        
        console.log("Copying favicon from", faviconFile.path, "to", faviconPath);
        await fs.copyFile(faviconFile.path, faviconPath);
        await fs.unlink(faviconFile.path); // Remove temp file
        
        console.log("Saving favicon setting to database");
        await storage.setSystemSetting('favicon', `/uploads/${faviconFilename}`, 'string');
        console.log("Favicon upload completed");
      }

      // Handle other settings
      if (systemName) {
        await storage.setSystemSetting('systemName', systemName, 'string');
      }

      if (systemSubtitle) {
        await storage.setSystemSetting('systemSubtitle', systemSubtitle, 'string');
      }

      if (systemColorHex || systemColor) {
        const color = systemColorHex || systemColor;
        await storage.setSystemSetting('systemColor', color, 'string');
      }

      const updatedSettings = await storage.getSystemSettings();
      res.json({ 
        message: "Configurações salvas com sucesso",
        settings: updatedSettings
      });
    } catch (error) {
      console.error("Error saving system settings:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to save system settings",
        error: error.message 
      });
    }
  });

  // Public system settings route (for login page and public access)
  app.get("/api/system/settings", async (req: any, res) => {
    try {
      const settings = await storage.getSystemSettings();
      
      // Only return public settings (logo, name, color, favicon)
      const publicSettings = {
        systemName: settings.systemName || settings.system_name || "Sistema de Gerenciamento",
        logo: settings.logo || settings.system_logo,
        favicon: settings.favicon || settings.system_favicon,
        systemColor: settings.systemColor || settings.primary_color || "#3b82f6",
      };
      
      res.json(publicSettings);
    } catch (error) {
      console.error("Error fetching public system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  // Roles management routes
  app.get("/api/admin/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching roles:", error);
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  app.post("/api/admin/roles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { createRoleSchema } = await import("@shared/schema");
      const validatedData = createRoleSchema.parse(req.body);
      
      const role = await storage.createRole(validatedData);
      res.json(role);
    } catch (error) {
      console.error("Error creating role:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create role" });
    }
  });

  app.put("/api/admin/roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const { createRoleSchema } = await import("@shared/schema");
      const validatedData = createRoleSchema.parse(req.body);
      
      const role = await storage.updateRole(id, validatedData);
      res.json(role);
    } catch (error) {
      console.error("Error updating role:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.delete("/api/admin/roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      await storage.deleteRole(id);
      res.json({ message: "Role deleted successfully" });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({ message: "Failed to delete role" });
    }
  });

  // AI Settings routes
  app.get("/api/admin/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const aiSettings = await storage.getAISettings();
      res.json(aiSettings);
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.post("/api/admin/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = aiSettingsSchema.parse(req.body);
      await storage.saveAISettings(validatedData);
      
      res.json({ 
        message: "Configurações de IA salvas com sucesso",
        settings: validatedData
      });
    } catch (error) {
      console.error("Error saving AI settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save AI settings" });
    }
  });

  // OpenAI Integration routes
  app.get("/api/admin/ai-models", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const models = await openaiService.getAvailableModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  app.get("/api/admin/ai-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const usageStats = await storage.getAIUsageStats();
      res.json(usageStats);
    } catch (error) {
      console.error("Error fetching AI usage stats:", error);
      res.status(500).json({ message: "Failed to fetch AI usage stats" });
    }
  });

  app.post("/api/admin/ai-test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const testResult = await openaiService.testConnection();
      res.json(testResult);
    } catch (error) {
      console.error("Error testing AI connection:", error);
      res.status(500).json({ message: "Failed to test AI connection" });
    }
  });

  app.post("/api/admin/ai-chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { message, settings } = req.body;
      
      if (!message || !settings) {
        return res.status(400).json({ message: "Message and settings are required" });
      }

      console.log("Testing AI chat with:", { 
        message: message.substring(0, 50) + "...", 
        model: settings.model
      });

      const response = await openaiService.chat(message, settings, userId);
      res.json(response);
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to process AI chat" });
    }
  });

  // WhatsApp API Settings routes
  app.get("/api/admin/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settings = await storage.getWhatsappApiSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching WhatsApp API settings:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp API settings" });
    }
  });

  app.post("/api/admin/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { whatsappApiSettingsSchema } = await import("@shared/schema");
      const validatedData = whatsappApiSettingsSchema.parse(req.body);
      
      const settings = await storage.saveWhatsappApiSettings(validatedData, userId);
      res.json({ 
        message: "Configurações da API WhatsApp salvas com sucesso",
        settings
      });
    } catch (error) {
      console.error("Error saving WhatsApp API settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save WhatsApp API settings" });
    }
  });

  app.put("/api/admin/whatsapp-settings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const { whatsappApiSettingsSchema } = await import("@shared/schema");
      const validatedData = whatsappApiSettingsSchema.partial().parse(req.body);
      
      const settings = await storage.updateWhatsappApiSettings(id, validatedData);
      res.json({ 
        message: "Configurações da API WhatsApp atualizadas com sucesso",
        settings
      });
    } catch (error) {
      console.error("Error updating WhatsApp API settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update WhatsApp API settings" });
    }
  });

  app.delete("/api/admin/whatsapp-settings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      await storage.deleteWhatsappApiSettings(id);
      res.json({ message: "Configurações da API WhatsApp removidas com sucesso" });
    } catch (error) {
      console.error("Error deleting WhatsApp API settings:", error);
      res.status(500).json({ message: "Failed to delete WhatsApp API settings" });
    }
  });

  // Client API Routes
  app.get("/api/client/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // For now, return empty array - this would be implemented based on business logic
      res.json([]);
    } catch (error) {
      console.error("Error fetching client clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.delete("/api/client/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      // For now, just return success - this would be implemented based on business logic
      res.json({ message: "Cliente excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  app.get("/api/client/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const settings = await storage.getWhatsappApiSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching client WhatsApp settings:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp settings" });
    }
  });

  app.post("/api/client/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { whatsappApiSettingsSchema } = await import("@shared/schema");
      const validatedData = whatsappApiSettingsSchema.parse(req.body);
      
      const settings = await storage.saveWhatsappApiSettings(validatedData, userId);
      res.json({ 
        message: "Configurações da API WhatsApp salvas com sucesso",
        settings
      });
    } catch (error) {
      console.error("Error saving client WhatsApp settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save WhatsApp settings" });
    }
  });

  app.post("/api/client/whatsapp-test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { evolutionApiUrl, globalToken } = req.body;
      
      // Test connection to Evolution API
      const testResponse = await fetch(`${evolutionApiUrl}/instance/connectionState`, {
        headers: {
          'Authorization': `Bearer ${globalToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (testResponse.ok) {
        res.json({ message: "Conexão testada com sucesso" });
      } else {
        res.status(400).json({ message: "Falha na conexão com a API" });
      }
    } catch (error) {
      console.error("Error testing WhatsApp connection:", error);
      res.status(500).json({ message: "Erro ao testar conexão" });
    }
  });

  // WhatsApp Instances routes
  app.get("/api/client/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get client ID for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(400).json({ message: "Cliente não encontrado para este usuário" });
      }
      
      // Fetch instances from database
      const instances = await storage.getWhatsappInstancesByClient(client.id);
      res.json(instances);
    } catch (error) {
      console.error("Error fetching WhatsApp instances:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp instances" });
    }
  });

  app.post("/api/client/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceName, phoneNumber } = req.body;
      
      if (!instanceName || !phoneNumber) {
        return res.status(400).json({ message: "Nome da instância e número de telefone são obrigatórios" });
      }
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }
      
      // Create instance using Evolution API
      const createInstanceResponse = await fetch(`${adminSettings.evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });
      
      if (!createInstanceResponse.ok) {
        const errorData = await createInstanceResponse.json();
        return res.status(400).json({ 
          message: "Falha ao criar instância na Evolution API",
          details: errorData
        });
      }
      
      const instanceData = await createInstanceResponse.json();
      
      // Get client ID for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(400).json({ message: "Cliente não encontrado para este usuário" });
      }
      
      // Save instance to database
      const newInstance = {
        clientId: client.id,
        instanceName: instanceName,
        instanceKey: instanceData.instance.instanceName, // Using instanceName as key
        webhook: null,
        status: 'disconnected',
        qrCode: null,
        lastConnection: null,
        phoneNumber: phoneNumber,
        isActive: true
      };
      
      const savedInstance = await storage.createWhatsappInstance(newInstance);
      
      res.json({
        message: "Instância criada com sucesso",
        instance: {
          id: savedInstance.id,
          instanceName: savedInstance.instanceName,
          instanceKey: savedInstance.instanceKey,
          phoneNumber: savedInstance.phoneNumber,
          status: savedInstance.status,
          createdAt: savedInstance.createdAt
        }
      });
    } catch (error) {
      console.error("Error creating WhatsApp instance:", error);
      res.status(500).json({ message: "Erro ao criar instância do WhatsApp" });
    }
  });

  // Update WhatsApp instance status
  app.patch("/api/client/whatsapp-instances/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ message: "Status é obrigatório" });
      }
      
      // Get client ID for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(400).json({ message: "Cliente não encontrado para este usuário" });
      }
      
      // Verify instance belongs to client
      const instance = await storage.getWhatsappInstance(id);
      if (!instance || instance.clientId !== client.id) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Update status
      const updatedInstance = await storage.updateWhatsappInstance(id, { status });
      
      res.json({
        message: "Status atualizado com sucesso",
        instance: updatedInstance
      });
    } catch (error) {
      console.error("Error updating WhatsApp instance status:", error);
      res.status(500).json({ message: "Erro ao atualizar status da instância" });
    }
  });

  // Delete WhatsApp instance
  app.delete("/api/client/whatsapp-instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      
      // Get client ID for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(400).json({ message: "Cliente não encontrado para este usuário" });
      }
      
      // Verify instance belongs to client
      const instance = await storage.getWhatsappInstance(id);
      if (!instance || instance.clientId !== client.id) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Delete instance from database
      await storage.deleteWhatsappInstance(id);
      
      res.json({
        message: "Instância excluída com sucesso",
        deletedInstance: instance
      });
    } catch (error) {
      console.error("Error deleting WhatsApp instance:", error);
      res.status(500).json({ message: "Erro ao excluir instância do WhatsApp" });
    }
  });

  // Configure WhatsApp instance settings
  app.post("/api/client/whatsapp-instances/:instanceKey/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceKey } = req.params;
      const settings = req.body;
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }

      console.log('Admin settings found:', {
        evolutionApiUrl: adminSettings.evolutionApiUrl,
        hasToken: !!adminSettings.globalToken,
        isActive: adminSettings.isActive
      });
      
      // Get client ID for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(400).json({ message: "Cliente não encontrado para este usuário" });
      }
      
      // Find instance to verify ownership
      const instances = await storage.getWhatsappInstancesByClient(client.id);
      const instance = instances.find(inst => inst.instanceKey === instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada ou não pertence ao cliente" });
      }

      console.log('Instance found:', {
        instanceKey,
        instanceName: instance.instanceName,
        status: instance.status
      });
      
      // Evolution API expects camelCase, not snake_case
      const evolutionSettings = {
        rejectCall: settings.rejectCall,
        msgCall: settings.msgCall,
        groupsIgnore: settings.groupsIgnore,
        alwaysOnline: settings.alwaysOnline,
        readMessages: settings.readMessages,
        readStatus: settings.readStatus,
        syncFullHistory: settings.syncFullHistory
      };

      console.log('Sending settings to Evolution API:', evolutionSettings);
      console.log('Evolution API URL:', `${adminSettings.evolutionApiUrl}/settings/set/${instanceKey}`);

      // Call Evolution API to set settings
      const evolutionResponse = await fetch(`${adminSettings.evolutionApiUrl}/settings/set/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(evolutionSettings)
      });
      
      if (!evolutionResponse.ok) {
        let errorData;
        try {
          errorData = await evolutionResponse.json();
        } catch (jsonError) {
          // Se não conseguir fazer parse do JSON, usar o texto da resposta
          const errorText = await evolutionResponse.text();
          console.error('Evolution API non-JSON error:', {
            status: evolutionResponse.status,
            statusText: evolutionResponse.statusText,
            responseText: errorText
          });
          return res.status(400).json({ 
            message: "Falha ao aplicar configurações na Evolution API",
            details: {
              status: evolutionResponse.status,
              statusText: evolutionResponse.statusText,
              response: errorText
            }
          });
        }
        
        console.error('Evolution API error:', errorData);
        return res.status(400).json({ 
          message: "Falha ao aplicar configurações na Evolution API",
          details: errorData
        });
      }
      
      let evolutionData;
      try {
        evolutionData = await evolutionResponse.json();
      } catch (jsonError) {
        // Se não conseguir fazer parse do JSON de resposta de sucesso
        const responseText = await evolutionResponse.text();
        console.log('Evolution API success response (non-JSON):', responseText);
        evolutionData = { message: "Configurações aplicadas", response: responseText };
      }
      
      res.json({
        message: "Configurações aplicadas com sucesso",
        settings: evolutionData
      });
    } catch (error) {
      console.error("Error configuring WhatsApp instance:", error);
      res.status(500).json({ message: "Erro ao configurar instância do WhatsApp" });
    }
  });

  // Configure Evolution API webhook for WhatsApp instance
  app.post("/api/client/whatsapp-instances/:instanceKey/webhook", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceKey } = req.params;
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }

      // Get client ID for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(400).json({ message: "Cliente não encontrado para este usuário" });
      }
      
      // Find instance to verify ownership
      const instances = await storage.getWhatsappInstancesByClient(client.id);
      const instance = instances.find(inst => inst.instanceKey === instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada ou não pertence ao cliente" });
      }

      // Generate webhook URL for this instance
      // Use public URL for webhook to avoid localhost issues with Evolution API
      let baseUrl;
      if (process.env.NODE_ENV === 'production' || process.env.REPL_ID) {
        // Use Replit URL in production or when running on Replit
        baseUrl = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      } else {
        // Use localhost for development
        baseUrl = req.protocol + '://' + req.get('host');
      }
      const webhookUrl = `${baseUrl}/api/client/whatsapp-webhook/${instanceKey}`;

      // Prepare webhook configuration for Evolution API
      const webhookConfig = {
        webhook: {
          enabled: true,
          url: webhookUrl,
          headers: {
            authorization: `Bearer ${adminSettings.globalToken}`,
            "Content-Type": "application/json"
          },
          byEvents: false,
          base64: true,
          events: [
            "MESSAGES_UPSERT"
          ]
        }
      };

      console.log('Configuring webhook for instance:', instanceKey);
      console.log('Webhook URL:', webhookUrl);
      console.log('Webhook config:', webhookConfig);

      // Call Evolution API to set webhook
      const evolutionResponse = await fetch(`${adminSettings.evolutionApiUrl}/webhook/set/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookConfig)
      });
      
      if (!evolutionResponse.ok) {
        let errorData;
        try {
          errorData = await evolutionResponse.json();
        } catch (jsonError) {
          const errorText = await evolutionResponse.text();
          console.error('Evolution API webhook error:', {
            status: evolutionResponse.status,
            statusText: evolutionResponse.statusText,
            responseText: errorText
          });
          return res.status(400).json({ 
            message: "Falha ao configurar webhook na Evolution API",
            details: {
              status: evolutionResponse.status,
              statusText: evolutionResponse.statusText,
              response: errorText
            }
          });
        }
        
        console.error('Evolution API webhook error:', errorData);
        return res.status(400).json({ 
          message: "Falha ao configurar webhook na Evolution API",
          details: errorData
        });
      }
      
      let evolutionData;
      try {
        evolutionData = await evolutionResponse.json();
      } catch (jsonError) {
        const responseText = await evolutionResponse.text();
        console.log('Evolution API webhook success response (non-JSON):', responseText);
        evolutionData = { message: "Webhook configurado com sucesso", response: responseText };
      }

      // Update instance webhook URL in database
      await storage.updateWhatsappInstance(instance.id, { webhook: webhookUrl });
      
      res.json({
        message: "Webhook configurado com sucesso",
        webhookUrl: webhookUrl,
        config: webhookConfig,
        response: evolutionData
      });
    } catch (error) {
      console.error("Error configuring Evolution API webhook:", error);
      res.status(500).json({ message: "Erro ao configurar webhook da Evolution API" });
    }
  });

  // WhatsApp webhook endpoint with instance key (no authentication required)
  app.post("/api/client/whatsapp-webhook/:instanceKey", async (req: any, res) => {
    try {
      const { instanceKey } = req.params;
      const { event, instance, data } = req.body;
      
      console.log(`WhatsApp webhook for ${instanceKey}:`, { event, instance, data });
      
      // Handle connection updates
      if (event === 'connection.update' && data && data.state) {
        try {
          // Find instance by instanceKey
          const instances = await storage.getWhatsappInstances();
          const matchingInstance = instances.find(inst => inst.instanceKey === instanceKey);
          
          if (matchingInstance) {
            let newStatus = 'disconnected';
            
            // Map Evolution API states to our status
            switch (data.state) {
              case 'open':
                newStatus = 'connected';
                break;
              case 'close':
              case 'closed':
                newStatus = 'disconnected';
                break;
              case 'connecting':
                newStatus = 'connecting';
                break;
              default:
                newStatus = data.state;
            }
            
            // Update status in database
            await storage.updateWhatsappInstance(matchingInstance.id, { 
              status: newStatus,
              lastConnection: newStatus === 'connected' ? new Date() : matchingInstance.lastConnection
            });
            
            console.log(`✅ Instance ${instanceKey} status updated to: ${newStatus}`);
          }
        } catch (error) {
          console.error('Error updating instance status from webhook:', error);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  // WhatsApp webhook endpoint (no authentication required)
  app.post("/api/client/whatsapp-webhook", async (req: any, res) => {
    try {
      const { event, instance, data } = req.body;
      
      console.log('WhatsApp webhook received:', { event, instance, data });
      
      // Handle different webhook events
      switch (event) {
        case 'connection.update':
          console.log('Connection update:', data);
          
          // Update instance status in database
          if (instance && data && data.state) {
            try {
              // Find instance by instanceKey
              const instances = await storage.getWhatsappInstances();
              const matchingInstance = instances.find(inst => inst.instanceKey === instance);
              
              if (matchingInstance) {
                let newStatus = 'disconnected';
                
                // Map Evolution API states to our status
                switch (data.state) {
                  case 'open':
                    newStatus = 'connected';
                    break;
                  case 'close':
                  case 'closed':
                    newStatus = 'disconnected';
                    break;
                  case 'connecting':
                    newStatus = 'connecting';
                    break;
                  default:
                    newStatus = data.state;
                }
                
                // Update status in database
                await storage.updateWhatsappInstance(matchingInstance.id, { 
                  status: newStatus,
                  lastConnection: newStatus === 'connected' ? new Date() : matchingInstance.lastConnection
                });
                
                console.log(`✅ Instance ${instance} status updated to: ${newStatus}`);
              }
            } catch (error) {
              console.error('Error updating instance status from webhook:', error);
            }
          }
          break;
        case 'messages.upsert':
          console.log('New message received:', data);
          
          // Processar resposta automática com AI
          try {
            const isAutoReplyEnabled = await whatsappAIHandler.isAutoReplyEnabled(instance);
            if (isAutoReplyEnabled) {
              // Executar em background para não bloquear o webhook
              whatsappAIHandler.handleIncomingMessage(instance, data).catch(error => {
                console.error('❌ Erro ao processar resposta automática:', error);
              });
            }
          } catch (error) {
            console.error('❌ Erro ao verificar auto-reply:', error);
          }
          break;
        case 'messages.update':
          console.log('Message updated:', data);
          break;
        case 'messages.delete':
          console.log('Message deleted:', data);
          break;
        default:
          console.log('Unhandled event:', event);
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  });

  app.get("/api/client/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // For now, return empty array - this would be implemented based on business logic
      res.json([]);
    } catch (error) {
      console.error("Error fetching client conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/client/conversations/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      // For now, just return success - this would be implemented based on business logic
      res.json({ message: "Conversa arquivada com sucesso" });
    } catch (error) {
      console.error("Error archiving conversation:", error);
      res.status(500).json({ message: "Failed to archive conversation" });
    }
  });

  // Client profile routes
  app.get("/api/client/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get client data for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(404).json({ message: "Client data not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client profile:", error);
      res.status(500).json({ message: "Failed to fetch client profile" });
    }
  });

  app.put("/api/client/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get client data for the current user
      const client = await storage.getClientByUserId(userId);
      if (!client) {
        return res.status(404).json({ message: "Client data not found" });
      }
      
      const { editClientSchema } = await import("@shared/schema");
      const validatedData = editClientSchema.parse(req.body);
      
      const updatedClient = await storage.updateClient(client.id, validatedData);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client profile" });
    }
  });

  // Client AI Settings routes
  app.get("/api/client/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Get client's custom AI settings
      const clientSettings = await storage.getClientAISettings(userId);
      res.json(clientSettings || {});
    } catch (error) {
      console.error("Error fetching client AI settings:", error);
      res.status(500).json({ message: "Failed to fetch client AI settings" });
    }
  });

  app.post("/api/client/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { systemPrompt, maxTokens, temperature } = req.body;
      
      // Validate the data
      const clientAISettings = {
        systemPrompt: systemPrompt || null,
        maxTokens: maxTokens || null,
        temperature: temperature !== undefined ? temperature : null,
      };
      
      await storage.saveClientAISettings(userId, clientAISettings);
      
      res.json({ 
        message: "Configurações de IA salvas com sucesso",
        settings: clientAISettings
      });
    } catch (error) {
      console.error("Error saving client AI settings:", error);
      res.status(500).json({ message: "Failed to save client AI settings" });
    }
  });

  app.post("/api/client/ai-chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { message, settings } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get admin AI settings
      const adminSettings = await storage.getAISettings();
      if (!adminSettings.chatGptApiKey) {
        return res.status(400).json({ 
          success: false, 
          error: "API key não configurada pelo administrador" 
        });
      }

      // Merge client settings with admin settings (client settings override admin settings)
      const effectiveSettings = {
        chatGptApiKey: adminSettings.chatGptApiKey,
        model: adminSettings.model,
        systemPrompt: settings?.systemPrompt || adminSettings.systemPrompt,
        maxTokens: settings?.maxTokens || adminSettings.maxTokens,
        temperature: settings?.temperature !== undefined ? settings.temperature : adminSettings.temperature,
      };

      console.log("Client AI chat with:", { 
        message: message.substring(0, 50) + "...", 
        model: effectiveSettings.model,
        hasCustomPrompt: !!settings?.systemPrompt,
        hasCustomTokens: !!settings?.maxTokens,
        hasCustomTemperature: settings?.temperature !== undefined
      });

      const response = await openaiService.chat(message, effectiveSettings, userId);
      res.json(response);
    } catch (error) {
      console.error("Error in client AI chat:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to process AI chat" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
