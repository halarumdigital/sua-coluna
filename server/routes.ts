import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PDFProcessor } from "./pdf-processor";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTeamMemberSchema, insertProjectSchema, insertInvoiceSchema, aiSettingsSchema } from "@shared/schema";
import { openaiService } from "./openai";
import { whatsappAIHandler } from "./whatsapp-ai-handler";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db } from "./db";
import { aiUsage } from "@shared/schema";
import { sum, count, desc, sql, eq, and, ne, asc } from "drizzle-orm";
import { plans, franchises, franchisePhoneNumbers, franchiseAgents, franchisePrompts, globalPrompts, customAIAgents, createCustomAIAgentSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  const path = await import('path');
  const express = await import('express');
  app.use('/uploads', express.default.static(path.join(process.cwd(), 'public', 'uploads')));
  
  // Serve static files from client/ai directory for testing
  app.use('/ai', express.default.static(path.join(process.cwd(), 'client', 'ai')));

  // System settings route (public - no auth required)
  app.get("/api/system/settings", async (req: any, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  // Temporary route to update webhook URLs to custom domain (REMOVE AFTER USE)
  app.post("/api/admin/update-webhook-urls", async (req: any, res) => {
    try {
      const { customDomain } = req.body;
      const finalDomain = customDomain || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      console.log(`🔧 Atualizando webhooks para o domínio: ${finalDomain}`);
      
      // Update WhatsApp API settings
      await db.execute(sql`
        UPDATE whatsapp_api_settings 
        SET system_url = ${finalDomain}
        WHERE id IS NOT NULL
      `);
      console.log('✅ whatsapp_api_settings atualizada');
      
      // Update WhatsApp instances webhooks
      await db.execute(sql`
        UPDATE whatsapp_instances 
        SET webhook = CONCAT(${finalDomain}, '/api/client/whatsapp-webhook/', instance_key)
        WHERE instance_key IS NOT NULL
      `);
      console.log('✅ whatsapp_instances webhooks atualizadas');
      
      // Update admin WhatsApp instances webhooks  
      await db.execute(sql`
        UPDATE admin_whatsapp_instances 
        SET webhook = CONCAT(${finalDomain}, '/api/admin/whatsapp-webhook/', instance_key)
        WHERE instance_key IS NOT NULL
      `);
      console.log('✅ admin_whatsapp_instances webhooks atualizadas');
      
      console.log('🎯 Todas as URLs de webhook foram atualizadas!');
      res.json({ 
        message: 'URLs de webhook atualizadas com sucesso',
        domain: finalDomain
      });
      
    } catch (error: any) {
      console.error('❌ Erro durante a atualização:', error);
      res.status(500).json({ message: 'Erro durante a atualização', error: error.message });
    }
  });

  // Temporary route to fix WhatsApp instances table (REMOVE AFTER USE)
  app.post("/api/admin/fix-whatsapp-table", async (req: any, res) => {
    try {
      console.log('🔧 Executando correção da tabela whatsapp_instances...');
      
      // 1. Adicionar coluna franchise_id se não existir
      try {
        await db.execute(sql`ALTER TABLE whatsapp_instances ADD COLUMN IF NOT EXISTS franchise_id VARCHAR(36) AFTER id`);
        console.log('✅ Coluna franchise_id adicionada/verificada');
      } catch (error: any) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log('ℹ️  Coluna franchise_id já existe');
        } else {
          throw error;
        }
      }
      
      // 2. Remover coluna client_id
      try {
        await db.execute(sql`ALTER TABLE whatsapp_instances DROP COLUMN client_id`);
        console.log('✅ Coluna client_id removida');
      } catch (error: any) {
        if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log('ℹ️  Coluna client_id não existe ou não pode ser removida');
        } else {
          throw error;
        }
      }
      
      // 3. Remover índice antigo se existir
      try {
        await db.execute(sql`DROP INDEX idx_whatsapp_instances_client ON whatsapp_instances`);
        console.log('✅ Índice antigo removido');
      } catch (error: any) {
        console.log('ℹ️  Índice antigo não existe ou já foi removido');
      }
      
      // 4. Adicionar novo índice para franchise_id
      try {
        await db.execute(sql`ALTER TABLE whatsapp_instances ADD INDEX idx_whatsapp_instances_franchise (franchise_id)`);
        console.log('✅ Novo índice adicionado');
      } catch (error: any) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log('ℹ️  Índice já existe');
        } else {
          throw error;
        }
      }
      
      // 5. Definir franchise_id como NOT NULL
      try {
        await db.execute(sql`ALTER TABLE whatsapp_instances MODIFY COLUMN franchise_id VARCHAR(36) NOT NULL`);
        console.log('✅ Coluna franchise_id definida como NOT NULL');
      } catch (error: any) {
        console.log('⚠️  Erro ao definir NOT NULL:', error.message);
      }
      
      console.log('🎯 Tabela whatsapp_instances corrigida com sucesso!');
      res.json({ message: 'Tabela corrigida com sucesso' });
      
    } catch (error: any) {
      console.error('❌ Erro durante a correção:', error);
      res.status(500).json({ message: 'Erro durante a correção', error: error.message });
    }
  });

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

  // Admin plan usage and limits
  app.get("/api/admin/plan-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Dados do franqueador não encontrados" });
      }

      const [plan] = await db.select().from(plans).where(eq(plans.id, franchisor.planId));
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }

      const [franchiseCountRow] = await db
        .select({ value: count() })
        .from(franchises)
        .where(eq(franchises.franchisorId, franchisor.id));

      const [phoneNumbersCountRow] = await db
        .select({ value: count() })
        .from(franchisePhoneNumbers)
        .innerJoin(franchises, eq(franchisePhoneNumbers.franchiseId, franchises.id))
        .where(eq(franchises.franchisorId, franchisor.id));

      const [agentsCountRow] = await db
        .select({ value: count() })
        .from(franchiseAgents)
        .innerJoin(franchises, eq(franchiseAgents.franchiseId, franchises.id))
        .where(eq(franchises.franchisorId, franchisor.id));

      const [franchisePromptsCountRow] = await db
        .select({ value: count() })
        .from(franchisePrompts)
        .innerJoin(franchises, eq(franchisePrompts.franchiseId, franchises.id))
        .where(eq(franchises.franchisorId, franchisor.id));

      const [globalPromptsCountRow] = await db
        .select({ value: count() })
        .from(globalPrompts)
        .where(eq(globalPrompts.franchisorId, franchisor.id));

      res.json({
        plan: {
          id: plan.id,
          name: plan.name,
          maxFranchises: plan.maxFranchises,
          maxPhoneNumbers: plan.maxPhoneNumbers,
          maxAgents: plan.maxAgents,
          maxPrompts: plan.maxPrompts,
        },
        usage: {
          franchisesCount: Number(franchiseCountRow?.value || 0),
          phoneNumbersCount: Number(phoneNumbersCountRow?.value || 0),
          agentsCount: Number(agentsCountRow?.value || 0),
          franchisePromptsCount: Number(franchisePromptsCountRow?.value || 0),
          globalPromptsCount: Number(globalPromptsCountRow?.value || 0),
        }
      });
    } catch (error) {
      console.error("Error fetching plan usage:", error);
      res.status(500).json({ message: "Erro ao buscar limites do plano" });
    }
  });

  // Super Root Settings routes
  app.get("/api/super-root/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.post("/api/super-root/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Handle multipart form data
      const multer = await import('multer');
      const upload = multer.default({
        storage: multer.default.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
      });

      const uploadFields = upload.fields([
        { name: 'logo', maxCount: 1 },
        { name: 'favicon', maxCount: 1 }
      ]);

      uploadFields(req, res, async (err: any) => {
        if (err) {
          console.error("Upload error:", err);
          return res.status(400).json({ message: "Error uploading files" });
        }

        try {
          console.log("📝 Form data received:", req.body);
          console.log("📁 Files received:", req.files ? Object.keys(req.files) : 'none');

          const settings = await storage.updateSystemSettings(req.body, req.files);

          console.log("✅ Settings updated successfully");
          res.json({
            message: "Configurações salvas com sucesso",
            settings
          });
        } catch (error) {
          console.error("❌ Error saving system settings:", error);
          res.status(500).json({
            message: "Failed to save system settings",
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });
    } catch (error) {
      console.error("Error in system settings route:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Super Root Profile routes
  app.get("/api/super-root/profile", isAuthenticated, async (req: any, res) => {
    try {
      console.log("🔍 Super Root Profile GET - Starting");
      const userId = getCurrentUserId(req);
      console.log("👤 User ID:", userId);

      if (!userId) {
        console.log("❌ No user ID found");
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      console.log("👤 User found:", user ? `${user.firstName} ${user.lastName} (${user.role})` : 'null');

      if (user?.role !== 'super_root') {
        console.log("❌ Access denied - user role:", user?.role);
        return res.status(403).json({ message: "Access denied" });
      }

      // Retornar dados do usuário (sem senha)
      const { password, ...userProfile } = user;
      console.log("✅ Returning profile data");
      res.json(userProfile);
    } catch (error) {
      console.error("❌ Error fetching super root profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/super-root/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { editSuperRootProfileSchema } = await import("@shared/schema");
      const validatedData = editSuperRootProfileSchema.parse(req.body);

      // Se está alterando senha, verificar senha atual
      if (validatedData.newPassword && validatedData.currentPassword) {
        const bcrypt = await import('bcrypt');
        const isValidPassword = await bcrypt.compare(validatedData.currentPassword, user.password || '');

        if (!isValidPassword) {
          return res.status(400).json({ message: "Senha atual incorreta" });
        }
      }

      const updatedUser = await storage.updateSuperRootProfile(userId, validatedData);
      res.json({
        message: "Perfil atualizado com sucesso",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating super root profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Franchisors routes (Super Root only)
  app.get("/api/super-root/franchisors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const franchisors = await storage.getAllFranchisors();
      res.json(franchisors);
    } catch (error) {
      console.error("Error fetching franchisors:", error);
      res.status(500).json({ message: "Failed to fetch franchisors" });
    }
  });

  app.post("/api/super-root/franchisors", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { createFranchisorSchema } = await import("@shared/schema");
      const validatedData = createFranchisorSchema.parse(req.body);

      const franchisor = await storage.createFranchisor(validatedData);
      res.json({
        message: "Franqueador criado com sucesso",
        franchisor
      });
    } catch (error) {
      console.error("Error creating franchisor:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: firstError?.message || "Dados inválidos", 
          errors: error.errors 
        });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put("/api/super-root/franchisors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { createFranchisorSchema } = await import("@shared/schema");
      const validatedData = createFranchisorSchema.parse(req.body);

      const franchisor = await storage.updateFranchisor(id, validatedData);
      res.json({
        message: "Franqueador atualizado com sucesso",
        franchisor
      });
    } catch (error) {
      console.error("Error updating franchisor:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update franchisor" });
    }
  });

  app.delete("/api/super-root/franchisors/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      await storage.deleteFranchisor(id);
      res.json({ message: "Franqueador excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting franchisor:", error);
      res.status(500).json({ message: "Failed to delete franchisor" });
    }
  });

  // Plans routes (Super Root only)
  app.get("/api/super-root/plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post("/api/super-root/plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { createPlanSchema } = await import("@shared/schema");
      const validatedData = createPlanSchema.parse(req.body);

      const plan = await storage.createPlan(validatedData);
      res.json({
        message: "Plano criado com sucesso",
        plan
      });
    } catch (error) {
      console.error("Error creating plan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.put("/api/super-root/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      const { createPlanSchema } = await import("@shared/schema");
      const validatedData = createPlanSchema.parse(req.body);

      const plan = await storage.updatePlan(id, validatedData);
      res.json({
        message: "Plano atualizado com sucesso",
        plan
      });
    } catch (error) {
      console.error("Error updating plan:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  app.delete("/api/super-root/plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { id } = req.params;
      await storage.deletePlan(id);
      res.json({ message: "Plano excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  // Super Root Routes - WhatsApp Settings
  app.get("/api/super-root/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      const settings = await storage.getWhatsappApiSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching WhatsApp settings:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp settings" });
    }
  });

  app.post("/api/super-root/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      const { whatsappApiSettingsSchema } = await import("@shared/schema");
      const validatedData = whatsappApiSettingsSchema.parse(req.body);

      const settings = await storage.saveWhatsappApiSettings(validatedData, userId);

      res.json(settings);
    } catch (error) {
      console.error("Error saving WhatsApp settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save WhatsApp settings" });
    }
  });

  // Super Root Routes - AI Settings
  app.get("/api/super-root/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      const settings = await storage.getAISettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ message: "Failed to fetch AI settings" });
    }
  });

  app.post("/api/super-root/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      const { aiSettingsSchema } = await import("@shared/schema");
      const validatedData = aiSettingsSchema.parse(req.body);

      await storage.saveAISettings(validatedData);
      res.json({ message: "Configurações de IA salvas com sucesso" });
    } catch (error) {
      console.error("Error saving AI settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save AI settings" });
    }
  });

  app.get("/api/super-root/ai-models", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      // Return available AI models
      const models = [
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
        { id: "gpt-4", name: "GPT-4" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
        { id: "gpt-4o", name: "GPT-4o" },
      ];

      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  app.get("/api/super-root/ai-usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      // Get AI usage statistics
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const [totalUsage] = await db
        .select({
          totalTokens: sum(aiUsage.totalTokens),
          totalCost: sum(aiUsage.cost),
        })
        .from(aiUsage);

      const [todayUsage] = await db
        .select({
          requestsToday: count(),
        })
        .from(aiUsage)
        .where(sql`${aiUsage.createdAt} >= ${startOfDay}`);

      const [monthUsage] = await db
        .select({
          requestsThisMonth: count(),
        })
        .from(aiUsage)
        .where(sql`${aiUsage.createdAt} >= ${startOfMonth}`);

      const [lastUsage] = await db
        .select({
          lastUsed: aiUsage.createdAt,
        })
        .from(aiUsage)
        .orderBy(desc(aiUsage.createdAt))
        .limit(1);

      res.json({
        totalTokens: Number(totalUsage?.totalTokens || 0),
        totalCost: Number(totalUsage?.totalCost || 0),
        requestsToday: Number(todayUsage?.requestsToday || 0),
        requestsThisMonth: Number(monthUsage?.requestsThisMonth || 0),
        lastUsed: lastUsage?.lastUsed || null,
      });
    } catch (error) {
      console.error("Error fetching AI usage:", error);
      res.status(500).json({ message: "Failed to fetch AI usage" });
    }
  });

  app.post("/api/super-root/ai-test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      const settings = await storage.getAISettings();

      if (!settings.chatGptApiKey) {
        return res.status(400).json({
          success: false,
          error: "API key not configured"
        });
      }

      try {
        const { openaiService } = await import("./openai");
        const testResult = await openaiService.testConnection();

        res.json({
          success: true,
          model: testResult.model,
          message: "Connection successful"
        });
      } catch (testError: any) {
        res.json({
          success: false,
          error: testError.message || "Failed to connect to OpenAI API"
        });
      }
    } catch (error) {
      console.error("Error testing AI connection:", error);
      res.status(500).json({ message: "Failed to test AI connection" });
    }
  });

  app.post("/api/super-root/ai-chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Super Root only" });
      }

      const { message, settings } = req.body;

      if (!message || !settings) {
        return res.status(400).json({
          success: false,
          error: "Message and settings are required"
        });
      }

      if (!settings.chatGptApiKey) {
        return res.status(400).json({
          success: false,
          error: "API key not configured"
        });
      }

      try {
        const { openaiService } = await import("./openai");
        const result = await openaiService.chat(message, settings, userId);

        if (result.success) {
          res.json({
            success: true,
            response: result.response
          });
        } else {
          res.json({
            success: false,
            error: result.error || "Failed to generate response"
          });
        }
      } catch (testError: any) {
        res.json({
          success: false,
          error: testError.message || "Failed to generate response"
        });
      }
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to process AI chat" });
    }
  });

  // Admin/Franchisor routes for AI settings (shared with super root)
  app.get("/api/admin/ai-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin' && user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Admin/Franchisor only" });
      }

      const settings = await storage.getAISettings();
      res.json(settings);
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
      if (user?.role !== 'franchisor' && user?.role !== 'admin' && user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Admin/Franchisor only" });
      }

      const { aiSettingsSchema } = await import("@shared/schema");
      const validatedData = aiSettingsSchema.parse(req.body);

      await storage.saveAISettings(validatedData);
      res.json({ message: "Configurações de IA salvas com sucesso" });
    } catch (error) {
      console.error("Error saving AI settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save AI settings" });
    }
  });

  app.get("/api/admin/ai-models", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin' && user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Admin/Franchisor only" });
      }

      // Return available AI models
      const models = [
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
        { id: "gpt-4", name: "GPT-4" },
        { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
        { id: "gpt-4o", name: "GPT-4o" },
      ];

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
      if (user?.role !== 'franchisor' && user?.role !== 'admin' && user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Admin/Franchisor only" });
      }

      // Get AI usage statistics
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const [totalUsage] = await db
        .select({
          totalTokens: sum(aiUsage.totalTokens),
          totalCost: sum(aiUsage.cost),
        })
        .from(aiUsage);

      const [todayUsage] = await db
        .select({
          requestsToday: count(),
        })
        .from(aiUsage)
        .where(sql`${aiUsage.createdAt} >= ${startOfDay}`);

      const [monthUsage] = await db
        .select({
          requestsThisMonth: count(),
        })
        .from(aiUsage)
        .where(sql`${aiUsage.createdAt} >= ${startOfMonth}`);

      const [lastUsage] = await db
        .select({
          lastUsed: aiUsage.createdAt,
        })
        .from(aiUsage)
        .orderBy(desc(aiUsage.createdAt))
        .limit(1);

      res.json({
        totalTokens: Number(totalUsage?.totalTokens || 0),
        totalCost: Number(totalUsage?.totalCost || 0),
        requestsToday: Number(todayUsage?.requestsToday || 0),
        requestsThisMonth: Number(monthUsage?.requestsThisMonth || 0),
        lastUsed: lastUsage?.lastUsed || null,
      });
    } catch (error) {
      console.error("Error fetching AI usage:", error);
      res.status(500).json({ message: "Failed to fetch AI usage" });
    }
  });

  app.post("/api/admin/ai-test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin' && user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Admin/Franchisor only" });
      }

      const settings = await storage.getAISettings();

      if (!settings.chatGptApiKey) {
        return res.status(400).json({
          success: false,
          error: "API key not configured"
        });
      }

      try {
        const { openaiService } = await import("./openai");
        const testResult = await openaiService.testConnection();

        res.json({
          success: true,
          model: testResult.model,
          message: "Connection successful"
        });
      } catch (testError: any) {
        res.json({
          success: false,
          error: testError.message || "Failed to connect to OpenAI API"
        });
      }
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
      if (user?.role !== 'franchisor' && user?.role !== 'admin' && user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied - Admin/Franchisor only" });
      }

      const { message, settings } = req.body;

      if (!message || !settings) {
        return res.status(400).json({
          success: false,
          error: "Message and settings are required"
        });
      }

      if (!settings.chatGptApiKey) {
        return res.status(400).json({
          success: false,
          error: "API key not configured"
        });
      }

      try {
        const { openaiService } = await import("./openai");
        const result = await openaiService.chat(message, settings, userId);

        if (result.success) {
          res.json({
            success: true,
            response: result.response
          });
        } else {
          res.json({
            success: false,
            error: result.error || "Failed to generate response"
          });
        }
      } catch (testError: any) {
        res.json({
          success: false,
          error: testError.message || "Failed to generate response"
        });
      }
    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({ message: "Failed to process AI chat" });
    }
  });

  // Client routes for custom AI agents
  app.get("/api/client/custom-agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use super-root AI settings instead",
          redirect: "/super-root/ai"
        });
      }

      const agents = await db
        .select()
        .from(customAIAgents)
        .where(eq(customAIAgents.userId, userId))
        .orderBy(desc(customAIAgents.createdAt));

      res.json(agents);
    } catch (error) {
      console.error("Error fetching custom AI agents:", error);
      res.status(500).json({ message: "Failed to fetch custom AI agents" });
    }
  });

  app.post("/api/client/custom-agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use super-root AI settings instead",
          redirect: "/super-root/ai"
        });
      }

      const validatedData = createCustomAIAgentSchema.parse(req.body);
      
      // Processar PDFs se houver dados
      let pdfFiles = validatedData.pdfFiles || [];
      let pdfContents = validatedData.pdfContents || [];
      
      if (validatedData.pdfData && validatedData.pdfData.length > 0) {
        console.log(`🔄 Processando ${validatedData.pdfData.length} arquivo(s) PDF...`);
        
        try {
          pdfContents = await PDFProcessor.processPDFContents(validatedData.pdfData);
          pdfFiles = validatedData.pdfData.map(pdf => pdf.fileName);
          
          console.log(`✅ PDFs processados: ${pdfFiles.join(', ')}`);
        } catch (error) {
          console.error('❌ Erro ao processar PDFs:', error);
          return res.status(400).json({ 
            message: "Erro ao processar arquivos PDF", 
            error: error.message 
          });
        }
      }
      
      // Aprimorar prompt com conteúdo dos PDFs
      const enhancedPrompt = PDFProcessor.enhancePromptWithPDFs(
        validatedData.systemPrompt, 
        pdfContents
      );

      const result = await db
        .insert(customAIAgents)
        .values({
          ...validatedData,
          systemPrompt: enhancedPrompt,
          pdfFiles: JSON.stringify(pdfFiles),
          pdfContents: JSON.stringify(pdfContents),
          userId,
        });

      // Buscar o agente criado mais recente para este usuário
      const createdAgent = await db
        .select()
        .from(customAIAgents)
        .where(eq(customAIAgents.userId, userId))
        .orderBy(desc(customAIAgents.createdAt))
        .limit(1);

      res.status(201).json(createdAgent[0]);
    } catch (error) {
      console.error("Error creating custom AI agent:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create custom AI agent" });
    }
  });

  app.put("/api/client/custom-agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use super-root AI settings instead",
          redirect: "/super-root/ai"
        });
      }

      const { id } = req.params;
      const validatedData = createCustomAIAgentSchema.parse(req.body);

      // Verificar se o agente pertence ao usuário
      const existingAgent = await db
        .select()
        .from(customAIAgents)
        .where(and(eq(customAIAgents.id, id), eq(customAIAgents.userId, userId)))
        .limit(1);

      if (!existingAgent.length) {
        return res.status(404).json({ message: "Agente não encontrado" });
      }
      
      // Processar PDFs se houver dados
      let pdfFiles = validatedData.pdfFiles || [];
      let pdfContents = validatedData.pdfContents || [];
      
      if (validatedData.pdfData && validatedData.pdfData.length > 0) {
        console.log(`🔄 Processando ${validatedData.pdfData.length} arquivo(s) PDF para atualização...`);
        
        try {
          pdfContents = await PDFProcessor.processPDFContents(validatedData.pdfData);
          pdfFiles = validatedData.pdfData.map(pdf => pdf.fileName);
          
          console.log(`✅ PDFs processados para atualização: ${pdfFiles.join(', ')}`);
        } catch (error) {
          console.error('❌ Erro ao processar PDFs:', error);
          return res.status(400).json({ 
            message: "Erro ao processar arquivos PDF", 
            error: error.message 
          });
        }
      }
      
      // Aprimorar prompt com conteúdo dos PDFs
      const enhancedPrompt = PDFProcessor.enhancePromptWithPDFs(
        validatedData.systemPrompt, 
        pdfContents
      );

      await db
        .update(customAIAgents)
        .set({
          ...validatedData,
          systemPrompt: enhancedPrompt,
          pdfFiles: JSON.stringify(pdfFiles),
          pdfContents: JSON.stringify(pdfContents),
          updatedAt: new Date(),
        })
        .where(eq(customAIAgents.id, id));

      const updatedAgent = await db
        .select()
        .from(customAIAgents)
        .where(eq(customAIAgents.id, id))
        .limit(1);

      res.json(updatedAgent[0]);
    } catch (error) {
      console.error("Error updating custom AI agent:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update custom AI agent" });
    }
  });

  app.delete("/api/client/custom-agents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use super-root AI settings instead",
          redirect: "/super-root/ai"
        });
      }

      const { id } = req.params;

      // Verificar se o agente pertence ao usuário
      const existingAgent = await db
        .select()
        .from(customAIAgents)
        .where(and(eq(customAIAgents.id, id), eq(customAIAgents.userId, userId)))
        .limit(1);

      if (!existingAgent.length) {
        return res.status(404).json({ message: "Agente não encontrado" });
      }

      await db
        .delete(customAIAgents)
        .where(eq(customAIAgents.id, id));

      res.json({ message: "Agente deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting custom AI agent:", error);
      res.status(500).json({ message: "Failed to delete custom AI agent" });
    }
  });

  // Client routes for instance-agent bindings
  app.get("/api/client/instance-agent-bindings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use admin routes instead",
          redirect: "/admin/whatsapp"
        });
      }

      // Buscar vinculações do usuário através da franquia
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      // Buscar vinculações através das instâncias da franquia
      const bindings = await storage.getFranchiseInstanceAgentBindings(franchise.id);

      res.json(bindings);
    } catch (error) {
      console.error("Error fetching client instance-agent bindings:", error);
      res.status(500).json({ message: "Failed to fetch instance-agent bindings" });
    }
  });

  app.post("/api/client/instance-agent-bindings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use admin routes instead",
          redirect: "/admin/whatsapp"
        });
      }

      const { instanceId, agentId } = req.body;
      
      if (!instanceId || !agentId) {
        return res.status(400).json({ message: "Instance ID and Agent ID are required" });
      }

      // Verificar se a instância pertence ao usuário através da franquia
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      const instance = await storage.getWhatsappInstance(instanceId);
      if (!instance) {
        return res.status(404).json({ message: "WhatsApp instance not found" });
      }
      
      // Verificar se a instância pertence à franquia do usuário
      if (instance.franchiseId !== franchise.id) {
        return res.status(403).json({ message: "Access denied: instance does not belong to your franchise" });
      }

      // Verificar se o agente pertence ao usuário
      const agent = await db
        .select()
        .from(customAIAgents)
        .where(and(eq(customAIAgents.id, agentId), eq(customAIAgents.userId, userId)))
        .limit(1);

      if (!agent.length) {
        return res.status(404).json({ message: "Custom AI agent not found or access denied" });
      }

      // Verificar se o agente está ativo
      if (!agent[0].isActive) {
        return res.status(400).json({ message: "Agent is not active" });
      }

      // Verificar se já existe uma vinculação para esta instância
      const existingBindings = await storage.getFranchiseInstanceAgentBindings(franchise.id);
      const existingBinding = existingBindings.find(b => b.instanceId === instanceId);
      if (existingBinding) {
        return res.status(400).json({ message: "This instance already has an agent binding" });
      }

      // Criar vinculação
      const binding = await storage.createClientWhatsappInstanceAgentBinding({
        instanceId,
        agentId,
        userId,
        isActive: true
      });

      res.status(201).json(binding);
    } catch (error) {
      console.error("Error creating client instance-agent binding:", error);
      res.status(500).json({ message: "Failed to create instance-agent binding" });
    }
  });

  app.put("/api/client/instance-agent-bindings/:bindingId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use admin routes instead",
          redirect: "/admin/whatsapp"
        });
      }

      const { bindingId } = req.params;
      const { isActive } = req.body;

      // Verificar se a vinculação pertence ao usuário através da franquia
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      const binding = await storage.getClientInstanceAgentBindingById(bindingId);
      if (!binding) {
        return res.status(404).json({ message: "Binding not found or access denied" });
      }
      
      // TODO: Verificar se a vinculação pertence à franquia do usuário
      const instance = await storage.getWhatsappInstance(binding.instanceId);
      if (!instance) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Atualizar vinculação
      const updatedBinding = await storage.updateClientWhatsappInstanceAgentBinding(bindingId, { isActive });

      res.json(updatedBinding);
    } catch (error) {
      console.error("Error updating client instance-agent binding:", error);
      res.status(500).json({ message: "Failed to update instance-agent binding" });
    }
  });

  app.delete("/api/client/instance-agent-bindings/:bindingId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem permissão para acessar esta rota
      const user = await storage.getUser(userId);
      if (user?.role === 'super_root') {
        return res.status(403).json({ 
          message: "Super root users should use admin routes instead",
          redirect: "/admin/whatsapp"
        });
      }

      const { bindingId } = req.params;

      // Verificar se a vinculação pertence ao usuário através da franquia
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      const binding = await storage.getClientInstanceAgentBindingById(bindingId);
      if (!binding) {
        return res.status(404).json({ message: "Binding not found or access denied" });
      }
      
      // TODO: Verificar se a vinculação pertence à franquia do usuário
      const instance = await storage.getWhatsappInstance(binding.instanceId);
      if (!instance) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Remover vinculação
      await storage.deleteClientWhatsappInstanceAgentBinding(bindingId);

      res.json({ message: "Binding deleted successfully" });
    } catch (error) {
      console.error("Error deleting client instance-agent binding:", error);
      res.status(500).json({ message: "Failed to delete instance-agent binding" });
    }
  });

  // Admin/Franchisor routes for managing franchises
  app.get("/api/admin/franchises", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied - Franchisor only" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Franchisor data not found" });
      }

      const franchises = await storage.getFranchisesByFranchisorId(franchisor.id);
      res.json(franchises);
    } catch (error) {
      console.error("Error fetching franchises:", error);
      res.status(500).json({ message: "Failed to fetch franchises" });
    }
  });

  app.post("/api/admin/franchises", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Dados do franqueador não encontrados" });
      }

      // Limite de franquias por plano
      const [plan] = await db.select().from(plans).where(eq(plans.id, franchisor.planId));
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      const [franchiseCountRow] = await db
        .select({ value: count() })
        .from(franchises)
        .where(eq(franchises.franchisorId, franchisor.id));
      const currentFranchises = Number(franchiseCountRow?.value || 0);
      if (currentFranchises >= Number(plan.maxFranchises)) {
        return res.status(403).json({
          message: `Limite de franquias atingido para o plano (${plan.maxFranchises}). Atualize seu plano para criar mais franquias.`,
          code: 'LIMIT_REACHED',
          limit: Number(plan.maxFranchises),
          current: currentFranchises,
        });
      }

      const { createFranchiseSchema } = await import("@shared/schema");
      const validatedData = createFranchiseSchema.parse(req.body);

      const franchise = await storage.createFranchise(franchisor.id, validatedData);
      res.json({
        message: "Franquia criada com sucesso",
        franchise
      });
    } catch (error) {
      console.error("Error creating franchise:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: firstError?.message || "Dados inválidos", 
          errors: error.errors 
        });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get("/api/admin/franchises/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied - Franchisor only" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Franchisor data not found" });
      }

      const { id } = req.params;
      const franchise = await storage.getFranchise(id);
      
      if (!franchise || franchise.franchisorId !== franchisor.id) {
        return res.status(404).json({ message: "Franchise not found" });
      }

      res.json(franchise);
    } catch (error) {
      console.error("Error fetching franchise:", error);
      res.status(500).json({ message: "Failed to fetch franchise" });
    }
  });

  app.put("/api/admin/franchises/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Dados do franqueador não encontrados" });
      }

      const { id } = req.params;
      const franchise = await storage.getFranchise(id);
      
      if (!franchise || franchise.franchisorId !== franchisor.id) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      const { createFranchiseSchema } = await import("@shared/schema");
      const validatedData = createFranchiseSchema.parse(req.body);

      const updatedFranchise = await storage.updateFranchise(id, validatedData);
      res.json({
        message: "Franquia atualizada com sucesso",
        franchise: updatedFranchise
      });
    } catch (error) {
      console.error("Error updating franchise:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: firstError?.message || "Dados inválidos", 
          errors: error.errors 
        });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/admin/franchises/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Dados do franqueador não encontrados" });
      }

      const { id } = req.params;
      const franchise = await storage.getFranchise(id);
      
      if (!franchise || franchise.franchisorId !== franchisor.id) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      await storage.deleteFranchise(id);
      res.json({ message: "Franquia excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting franchise:", error);
      res.status(500).json({ message: "Erro ao excluir franquia" });
    }
  });

  // Global Prompts routes (Admin/Franchisor only)
  app.get("/api/admin/global-prompts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Dados do franqueador não encontrados" });
      }

      const globalPrompts = await storage.getGlobalPrompts(franchisor.id);
      res.json(globalPrompts);
    } catch (error) {
      console.error("Error fetching global prompts:", error);
      res.status(500).json({ message: "Erro ao buscar prompts globais" });
    }
  });

  app.post("/api/admin/global-prompts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Dados do franqueador não encontrados" });
      }

      // Limite de prompts por plano (globais + de franquias)
      const [plan] = await db.select().from(plans).where(eq(plans.id, franchisor.planId));
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      const [franchisePromptsCountRow] = await db
        .select({ value: count() })
        .from(franchisePrompts)
        .innerJoin(franchises, eq(franchisePrompts.franchiseId, franchises.id))
        .where(eq(franchises.franchisorId, franchisor.id));
      const [globalPromptsCountRow] = await db
        .select({ value: count() })
        .from(globalPrompts)
        .where(eq(globalPrompts.franchisorId, franchisor.id));
      const totalPrompts = Number(franchisePromptsCountRow?.value || 0) + Number(globalPromptsCountRow?.value || 0);
      if (totalPrompts >= Number(plan.maxPrompts)) {
        return res.status(403).json({
          message: `Limite de prompts atingido para o plano (${plan.maxPrompts}). Atualize seu plano para criar mais prompts.`,
          code: 'LIMIT_REACHED',
          limit: Number(plan.maxPrompts),
          current: totalPrompts,
        });
      }

      const { createGlobalPromptSchema } = await import("@shared/schema");
      const validatedData = createGlobalPromptSchema.parse(req.body);

      const globalPrompt = await storage.createGlobalPrompt(franchisor.id, validatedData);
      res.json({
        message: "Prompt global criado com sucesso",
        prompt: globalPrompt
      });
    } catch (error) {
      console.error("Error creating global prompt:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: firstError?.message || "Dados inválidos", 
          errors: error.errors 
        });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.put("/api/admin/global-prompts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const franchisor = await storage.getFranchisorByUserId(userId);
      if (!franchisor) {
        return res.status(404).json({ message: "Dados do franqueador não encontrados" });
      }

      const { id } = req.params;
      const { createGlobalPromptSchema } = await import("@shared/schema");
      const validatedData = createGlobalPromptSchema.parse(req.body);

      const updatedPrompt = await storage.updateGlobalPrompt(id, validatedData);
      res.json({
        message: "Prompt global atualizado com sucesso",
        prompt: updatedPrompt
      });
    } catch (error) {
      console.error("Error updating global prompt:", error);
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        return res.status(400).json({ 
          message: firstError?.message || "Dados inválidos", 
          errors: error.errors 
        });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.delete("/api/admin/global-prompts/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const { id } = req.params;
      await storage.deleteGlobalPrompt(id);
      res.json({ message: "Prompt global excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting global prompt:", error);
      res.status(500).json({ message: "Erro ao excluir prompt global" });
    }
  });

    app.post("/api/admin/global-prompts/:id/test", isAuthenticated, async (req: any, res) => {
    try {
      console.log("🧪 Testing global prompt - route hit");
      
      const userId = getCurrentUserId(req);
      console.log("📝 User ID:", userId);
      
      if (!userId) {
        console.log("❌ No user ID found");
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      const user = await storage.getUser(userId);
      console.log("👤 User role:", user?.role);
      
      if (user?.role !== 'franchisor' && user?.role !== 'admin') {
        console.log("❌ Access denied for role:", user?.role);
        return res.status(403).json({ message: "Acesso negado - Apenas franqueadores" });
      }

      const { id } = req.params;
      const { testMessage } = req.body;
      
      console.log("🆔 Prompt ID:", id);
      console.log("💬 Test message:", testMessage?.substring(0, 50) + "...");

      if (!testMessage) {
        console.log("❌ No test message provided");
        return res.status(400).json({ message: "Mensagem de teste é obrigatória" });
      }

      console.log("🚀 Calling storage.testGlobalPrompt...");
      const result = await storage.testGlobalPrompt(id, testMessage);
      console.log("✅ Test result:", result);
      
      res.json(result);
    } catch (error) {
      console.error("💥 Error testing global prompt:", error);
      res.status(500).json({ 
        success: false,
        error: "Erro interno do servidor"
      });
    }
  });

  // Admin WhatsApp Settings and Instances routes
  app.get("/api/admin/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
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
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
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

  // Admin WhatsApp Instances routes
  app.get("/api/admin/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const instances = await storage.getAdminWhatsappInstances();
      res.json(instances);
    } catch (error) {
      console.error("Error fetching admin WhatsApp instances:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp instances" });
    }
  });

  // Configure Evolution API webhook for Admin WhatsApp instance (AI)
  app.post("/api/admin/whatsapp-instances/:instanceKey/webhook", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { instanceKey } = req.params;

      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }

      // Find instance
      const instance = await storage.getAdminWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      // Generate webhook URL using systemUrl from database
      const baseUrl = adminSettings.systemUrl || 
        (process.env.NODE_ENV === 'production' || (process as any).env.REPL_ID) 
          ? `https://${(process as any).env.REPL_SLUG}.${(process as any).env.REPL_OWNER}.repl.co`
          : req.protocol + '://' + req.get('host');

      const webhookUrl = `${baseUrl}/api/admin/whatsapp-webhook/${instanceKey}`;

      // If user provided a webhook config in the body, use/merge it; otherwise, build default
      const inputConfig = req.body?.webhook ? req.body : null;

      // Normalize headers key (autorization -> authorization) and base64 field name
      let webhookConfig: any;
      if (inputConfig) {
        const provided = inputConfig.webhook || {};
        const headers = { ...(provided.headers || {}) } as any;
        if (headers.autorization && !headers.authorization) {
          headers.authorization = headers.autorization;
          delete headers.autorization;
        }
        // Ensure mandatory content type
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
        // Ensure authorization header present using global token if missing
        if (!headers.authorization) {
          headers.authorization = `Bearer ${adminSettings.globalToken}`;
        }

        webhookConfig = {
          webhook: {
            enabled: provided.enabled ?? true,
            // Force server-constructed URL from System URL
            url: webhookUrl,
            headers,
            byEvents: provided.byEvents ?? false,
            // Evolution API expects base64/webhookBase64 depending on version; send both
            base64: provided.base64 ?? true,
            webhookBase64: provided.base64 ?? true,
            events: Array.isArray(provided.events) ? provided.events : [],
            urlToken: provided.urlToken ?? "",
          },
        };
      } else {
        webhookConfig = {
          webhook: {
            enabled: true,
            url: webhookUrl,
            headers: {
              authorization: `Bearer ${adminSettings.globalToken}`,
              "Content-Type": "application/json",
            },
            byEvents: false,
            events: [],
            urlToken: "",
            webhookBase64: false,
          },
        } as any;
      }

      // Call Evolution API
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
        try { errorData = await evolutionResponse.json(); } 
        catch { errorData = await evolutionResponse.text(); }
        return res.status(400).json({ message: "Falha ao configurar webhook da IA", details: errorData });
      }

      let evolutionData;
      try { evolutionData = await evolutionResponse.json(); }
      catch { evolutionData = { message: "Webhook configurado com sucesso" }; }

      // Update instance webhook URL in database
      await storage.updateAdminWhatsappInstance(instance.id, { webhook: webhookUrl });

      res.json({
        message: "Webhook configurado com sucesso",
        webhookUrl,
        config: webhookConfig,
        response: evolutionData
      });
    } catch (error) {
      console.error("Error configuring Evolution API webhook (admin):", error);
      res.status(500).json({ message: "Erro ao configurar webhook da Evolution API" });
    }
  });

  // Configure WhatsApp instance settings (Admin)
  app.post("/api/admin/whatsapp-instances/:instanceKey/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { instanceKey } = req.params;
      const settings = req.body;

      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }

      const instance = await storage.getAdminWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      const evolutionSettings = {
        rejectCall: settings.rejectCall,
        msgCall: settings.msgCall,
        groupsIgnore: settings.groupsIgnore,
        alwaysOnline: settings.alwaysOnline,
        readMessages: settings.readMessages,
        readStatus: settings.readStatus,
        syncFullHistory: settings.syncFullHistory
      };

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
        try { errorData = await evolutionResponse.json(); }
        catch { errorData = await evolutionResponse.text(); }
        return res.status(400).json({ message: "Falha ao aplicar configurações na Evolution API", details: errorData });
      }

      let evolutionData;
      try { evolutionData = await evolutionResponse.json(); }
      catch { evolutionData = { message: "Configurações aplicadas" }; }

      res.json({ message: "Configurações aplicadas com sucesso", settings: evolutionData });
    } catch (error) {
      console.error("Error configuring WhatsApp instance (admin):", error);
      res.status(500).json({ message: "Erro ao configurar instância do WhatsApp" });
    }
  });

  app.post("/api/admin/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔍 Iniciando criação de instância WhatsApp...');
      
      const userId = getCurrentUserId(req);
      if (!userId) {
        console.log('❌ Usuário não autenticado');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      console.log('👤 Usuário encontrado:', { id: user?.id, role: user?.role });
      
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        console.log('❌ Acesso negado para usuário:', user?.role);
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceName, phoneNumber } = req.body;
      console.log('📝 Dados recebidos:', { instanceName, phoneNumber });
      
      if (!instanceName || !phoneNumber) {
        console.log('❌ Dados obrigatórios faltando');
        return res.status(400).json({ message: "Nome da instância e número de telefone são obrigatórios" });
      }
      
      // Get admin WhatsApp settings
      console.log('🔧 Buscando configurações da API WhatsApp...');
      const adminSettings = await storage.getWhatsappApiSettings();
      console.log('⚙️ Configurações encontradas:', adminSettings ? 'sim' : 'não');
      
      if (!adminSettings || !adminSettings.isActive) {
        console.log('❌ Configurações da API WhatsApp não encontradas ou inativas');
        return res.status(400).json({ 
          message: "Configurações da API WhatsApp não encontradas ou inativas",
          details: "É necessário configurar a Evolution API no painel Super Root primeiro",
          code: "WHATSAPP_API_NOT_CONFIGURED"
        });
      }
      
      // Verificar se as configurações têm os campos obrigatórios
      if (!adminSettings.evolutionApiUrl || !adminSettings.globalToken) {
        console.log('❌ Configurações da API WhatsApp incompletas:', {
          hasEvolutionApiUrl: !!adminSettings.evolutionApiUrl,
          hasGlobalToken: !!adminSettings.globalToken
        });
        return res.status(400).json({ 
          message: "Configurações da API WhatsApp incompletas",
          details: "URL da Evolution API e token global são obrigatórios",
          code: "WHATSAPP_API_INCOMPLETE_CONFIG"
        });
      }
      
      console.log('✅ Configurações da API encontradas, prosseguindo...');
      
      // Try to create instance using Evolution API (best-effort)
      let instanceKeyFromApi: string | null = null;
      try {
        console.log('🌐 Tentando criar instância na Evolution API...');
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

        console.log('📡 Resposta da Evolution API:', createInstanceResponse.status, createInstanceResponse.statusText);

        if (createInstanceResponse.ok) {
          const json = await createInstanceResponse.json().catch(() => undefined);
          console.log('📊 Resposta JSON da Evolution API:', json);
          instanceKeyFromApi = json?.instance?.instanceName || json?.instanceName || instanceName;
        } else {
          // Log but continue saving locally
          let errInfo: any;
          try { 
            errInfo = await createInstanceResponse.json(); 
          } catch { 
            errInfo = await createInstanceResponse.text(); 
          }
          console.warn('⚠️ Evolution create instance failed, continuing with local save:', errInfo);
        }
      } catch (e) {
        console.warn('⚠️ Evolution create instance error (network), continuing with local save:', e);
      }
      
      // Save instance to database
      console.log('💾 Salvando instância no banco de dados...');
      
      // Use simple instance name as key (no complex naming)
      const finalInstanceKey = instanceKeyFromApi || instanceName;
      
      console.log('🔑 Chave da instância:', finalInstanceKey);

      const newInstance = {
        instanceName: instanceName,
        instanceKey: finalInstanceKey,
        webhook: adminSettings.systemUrl ? `${adminSettings.systemUrl}/api/webhooks/whatsapp/${finalInstanceKey}` : null,
        status: 'disconnected',
        qrCode: null,
        lastConnection: null,
        phoneNumber: phoneNumber,
        isActive: true
      };
      
      console.log('📋 Instância a ser criada:', newInstance);
      
      const savedInstance = await storage.createAdminWhatsappInstance(newInstance);

      // Log para depuração e facilitar frontend
      console.log('✅ Admin WhatsApp instance criada:', savedInstance);

      res.json({
        message: instanceKeyFromApi ? "Instância criada com sucesso" : "Instância criada localmente (Evolution indisponível)",
        instance: savedInstance
      });
    } catch (error) {
      console.error("❌ Error creating admin WhatsApp instance:", error);
      res.status(500).json({ 
        message: "Erro ao criar instância do WhatsApp", 
        details: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Connect admin WhatsApp instance
  app.post("/api/admin/whatsapp-instances/:id/connect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const instance = await storage.getAdminWhatsappInstance(id);
      
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }
      
      // Connect instance using Evolution API
      const connectResponse = await fetch(`${adminSettings.evolutionApiUrl}/instance/connect/${instance.instanceKey}`, {
        method: 'GET',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!connectResponse.ok) {
        return res.status(400).json({ message: "Falha ao conectar instância" });
      }
      
      const connectData = await connectResponse.json();
      
      // Update instance with QR code and status
      await storage.updateAdminWhatsappInstance(id, { 
        qrCode: connectData.base64 || connectData.qrcode?.base64,
        status: 'connecting'
      });
      
      res.json({
        message: "Conectando instância...",
        qrCode: connectData.base64 || connectData.qrcode?.base64,
        instanceKey: instance.instanceKey
      });
    } catch (error) {
      console.error("Error connecting admin WhatsApp instance:", error);
      res.status(500).json({ message: "Erro ao conectar instância do WhatsApp" });
    }
  });

  // Check admin WhatsApp instance status
  app.get("/api/admin/whatsapp-instances/:instanceKey/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceKey } = req.params;
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }
      
      // Find instance by instanceKey
      const instance = await storage.getAdminWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      try {
        // Check status via Evolution API
        const evolutionResponse = await fetch(`${adminSettings.evolutionApiUrl}/instance/connectionState/${instanceKey}`, {
          method: 'GET',
          headers: {
            'apikey': adminSettings.globalToken,
            'Content-Type': 'application/json'
          }
        });
        
        if (!evolutionResponse.ok) {
          console.error(`Evolution API error for ${instanceKey}:`, evolutionResponse.status);
          return res.json({ 
            status: 'error',
            message: 'Erro ao verificar status na Evolution API',
            instanceKey 
          });
        }
        
        const evolutionData = await evolutionResponse.json();
        let status = evolutionData.instance?.state || 'disconnected';
        
        // Map Evolution API status to our system
        if (status === 'open') {
          status = 'connected';
        } else if (status === 'close' || status === 'closed') {
          status = 'disconnected';
        }
        
        // Update instance status in database
        const updateData: any = { 
          status,
          lastStatusCheck: new Date()
        };
        
        if (status === 'connected' && evolutionData.instance?.profilePictureUrl) {
          updateData.lastConnection = new Date();
        }
        
        await storage.updateAdminWhatsappInstance(instance.id, updateData);
        
        res.json({ 
          status,
          instanceKey,
          lastCheck: new Date().toISOString(),
          evolutionData: evolutionData.instance
        });
        
      } catch (evolutionError) {
        console.error(`Error checking Evolution API for ${instanceKey}:`, evolutionError);
        res.json({ 
          status: 'error',
          message: 'Erro ao conectar com a Evolution API',
          instanceKey 
        });
      }
      
    } catch (error) {
      console.error("Error checking admin WhatsApp instance status:", error);
      res.status(500).json({ message: "Erro ao verificar status da instância" });
    }
  });

  // Update admin WhatsApp instance status
  app.put("/api/admin/whatsapp-instances/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const { status, phoneNumber } = req.body;
      
      const updateData: any = { status };
      if (phoneNumber) {
        updateData.phoneNumber = phoneNumber;
      }
      if (status === 'connected') {
        updateData.lastConnection = new Date();
        updateData.qrCode = null; // Clear QR code when connected
      }
      
      await storage.updateAdminWhatsappInstance(id, updateData);
      
      res.json({ message: "Status da instância atualizado com sucesso" });
    } catch (error) {
      console.error("Error updating admin WhatsApp instance status:", error);
      res.status(500).json({ message: "Erro ao atualizar status da instância" });
    }
  });

  // Delete admin WhatsApp instance
  app.delete("/api/admin/whatsapp-instances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { id } = req.params;
      const instance = await storage.getAdminWhatsappInstance(id);
      
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Get admin WhatsApp settings
      try {
        const adminSettings = await storage.getWhatsappApiSettings();
        if (adminSettings && adminSettings.evolutionApiUrl && adminSettings.globalToken) {
          // Try to logout/disconnect and then delete in Evolution API (best-effort)
          try {
            await fetch(`${adminSettings.evolutionApiUrl}/instance/logout/${instance.instanceKey}`, {
              method: 'DELETE',
              headers: {
                'apikey': adminSettings.globalToken,
                'Content-Type': 'application/json'
              }
            }).catch(() => undefined);

            const delResp = await fetch(`${adminSettings.evolutionApiUrl}/instance/delete/${instance.instanceKey}`, {
              method: 'DELETE',
              headers: {
                'apikey': adminSettings.globalToken,
                'Content-Type': 'application/json'
              }
            });

            if (!delResp.ok) {
              let errInfo: any;
              try { errInfo = await delResp.json(); } catch { errInfo = await delResp.text(); }
              console.warn('Evolution delete failed:', errInfo);
            }
          } catch (e) {
            console.warn('Evolution delete network error:', e);
          }
        }
      } catch (e) {
        console.warn('Could not read admin WhatsApp settings during delete:', e);
      }
      
      // Delete instance from database
      try {
        await storage.deleteAdminWhatsappInstance(id);
      } catch (dbErr) {
        console.error('DB delete admin_whatsapp_instances failed:', dbErr);
        return res.status(500).json({ message: "Erro ao excluir instância no banco" });
      }

      return res.json({ message: "Instância excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting admin WhatsApp instance:", error);
      return res.status(200).json({ message: "Instância excluída (com avisos)", warning: String(error) });
    }
  });

  // Rotas para WhatsApp dos Franqueadores
  app.post('/api/franchisor/whatsapp/instances', async (req, res) => {
    try {
      const { franchisorId, instanceName, instanceKey, webhook, phoneNumber } = req.body;
      
      if (!franchisorId || !instanceName || !instanceKey) {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
      }

      // Verificar se a instance key já existe
      const existingInstance = await storage.getAdminWhatsappInstanceByKey(instanceKey);

      if (existingInstance) {
        return res.status(400).json({ error: 'Instance key já existe' });
      }

      // Criar nova instância
      await storage.createAdminWhatsappInstance({
        instanceName,
        instanceKey,
        phoneNumber,
        status: 'disconnected',
        isActive: true
      });

      res.status(201).json({ 
        message: 'Instância criada com sucesso'
      });

    } catch (error) {
      console.error('Erro ao criar instância WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get('/api/franchisor/:franchisorId/whatsapp/instances', async (req, res) => {
    try {
      const { franchisorId } = req.params;
      
      const instances = await storage.getAdminWhatsappInstances();

      res.json(instances);

    } catch (error) {
      console.error('Erro ao buscar instâncias WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.put('/api/franchisor/whatsapp/instances/:instanceId', async (req, res) => {
    try {
      const { instanceId } = req.params;
      const { instanceName, webhook, phoneNumber, isActive } = req.body;
      
      await storage.updateAdminWhatsappInstance(instanceId, {
        instanceName,
        phoneNumber,
        isActive
      });

      res.json({ message: 'Instância atualizada com sucesso' });

    } catch (error) {
      console.error('Erro ao atualizar instância WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.delete('/api/franchisor/whatsapp/instances/:instanceId', async (req, res) => {
    try {
      const { instanceId } = req.params;
      
      await storage.deleteAdminWhatsappInstance(instanceId);

      res.json({ message: 'Instância removida com sucesso' });

    } catch (error) {
      console.error('Erro ao remover instância WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rotas para números de telefone dos franqueadores
  app.post('/api/franchisor/phone-numbers', async (req, res) => {
    try {
      const { franchisorId, phoneNumber, whatsappInstanceId, isPrimary } = req.body;
      
      if (!franchisorId || !phoneNumber) {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
      }

      // Se for número primário, desativar outros números primários
      if (isPrimary) {
        await db.update(franchisePhoneNumbers)
          .set({ isPrimary: false })
          .where(and(
            eq(franchisePhoneNumbers.franchiseId, franchisorId),
            eq(franchisePhoneNumbers.isPrimary, true)
          ));
      }

      // Criar novo número
      const newPhoneNumber = await db.insert(franchisePhoneNumbers).values({
        franchiseId: franchisorId,
        phoneNumber,
        whatsappInstanceId,
        isPrimary: isPrimary || false,
        isActive: true
      });

      res.status(201).json({ 
        message: 'Número de telefone adicionado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao adicionar número de telefone:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get('/api/franchisor/:franchisorId/phone-numbers', async (req, res) => {
    try {
      const { franchisorId } = req.params;
      
      const phoneNumbers = await db.query.franchisePhoneNumbers.findMany({
        where: eq(franchisePhoneNumbers.franchiseId, franchisorId),
        orderBy: [desc(franchisePhoneNumbers.createdAt)]
      });

      res.json(phoneNumbers);

    } catch (error) {
      console.error('Erro ao buscar números de telefone:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.put('/api/franchisor/phone-numbers/:phoneNumberId', async (req, res) => {
    try {
      const { phoneNumberId } = req.params;
      const { phoneNumber, whatsappInstanceId, isPrimary, isActive } = req.body;
      
      const phoneNumberRecord = await db.query.franchisePhoneNumbers.findFirst({
        where: eq(franchisePhoneNumbers.id, phoneNumberId)
      });

      if (!phoneNumberRecord) {
        return res.status(404).json({ error: 'Número de telefone não encontrado' });
      }

      // Se for número primário, desativar outros números primários
      if (isPrimary) {
        await db.update(franchisePhoneNumbers)
          .set({ isPrimary: false })
          .where(and(
            eq(franchisePhoneNumbers.franchiseId, phoneNumberRecord.franchiseId),
            eq(franchisePhoneNumbers.isPrimary, true),
            ne(franchisePhoneNumbers.id, phoneNumberId)
          ));
      }

      // Atualizar número
      await db.update(franchisePhoneNumbers)
        .set({
          phoneNumber,
          whatsappInstanceId,
          isPrimary,
          isActive,
          updatedAt: new Date()
        })
        .where(eq(franchisePhoneNumbers.id, phoneNumberId));

      res.json({ message: 'Número de telefone atualizado com sucesso' });

    } catch (error) {
      console.error('Erro ao atualizar número de telefone:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.delete('/api/franchisor/phone-numbers/:phoneNumberId', async (req, res) => {
    try {
      const { phoneNumberId } = req.params;
      
      await db.delete(franchisePhoneNumbers)
        .where(eq(franchisePhoneNumbers.id, phoneNumberId));

      res.json({ message: 'Número de telefone removido com sucesso' });

    } catch (error) {
      console.error('Erro ao remover número de telefone:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rotas para mapeamento de prompts
  app.post('/api/franchisor/phone-prompt-mapping', async (req, res) => {
    try {
      const { phoneNumberId, phoneNumberType, promptId, promptType, priority } = req.body;
      
      if (!phoneNumberId || !phoneNumberType || !promptId || !promptType) {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
      }

      // Verificar se o número de telefone existe
      const phoneNumber = await db.query.franchisePhoneNumbers.findFirst({
        where: eq(franchisePhoneNumbers.id, phoneNumberId)
      });

      if (!phoneNumber) {
        return res.status(404).json({ error: 'Número de telefone não encontrado' });
      }

      // Verificar se o prompt existe
      const promptExists = await db.query.franchisePrompts.findFirst({
        where: eq(franchisePrompts.id, promptId)
      });

      if (!promptExists) {
        return res.status(404).json({ error: 'Prompt não encontrado' });
      }

      // Criar mapeamento
      const newMapping = await db.insert(franchisePrompts).values({
        franchiseId: phoneNumberId,
        name: `Prompt para ${phoneNumberId}`,
        description: `Prompt associado ao número ${phoneNumberId}`,
        prompt: promptId,
        isActive: true
      });

      res.status(201).json({ 
        message: 'Mapeamento criado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao criar mapeamento de prompt:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.get('/api/franchisor/phone-prompt-mapping/:phoneNumberId', async (req, res) => {
    try {
      const { phoneNumberId } = req.params;
      
      const mappings = await db.query.franchisePrompts.findMany({
        where: eq(franchisePrompts.franchiseId, phoneNumberId),
        orderBy: [desc(franchisePrompts.createdAt)]
      });

      res.json(mappings);

    } catch (error) {
      console.error('Erro ao buscar mapeamentos de prompt:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.put('/api/franchisor/phone-prompt-mapping/:mappingId', async (req, res) => {
    try {
      const { mappingId } = req.params;
      const { priority, isActive } = req.body;
      
      await db.update(franchisePrompts)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(eq(franchisePrompts.id, mappingId));

      res.json({ message: 'Mapeamento atualizado com sucesso' });

    } catch (error) {
      console.error('Erro ao atualizar mapeamento de prompt:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.delete('/api/franchisor/phone-prompt-mapping/:mappingId', async (req, res) => {
    try {
      const { mappingId } = req.params;
      
      await db.delete(franchisePrompts)
        .where(eq(franchisePrompts.id, mappingId));

      res.json({ message: 'Mapeamento removido com sucesso' });

    } catch (error) {
      console.error('Erro ao remover mapeamento de prompt:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para obter prompt baseado no número de telefone
  app.get('/api/franchisor/prompt-by-phone/:phoneNumber', async (req, res) => {
    try {
      const { phoneNumber } = req.params;
      
      // Buscar o número de telefone
      const phoneNumberRecord = await db.query.franchisePhoneNumbers.findFirst({
        where: eq(franchisePhoneNumbers.phoneNumber, phoneNumber)
      });

      if (!phoneNumberRecord) {
        return res.status(404).json({ error: 'Número de telefone não encontrado' });
      }

      // Buscar mapeamentos ativos ordenados por prioridade
      // Buscar mapeamentos ativos ordenados por prioridade
      const mappings = await db.query.franchisePrompts.findMany({
        where: and(
          eq(franchisePrompts.franchiseId, phoneNumberRecord.franchiseId),
          eq(franchisePrompts.isActive, true)
        ),
        orderBy: asc(franchisePrompts.createdAt)
      });

      if (mappings.length === 0) {
        return res.status(404).json({ error: 'Nenhum prompt configurado para este número' });
      }

      // Buscar os prompts baseados nos mapeamentos
      const prompts = [];
      for (const mapping of mappings) {
        prompts.push({
          ...mapping,
          mappingType: 'franchise'
        });
      }

      // Ordenar por data de criação
      prompts.sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

      res.json({
        phoneNumber: phoneNumberRecord.phoneNumber,
        whatsappInstanceId: phoneNumberRecord.whatsappInstanceId,
        prompts
      });

    } catch (error) {
      console.error('Erro ao buscar prompt por número:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Rota para buscar agentes WhatsApp (da tabela global_prompts)
  app.get('/api/admin/whatsapp-agents', isAuthenticated, async (req: any, res) => {
    try {
      // Verificar se o usuário é admin
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'franchisor' && user.role !== 'super_root')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Buscar franqueador do usuário
      const franchisor = await storage.getFranchisorByUserId(user.id);
      if (!franchisor) {
        return res.status(404).json({ error: 'Franqueador não encontrado' });
      }

      // Buscar prompts globais como agentes
      const prompts = await storage.getGlobalPrompts(franchisor.id);
      
      // Transformar prompts em formato de agentes
      const agents = prompts.map(prompt => ({
        id: prompt.id,
        name: prompt.name,
        description: prompt.description,
        type: 'global',
        isActive: prompt.isActive,
        createdAt: prompt.createdAt
      }));

      res.json(agents);

    } catch (error) {
      console.error('Erro ao buscar agentes WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Admin WhatsApp webhook endpoint for AI processing
  app.post("/api/admin/whatsapp-webhook/:instanceKey", async (req: any, res) => {
    try {
      const { instanceKey } = req.params;
      const webhookData = req.body;
      
      console.log(`📨 Admin WhatsApp webhook received for instance: ${instanceKey}`);
      console.log('📋 Webhook data:', JSON.stringify(webhookData, null, 2));
      
      // Find the instance
      const instance = await storage.getAdminWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        console.log(`❌ Instance not found: ${instanceKey}`);
        return res.status(404).json({ message: "Instance not found" });
      }
      
      // Process the webhook with AI handler
      await whatsappAIHandler.handleAdminWebhook(instanceKey, webhookData);
      
      res.status(200).json({ message: "Webhook processed successfully" });
    } catch (error) {
      console.error("❌ Error processing admin WhatsApp webhook:", error);
      res.status(500).json({ message: "Error processing webhook" });
    }
  });

  // Rotas para vinculações de WhatsApp Instance-Agent
  app.get('/api/admin/whatsapp-instance-agent-bindings', isAuthenticated, async (req: any, res) => {
    try {
      // Verificar se o usuário é admin
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'franchisor' && user.role !== 'super_root')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Buscar todas as vinculações
      const bindings = await storage.getWhatsappInstanceAgentBindings();

      // Enriquecer vinculações com dados da instância e agente
      const enrichedBindings = await Promise.all(
        bindings.map(async (binding) => {
          const instance = await storage.getAdminWhatsappInstance(binding.instanceId);
          const agent = await storage.getWhatsappAgent(binding.agentId);
          
          return {
            ...binding,
            instance,
            agent: agent ? {
              id: agent.id,
              name: agent.name,
              description: agent.description,
              type: agent.type,
              isActive: agent.isActive,
              createdAt: agent.createdAt
            } : null
          };
        })
      );

      res.json(enrichedBindings);

    } catch (error) {
      console.error('Erro ao buscar vinculações de WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.post('/api/admin/whatsapp-instance-agent-bindings', isAuthenticated, async (req: any, res) => {
    try {
      // Verificar se o usuário é admin
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'franchisor' && user.role !== 'super_root')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { instanceId, agentId } = req.body;
      
      if (!instanceId || !agentId) {
        return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
      }

      // Verificar se a instância existe
      const instance = await storage.getAdminWhatsappInstance(instanceId);
      if (!instance) {
        return res.status(404).json({ error: 'Instância de WhatsApp não encontrada' });
      }

      // Verificar se o agente existe (buscar na tabela global_prompts)
      const agent = await storage.getGlobalPromptById(agentId);
      if (!agent) {
        return res.status(404).json({ error: 'Agente WhatsApp não encontrado' });
      }

      // Criar vinculação
      const binding = await storage.createWhatsappInstanceAgentBinding({
        instanceId,
        agentId,
        isActive: true
      });

      res.status(201).json(binding);

    } catch (error) {
      console.error('Erro ao criar vinculação de WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.put('/api/admin/whatsapp-instance-agent-bindings/:bindingId', isAuthenticated, async (req: any, res) => {
    try {
      // Verificar se o usuário é admin
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'franchisor' && user.role !== 'super_root')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { bindingId } = req.params;
      const { isActive } = req.body;

      // Atualizar vinculação
      const binding = await storage.updateWhatsappInstanceAgentBinding(bindingId, { isActive });

      res.json(binding);

    } catch (error) {
      console.error('Erro ao atualizar vinculação de WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  app.delete('/api/admin/whatsapp-instance-agent-bindings/:bindingId', isAuthenticated, async (req: any, res) => {
    try {
      // Verificar se o usuário é admin
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Não autorizado' });
      }

      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'admin' && user.role !== 'franchisor' && user.role !== 'super_root')) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { bindingId } = req.params;

      // Remover vinculação
      await storage.deleteWhatsappInstanceAgentBinding(bindingId);

      res.json({ message: 'Vinculação removida com sucesso' });

    } catch (error) {
      console.error('Erro ao remover vinculação de WhatsApp:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  });

  // Get conversations from Evolution API for admin WhatsApp instance
  app.get("/api/admin/whatsapp-instances/:instanceKey/chats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceKey } = req.params;
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings || !adminSettings.isActive) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas ou inativas" });
      }
      
      // Find instance to verify it exists
      const instance = await storage.getAdminWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Make request to Evolution API to find chats
      const evolutionResponse = await fetch(`${adminSettings.evolutionApiUrl}/chat/findChats/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });
      
      if (!evolutionResponse.ok) {
        let errorData;
        try {
          errorData = await evolutionResponse.json();
        } catch {
          errorData = await evolutionResponse.text();
        }
        return res.status(400).json({ 
          message: "Falha ao buscar conversas na Evolution API", 
          details: errorData 
        });
      }
      
      const chatsData = await evolutionResponse.json();
      
      res.json({
        message: "Conversas obtidas com sucesso",
        chats: chatsData
      });
    } catch (error) {
      console.error("Error fetching chats from Evolution API:", error);
      res.status(500).json({ message: "Erro ao buscar conversas" });
    }
  });

  // Get conversations for admin WhatsApp instance
  app.get("/api/admin/whatsapp-instances/:instanceId/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceId } = req.params;
      
      // Find instance
      const instance = await storage.getAdminWhatsappInstance(instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Get conversations for this instance
      const conversations = await storage.getWhatsappConversationsByInstance(instanceId);
      
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching admin WhatsApp conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages for admin WhatsApp conversation
  app.get("/api/admin/whatsapp-conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'admin' && user?.role !== 'franchisor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { conversationId } = req.params;
      
      // Get conversation to verify it exists and get chatId
      const conversation = await storage.getWhatsappConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversa não encontrada" });
      }
      
      // Get instance to get instanceKey
      const instance = await storage.getAdminWhatsappInstance(conversation.instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      console.log(`🔍 Buscando mensagens para conversa ${conversationId}`);
      console.log(`📱 Instância: ${instance.instanceKey}`);
      console.log(`💬 Chat ID: ${conversation.chatId}`);
      
      // Import whatsappService and fetch messages using the correct endpoint
      const { whatsappService } = await import('./whatsapp');
      const evolutionResult = await whatsappService.findMessagesFromChats(instance.instanceKey, conversation.chatId);
      
      if (!evolutionResult.success) {
        console.error("Error fetching chats from Evolution API:", evolutionResult.error);
        return res.status(500).json({ 
          message: "Falha ao buscar chats da Evolution API", 
          details: evolutionResult.error 
        });
      }
      
      let chats: any[] = [];
      let messages: any[] = [];
      
      // Handle different response formats from Evolution API
      if (Array.isArray(evolutionResult.data)) {
        chats = evolutionResult.data;
      } else if (evolutionResult.data && Array.isArray(evolutionResult.data.chats)) {
        chats = evolutionResult.data.chats;
      } else if (evolutionResult.data && typeof evolutionResult.data === 'object') {
        // Try to extract chats from any array property
        const dataKeys = Object.keys(evolutionResult.data);
        for (const key of dataKeys) {
          if (Array.isArray(evolutionResult.data[key])) {
            chats = evolutionResult.data[key];
            break;
          }
        }
      }
      
      // Find the specific chat and extract messages
      const targetChat = chats.find(chat => chat.id === conversation.chatId || chat.remoteJid === conversation.chatId);
      
      if (targetChat && targetChat.messages && Array.isArray(targetChat.messages)) {
        messages = targetChat.messages;
      } else if (targetChat && targetChat.lastMessages && Array.isArray(targetChat.lastMessages)) {
        messages = targetChat.lastMessages;
      }
      
      console.log(`📬 Mensagens encontradas: ${messages.length}`);
      
      // Format messages for frontend
      const formattedMessages = messages.map(msg => {
        // Extract message content from different possible structures
        let content = '';
        if (msg.message?.conversation) {
          content = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          content = msg.message.extendedTextMessage.text;
        } else if (msg.message?.text) {
          content = msg.message.text;
        } else if (msg.content) {
          content = msg.content;
        } else if (typeof msg.message === 'string') {
          content = msg.message;
        } else {
          content = '[Mensagem sem texto]';
        }
        
        // Extract timestamp
        let timestamp = new Date().toISOString();
        if (msg.messageTimestamp) {
          timestamp = new Date(msg.messageTimestamp * 1000).toISOString();
        } else if (msg.timestamp) {
          timestamp = new Date(msg.timestamp).toISOString();
        }
        
        return {
          id: msg.key?.id || msg.id || `msg_${Date.now()}_${Math.random()}`,
          messageId: msg.key?.id || msg.id || '',
          conversationId: conversationId,
          senderPhone: msg.key?.participant || msg.key?.remoteJid?.split('@')[0] || '',
          senderName: msg.pushName || '',
          content: content,
          messageType: 'text',
          direction: msg.key?.fromMe ? 'outgoing' : 'incoming',
          status: msg.status || 'sent',
          timestamp: timestamp,
          isAiResponse: false,
          aiModel: undefined
        };
      });
      
      console.log(`✅ ${formattedMessages.length} mensagens formatadas para o frontend`);
      
      res.json(formattedMessages);
    } catch (error) {
      console.error("Error fetching admin WhatsApp messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Client WhatsApp routes
  app.get("/api/client/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Get WhatsApp settings from super-root level (whatsapp_api_settings table)
      const settings = await storage.getWhatsappApiSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching WhatsApp settings:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp settings" });
    }
  });

  // Rota para usuários franchise acessarem configurações WhatsApp
  app.get("/api/franchise/whatsapp-settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied: only franchise users can access this route" });
      }
      
      // Get WhatsApp settings from super-root level (whatsapp_api_settings table)
      const settings = await storage.getWhatsappApiSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching WhatsApp settings for franchise:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp settings" });
    }
  });

  // Rota para usuários franchise verem instâncias dos seus clientes
  app.get("/api/franchise/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied: only franchise users can access this route" });
      }
      
      // Buscar franquia do usuário
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      // Buscar instâncias dos clientes da franquia
      const instances = await storage.getWhatsappInstancesByFranchise(franchise.id);
      res.json(instances);
    } catch (error) {
      console.error("Error fetching WhatsApp instances for franchise:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp instances" });
    }
  });

  // Rota para processar PDFs de treinamento
  app.post("/api/client/process-pdfs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { pdfData } = req.body;
      
      if (!pdfData || !Array.isArray(pdfData) || pdfData.length === 0) {
        return res.status(400).json({ 
          message: "Dados de PDF são obrigatórios",
          expected: "Array de objetos com fileName e base64Data"
        });
      }
      
      console.log(`📝 Processando ${pdfData.length} arquivo(s) PDF...`);
      
      try {
        const processedContents = await PDFProcessor.processPDFContents(pdfData);
        
        // Calcular estatísticas
        const stats = processedContents.map(content => ({
          fileName: content.fileName,
          ...PDFProcessor.getContentStats(content.content)
        }));
        
        console.log(`✅ Processamento concluído: ${processedContents.length} arquivos`);
        
        res.json({
          success: true,
          processedContents,
          stats,
          message: `${processedContents.length} arquivo(s) processado(s) com sucesso`
        });
        
      } catch (pdfError) {
        console.error('❌ Erro no processamento de PDF:', pdfError);
        return res.status(400).json({
          message: "Erro ao processar arquivos PDF",
          error: pdfError.message
        });
      }
      
    } catch (error) {
      console.error("Error processing PDFs:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para usuários franchise verem agentes personalizados
  app.get("/api/franchise/custom-agents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied: only franchise users can access this route" });
      }
      
      // Buscar agentes do usuário
      const agents = await storage.getCustomAIAgentsByUserId(userId);
      res.json(agents);
    } catch (error) {
      console.error("Error fetching custom AI agents for franchise:", error);
      res.status(500).json({ message: "Failed to fetch custom AI agents" });
    }
  });

  // Rota para usuários franchise verem vinculações
  app.get("/api/franchise/instance-agent-bindings", isAuthenticated, async (req: any, res) => {
    try {
      console.log("🔍 GET /api/franchise/instance-agent-bindings - Iniciando busca de vinculações");
      
      const userId = getCurrentUserId(req);
      if (!userId) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      console.log("👤 Usuário autenticado:", userId);
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        console.log("❌ Usuário não tem role franchise ou client:", user?.role);
        return res.status(403).json({ message: "Access denied: only franchise or client users can access this route" });
      }
      
      console.log("✅ Usuário tem role franchise");
      
      // Buscar franquia do usuário
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        console.log("❌ Franquia não encontrada para o usuário");
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      console.log("🏢 Franquia encontrada:", franchise.id);
      
      // Buscar vinculações da franquia
      console.log("🔍 Buscando vinculações para a franquia...");
      const bindings = await storage.getFranchiseInstanceAgentBindings(franchise.id);
      console.log("📊 Vinculações encontradas:", bindings.length, bindings);
      
      res.json(bindings);
    } catch (error) {
      console.error("❌ Error fetching instance-agent bindings for franchise:", error);
      res.status(500).json({ message: "Failed to fetch instance-agent bindings" });
    }
  });

  // Rota para usuários franchise criarem vinculações
  app.post("/api/franchise/instance-agent-bindings", isAuthenticated, async (req: any, res) => {
    try {
      console.log("📝 POST /api/franchise/instance-agent-bindings - Iniciando criação de vinculação");
      
      const userId = getCurrentUserId(req);
      if (!userId) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log("👤 Usuário autenticado:", userId);

      // Verificar se o usuário tem role franchise
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        console.log("❌ Usuário não tem role franchise ou client:", user?.role);
        return res.status(403).json({ 
          message: "Access denied: only franchise users can access this route"
        });
      }

      console.log("✅ Usuário tem role válido:", user?.role);

      const { instanceId, agentId } = req.body;
      console.log("📋 Dados recebidos:", { instanceId, agentId });
      
      if (!instanceId || !agentId) {
        console.log("❌ Dados obrigatórios não fornecidos");
        return res.status(400).json({ message: "Instance ID and Agent ID are required" });
      }

      // Verificar se a instância pertence ao usuário através da franquia
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        console.log("❌ Franquia não encontrada para o usuário");
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      console.log("🏢 Franquia encontrada:", franchise.id);
      
      const instance = await storage.getWhatsappInstance(instanceId);
      if (!instance) {
        console.log("❌ Instância WhatsApp não encontrada:", instanceId);
        return res.status(404).json({ message: "WhatsApp instance not found" });
      }
      
      console.log("📱 Instância encontrada:", instance.instanceName);
      
      // Verificar se a instância pertence à franquia do usuário
      if (instance.franchiseId !== franchise.id) {
        console.log("❌ Instância não pertence à franquia do usuário");
        return res.status(403).json({ message: "Access denied: instance does not belong to your franchise" });
      }

      // Verificar se o agente pertence ao usuário
      const agent = await db
        .select()
        .from(customAIAgents)
        .where(and(eq(customAIAgents.id, agentId), eq(customAIAgents.userId, userId)))
        .limit(1);

      if (!agent.length) {
        console.log("❌ Agente não encontrado ou acesso negado:", agentId);
        return res.status(404).json({ message: "Custom AI agent not found or access denied" });
      }

      console.log("🤖 Agente encontrado:", agent[0].name);

      // Verificar se o agente está ativo
      if (!agent[0].isActive) {
        console.log("❌ Agente não está ativo");
        return res.status(400).json({ message: "Agent is not active" });
      }

      // Verificar se já existe uma vinculação para esta instância
      console.log("🔍 Verificando vinculações existentes para a franquia:", franchise.id);
      const existingBindings = await storage.getFranchiseInstanceAgentBindings(franchise.id);
      console.log("📊 Vinculações existentes encontradas:", existingBindings.length, existingBindings);
      
      const existingBinding = existingBindings.find(b => b.instanceId === instanceId);
      console.log("🔍 Procurando vinculação para instância:", instanceId);
      console.log("🔍 Vinculação existente encontrada:", existingBinding);
      
      if (existingBinding) {
        console.log("❌ Já existe vinculação para esta instância:", existingBinding);
        return res.status(400).json({ message: "This instance already has an agent binding" });
      }

      console.log("✅ Nenhuma vinculação existente encontrada, criando nova...");

      // Criar vinculação
      const binding = await storage.createClientWhatsappInstanceAgentBinding({
        instanceId,
        agentId,
        userId,
        isActive: true
      });

      console.log("🎉 Vinculação criada com sucesso:", binding);

      res.status(201).json(binding);
    } catch (error) {
      console.error("❌ Error creating franchise instance-agent binding:", error);
      res.status(500).json({ message: "Failed to create instance-agent binding" });
    }
  });

  // Rota para usuários franchise deletarem vinculações
  app.delete("/api/franchise/instance-agent-bindings/:bindingId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem role franchise
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ 
          message: "Access denied: only franchise users can access this route"
        });
      }

      const { bindingId } = req.params;

      // Verificar se a vinculação pertence ao usuário através da franquia
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }

      // Verificar se a vinculação existe e pertence à franquia
      const binding = await storage.getClientInstanceAgentBindingById(bindingId);
      if (!binding) {
        return res.status(404).json({ message: "Binding not found" });
      }

      // Verificar se a instância da vinculação pertence à franquia
      const instance = await storage.getWhatsappInstance(binding.instanceId);
      if (!instance || instance.franchiseId !== franchise.id) {
        return res.status(403).json({ message: "Access denied: binding does not belong to your franchise" });
      }

      // Deletar vinculação
      await storage.deleteClientWhatsappInstanceAgentBinding(bindingId);

      res.json({ message: "Binding deleted successfully" });
    } catch (error) {
      console.error("Error deleting franchise instance-agent binding:", error);
      res.status(500).json({ message: "Failed to delete instance-agent binding" });
    }
  });

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
      
      const instances = await storage.getWhatsappInstancesByClient(userId);
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
      if (!adminSettings || !adminSettings.isActive) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas ou inativas" });
      }
      
      // Use simple instance name as key (no complex naming)
      const instanceKey = instanceName;
      
      // Create instance in Evolution API
      const evolutionResponse = await fetch(`${adminSettings.evolutionApiUrl}/instance/create`, {
        method: 'POST',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instanceName: instanceName,
          token: adminSettings.globalToken,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        })
      });
      
      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.text();
        console.error("Evolution API error:", errorData);
        return res.status(400).json({ message: "Falha ao criar instância na Evolution API" });
      }
      
      // Get user's franchise
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(400).json({ message: "Usuário não possui franquia associada" });
      }
      
      // Create instance in database
      const instance = await storage.createWhatsappInstance({
        franchiseId: franchise.id,
        instanceName,
        instanceKey,
        phoneNumber,
        status: 'disconnected',
        isActive: true
      });
      
      res.json({
        message: "Instância criada com sucesso",
        instance
      });
    } catch (error) {
      console.error("Error creating WhatsApp instance:", error);
      res.status(500).json({ message: "Erro ao criar instância do WhatsApp" });
    }
  });

  app.patch("/api/client/whatsapp-instances/:instanceId/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceId } = req.params;
      const { status } = req.body;
      
      // Verify instance belongs to user's franchise
      const instance = await storage.getWhatsappInstance(instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise || instance.franchiseId !== franchise.id) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      const updateData: any = { status };
      if (status === 'connected') {
        updateData.lastConnection = new Date();
      }
      
      await storage.updateWhatsappInstance(instanceId, updateData);
      
      res.json({ message: "Status atualizado com sucesso" });
    } catch (error) {
      console.error("Error updating WhatsApp instance status:", error);
      res.status(500).json({ message: "Erro ao atualizar status da instância" });
    }
  });

  app.delete("/api/client/whatsapp-instances/:instanceId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { instanceId } = req.params;
      
      // Verify instance belongs to user's franchise
      const instance = await storage.getWhatsappInstance(instanceId);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise || instance.franchiseId !== franchise.id) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (adminSettings && adminSettings.evolutionApiUrl && adminSettings.globalToken) {
        try {
          // Try to delete from Evolution API
          await fetch(`${adminSettings.evolutionApiUrl}/instance/delete/${instance.instanceKey}`, {
            method: 'DELETE',
            headers: {
              'apikey': adminSettings.globalToken,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.warn("Failed to delete from Evolution API:", error);
        }
      }
      
      // Delete from database
      await storage.deleteWhatsappInstance(instanceId);
      
      res.json({ message: "Instância excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting WhatsApp instance:", error);
      res.status(500).json({ message: "Erro ao excluir instância" });
    }
  });

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
      
      // Find instance by key and verify ownership
      const instance = await storage.getWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise || instance.franchiseId !== franchise.id) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }
      
      // Configure webhook URL
      const baseUrl = adminSettings.systemUrl || req.protocol + '://' + req.get('host');
      const webhookUrl = `${baseUrl}/api/client/whatsapp-webhook/${instanceKey}`;
      
      // Configure webhook in Evolution API
      const webhookConfig = {
        webhook: {
          enabled: true,
          url: webhookUrl,
          headers: {
            "autorization": `Bearer ${adminSettings.globalToken}`,
            "Content-Type": "application/json"
          },
          byEvents: false,
          base64: true,
          events: [
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "MESSAGES_DELETE",
            "SEND_MESSAGE",
            "CHATS_SET",
            "CHATS_UPSERT",
            "CHATS_UPDATE",
            "CHATS_DELETE"
          ]
        }
      };
      
      const evolutionResponse = await fetch(`${adminSettings.evolutionApiUrl}/webhook/set/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookConfig)
      });
      
      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.text();
        console.error("Evolution API webhook error:", errorData);
        return res.status(400).json({ message: "Falha ao configurar webhook na Evolution API" });
      }
      
      // Update instance with webhook URL
      await storage.updateWhatsappInstance(instance.id, { webhook: webhookUrl });
      
      res.json({
        message: "Webhook da IA configurado com sucesso",
        webhookUrl
      });
    } catch (error) {
      console.error("Error configuring WhatsApp webhook:", error);
      res.status(500).json({ message: "Erro ao configurar webhook da IA" });
    }
  });

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
      
      // Find instance by key and verify ownership
      const instance = await storage.getWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise || instance.franchiseId !== franchise.id) {
        return res.status(404).json({ message: "Instância não encontrada" });
      }
      
      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (!adminSettings) {
        return res.status(400).json({ message: "Configurações da API WhatsApp não encontradas" });
      }
      
      // Apply settings to Evolution API
      const evolutionResponse = await fetch(`${adminSettings.evolutionApiUrl}/settings/set/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      
      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.text();
        console.error("Evolution API settings error:", errorData);
        return res.status(400).json({ message: "Falha ao aplicar configurações na Evolution API" });
      }
      
      res.json({
        message: "Configurações aplicadas com sucesso",
        settings
      });
    } catch (error) {
      console.error("Error configuring WhatsApp settings:", error);
      res.status(500).json({ message: "Erro ao configurar instância do WhatsApp" });
    }
  });

  // Test endpoint to verify logging
  app.post("/api/test-webhook-logs", async (req: any, res) => {
    console.log("🚨 TEST WEBHOOK ENDPOINT HIT!");
    console.log("🚨 Body:", JSON.stringify(req.body, null, 2));
    res.json({ message: "Test webhook received", timestamp: new Date().toISOString() });
  });

  // Client WhatsApp webhook endpoint
  app.post("/api/client/whatsapp-webhook/:instanceKey", async (req: any, res) => {
    try {
      const { instanceKey } = req.params;
      const webhookData = req.body;
      
      console.log(`🚨 WEBHOOK RECEIVED! Instance: ${instanceKey}`);
      console.log(`🚨 Timestamp: ${new Date().toISOString()}`);
      console.log(`🚨 Headers:`, JSON.stringify(req.headers, null, 2));
      console.log(`🚨 Body:`, JSON.stringify(webhookData, null, 2));
      
      // Find the instance
      const instance = await storage.getWhatsappInstanceByKey(instanceKey);
      if (!instance) {
        console.log(`❌ Instance not found: ${instanceKey}`);
        return res.status(404).json({ message: "Instance not found" });
      }
      
      console.log(`✅ Instance found: ${instance.instanceName}`);
      
      // Process the webhook with AI handler
      console.log(`🔄 Processing webhook with AI handler...`);
      await whatsappAIHandler.handleClientWebhook(instanceKey, webhookData);
      console.log(`✅ Webhook processing completed`);
      
      res.status(200).json({ message: "Webhook processed successfully", success: true });
    } catch (error) {
      console.error("❌ Error processing client WhatsApp webhook:", error);
      res.status(500).json({ message: "Error processing webhook" });
    }
  });

  // Debug endpoint para testar webhooks
  app.post("/api/debug/webhook/:instanceKey", async (req: any, res) => {
    console.log(`🚨🚨🚨 DEBUG WEBHOOK RECEIVED! 🚨🚨🚨`);
    console.log(`Instance: ${req.params.instanceKey}`);
    console.log(`Body:`, JSON.stringify(req.body, null, 2));
    console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
    res.json({ success: true, message: "Debug webhook received" });
  });

  // Rota para usuários franchise criarem instâncias WhatsApp
  app.post("/api/franchise/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔍 Iniciando criação de instância WhatsApp para franquia...');
      
      const userId = getCurrentUserId(req);
      if (!userId) {
        console.log('❌ Usuário não autenticado');
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      console.log('👤 Usuário encontrado:', { id: user?.id, role: user?.role });
      
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        console.log('❌ Acesso negado para usuário:', user?.role);
        return res.status(403).json({ message: "Access denied: only franchise users can access this route" });
      }
      
      // Buscar franquia do usuário
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        console.log('❌ Franquia não encontrada para usuário:', userId);
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      console.log('🏢 Franquia encontrada:', franchise.id);
      
      const { instanceName, phoneNumber } = req.body;
      console.log('📝 Dados recebidos:', { instanceName, phoneNumber });
      
      if (!instanceName || !phoneNumber) {
        console.log('❌ Dados obrigatórios faltando');
        return res.status(400).json({ message: "Nome da instância e número de telefone são obrigatórios" });
      }
      
      // Get admin WhatsApp settings para verificar se a API está configurada
      console.log('🔧 Buscando configurações da API WhatsApp...');
      const adminSettings = await storage.getWhatsappApiSettings();
      console.log('⚙️ Configurações encontradas:', adminSettings ? 'sim' : 'não');
      
      if (!adminSettings || !adminSettings.isActive) {
        console.log('❌ Configurações da API WhatsApp não encontradas ou inativas');
        return res.status(400).json({ 
          message: "Configurações da API WhatsApp não encontradas ou inativas",
          details: "É necessário configurar a Evolution API no painel Super Root primeiro",
          code: "WHATSAPP_API_NOT_CONFIGURED"
        });
      }
      
      // Verificar se as configurações têm os campos obrigatórios
      if (!adminSettings.evolutionApiUrl || !adminSettings.globalToken) {
        console.log('❌ Configurações da API WhatsApp incompletas');
        return res.status(400).json({ 
          message: "Configurações da API WhatsApp incompletas",
          details: "URL da Evolution API e token global são obrigatórios",
          code: "WHATSAPP_API_INCOMPLETE_CONFIG"
        });
      }
      
      console.log('✅ Configurações da API encontradas, prosseguindo...');
      
      // Try to create instance using Evolution API (best-effort)
      let instanceKeyFromApi: string | null = null;
      try {
        console.log('🌐 Tentando criar instância na Evolution API...');
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

        console.log('📡 Resposta da Evolution API:', createInstanceResponse.status, createInstanceResponse.statusText);

        if (createInstanceResponse.ok) {
          const json = await createInstanceResponse.json().catch(() => undefined);
          console.log('📊 Resposta JSON da Evolution API:', json);
          instanceKeyFromApi = json?.instance?.instanceName || json?.instanceName || instanceName;
        } else {
          // Log but continue saving locally
          let errInfo: any;
          try { 
            errInfo = await createInstanceResponse.json(); 
          } catch { 
            errInfo = await createInstanceResponse.text(); 
          }
          console.warn('⚠️ Evolution create instance failed, continuing with local save:', errInfo);
        }
      } catch (e) {
        console.warn('⚠️ Evolution create instance error (network), continuing with local save:', e);
      }
      
      // Save instance to database
      console.log('💾 Salvando instância no banco de dados...');
      
      // Use simple instance name as key (no complex naming)
      const finalInstanceKey = instanceKeyFromApi || instanceName;
      
      console.log('🔑 Chave da instância:', finalInstanceKey);

      const newInstance = {
        franchiseId: franchise.id,
        instanceName: instanceName,
        instanceKey: finalInstanceKey,
        webhook: adminSettings.systemUrl ? `${adminSettings.systemUrl}/api/webhooks/whatsapp/${finalInstanceKey}` : null,
        status: 'disconnected',
        qrCode: null,
        lastConnection: null,
        phoneNumber: phoneNumber,
        isActive: true
      };
      
      console.log('📋 Instância a ser criada:', newInstance);
      
      const savedInstance = await storage.createWhatsappInstance(newInstance);

      // Log para depuração e facilitar frontend
      console.log('✅ Franchise WhatsApp instance criada:', savedInstance);

      res.json({
        message: instanceKeyFromApi ? "Instância criada com sucesso" : "Instância criada localmente (Evolution indisponível)",
        instance: savedInstance
      });
    } catch (error) {
      console.error("❌ Error creating franchise WhatsApp instance:", error);
      res.status(500).json({ 
        message: "Erro ao criar instância do WhatsApp", 
        details: String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}