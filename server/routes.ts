import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertClientSchema, insertTeamMemberSchema, insertProjectSchema, insertInvoiceSchema, aiSettingsSchema } from "@shared/schema";
import { openaiService } from "./openai";
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
      
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
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
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, validatedData);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update client" });
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
        model: settings.model,
        hasApiKey: !!settings.chatGptApiKey 
      });

      const chatResult = await openaiService.testChat(message, settings);
      
      console.log("Chat result:", { 
        success: chatResult.success, 
        hasResponse: !!chatResult.response,
        error: chatResult.error 
      });
      
      // Record usage if successful
      if (chatResult.success && chatResult.usage) {
        try {
          await storage.recordAIUsage({
            userId: userId,
            model: settings.model,
            promptTokens: chatResult.usage.promptTokens,
            completionTokens: chatResult.usage.completionTokens,
            totalTokens: chatResult.usage.totalTokens,
            cost: chatResult.usage.cost,
            requestType: 'test',
            success: true
          });
          console.log("Usage recorded successfully");
        } catch (usageError) {
          console.error("Error recording usage:", usageError);
          // Don't fail the request if usage recording fails
        }
      }
      
      if (!chatResult.success) {
        return res.status(400).json({ 
          message: chatResult.error || "Failed to test AI chat",
          error: chatResult.error 
        });
      }
      
      res.json(chatResult);
    } catch (error) {
      console.error("Error testing AI chat:", error);
      res.status(500).json({ 
        message: "Failed to test AI chat",
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
