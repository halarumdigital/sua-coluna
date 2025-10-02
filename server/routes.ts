import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { PDFProcessor } from "./pdf-processor";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertTeamMemberSchema, insertProjectSchema, insertInvoiceSchema, aiSettingsSchema, editFranchiseProfileSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { openaiService } from "./openai";
import { whatsappAIHandler } from "./whatsapp-ai-handler";
import { whatsappService } from "./whatsapp";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db } from "./db";
import { aiUsage } from "@shared/schema";
import { sum, count, desc, sql, eq, and, ne, asc } from "drizzle-orm";
import { plans, franchises, franchisePhoneNumbers, franchiseAgents, franchisePrompts, globalPrompts, customAIAgents, createCustomAIAgentSchema, users, googleCalendarSettings, googleCalendarSettingsSchema, franchiseClients, createFranchiseClientSchema } from "@shared/schema";
import { google } from "googleapis";

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
        SET webhook = CONCAT(${finalDomain}, '/api/franchise/whatsapp-webhook/', instance_key)
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

      // Get available models from OpenAI service
      const models = await openaiService.getAvailableModels();
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

      // Only super_root can modify all AI settings, admin/franchisor can only modify temperature and systemPrompt
      if (user?.role === 'super_root') {
        const { aiSettingsSchema } = await import("@shared/schema");
        const validatedData = aiSettingsSchema.parse(req.body);
        await storage.saveAISettings(validatedData);
      } else {
        // For admin/franchisor, only allow temperature and systemPrompt changes
        const { adminAiSettingsSchema } = await import("@shared/schema");
        const validatedData = adminAiSettingsSchema.parse(req.body);
        
        // Get current settings to preserve API key, tokens, and model
        const currentSettings = await storage.getAISettings();
        const mergedSettings = {
          ...currentSettings,
          temperature: validatedData.temperature,
          systemPrompt: validatedData.systemPrompt,
        };
        
        await storage.saveAISettings(mergedSettings);
      }

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

      // Get available models from OpenAI service
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
  app.get("/api/franchise/custom-agents", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/franchise/custom-agents", isAuthenticated, async (req: any, res) => {
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

  app.put("/api/franchise/custom-agents/:id", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/franchise/custom-agents/:id", isAuthenticated, async (req: any, res) => {
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
  app.get("/api/franchise/instance-agent-bindings", isAuthenticated, async (req: any, res) => {
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

  app.post("/api/franchise/instance-agent-bindings", isAuthenticated, async (req: any, res) => {
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

  app.put("/api/franchise/instance-agent-bindings/:bindingId", isAuthenticated, async (req: any, res) => {
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

  app.delete("/api/franchise/instance-agent-bindings/:bindingId", isAuthenticated, async (req: any, res) => {
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

      const { updateFranchiseSchema } = await import("@shared/schema");
      const validatedData = updateFranchiseSchema.parse(req.body);

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
  app.get("/api/franchise/whatsapp-settings", isAuthenticated, async (req: any, res) => {
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
  app.post("/api/franchise/process-pdfs", isAuthenticated, async (req: any, res) => {
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

  // Rotas do Google Calendar para franquias
  app.get("/api/franchise/calendar-settings", isAuthenticated, async (req: any, res) => {
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
      
      // Buscar configurações do Google Calendar
      const [settings] = await db.select().from(googleCalendarSettings).where(eq(googleCalendarSettings.franchiseId, franchise.id));
      
      if (!settings) {
        // Retornar configurações padrão se não existir
        const defaultSettings = {
          isEnabled: false,
          clientId: "",
          clientSecret: "",
          calendarId: "primary",
          defaultEventDuration: 60,
          eventTitle: "Consulta Agendada",
          eventDescription: "Consulta agendada via WhatsApp",
          eventLocation: "",
          isConnected: false
        };
        return res.json(defaultSettings);
      }
      
      // Remover dados sensíveis da resposta
      const { clientSecret, refreshToken, ...publicSettings } = settings;
      res.json({
        ...publicSettings,
        clientSecret: clientSecret ? "********" : "", // Mascarar secret
        hasRefreshToken: !!refreshToken
      });
    } catch (error) {
      console.error("Error fetching Google Calendar settings:", error);
      res.status(500).json({ message: "Failed to fetch calendar settings" });
    }
  });

  app.put("/api/franchise/calendar-settings", isAuthenticated, async (req: any, res) => {
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
      
      // Validar dados
      const validatedData = googleCalendarSettingsSchema.parse(req.body);
      
      // Verificar se já existe configuração
      const [existingSettings] = await db.select().from(googleCalendarSettings).where(eq(googleCalendarSettings.franchiseId, franchise.id));
      
      let savedSettings;
      if (existingSettings) {
        // Atualizar configuração existente
        // Manter refreshToken existente se não for fornecido
        const updateData = {
          ...validatedData,
          refreshToken: validatedData.refreshToken || existingSettings.refreshToken,
          updatedAt: new Date()
        };
        
        await db.update(googleCalendarSettings)
          .set(updateData)
          .where(eq(googleCalendarSettings.franchiseId, franchise.id));
        
        // Fetch the updated settings
        const [updated] = await db.select().from(googleCalendarSettings)
          .where(eq(googleCalendarSettings.franchiseId, franchise.id));
        savedSettings = updated;
      } else {
        // Criar nova configuração
        await db.insert(googleCalendarSettings)
          .values({
            franchiseId: franchise.id,
            ...validatedData
          });
        
        // Fetch the created settings
        const [created] = await db.select().from(googleCalendarSettings)
          .where(eq(googleCalendarSettings.franchiseId, franchise.id));
        savedSettings = created;
      }
      
      // Remover dados sensíveis da resposta
      const { clientSecret, refreshToken, ...publicSettings } = savedSettings;
      res.json({
        message: "Configurações salvas com sucesso",
        settings: {
          ...publicSettings,
          clientSecret: clientSecret ? "********" : "",
          hasRefreshToken: !!refreshToken
        }
      });
    } catch (error) {
      console.error("Error saving Google Calendar settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save calendar settings" });
    }
  });

  app.post("/api/franchise/calendar-test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied: only franchise users can access this route" });
      }
      
      const { clientId, clientSecret, calendarId } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ 
          success: false,
          message: "Client ID e Client Secret são obrigatórios para teste" 
        });
      }
      
      try {
        // Configurar cliente OAuth2
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          'urn:ietf:wg:oauth:2.0:oob' // Para aplicações instaladas
        );
        
        // Configurar cliente do Calendar
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // Tentar listar calendários (isso vai falhar se não tiver token, mas confirma que as credenciais estão corretas)
        // Para um teste real, precisaríamos implementar o fluxo OAuth completo
        
        // Por enquanto, apenas validamos se as credenciais têm o formato correto
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/calendar']
        });
        
        if (authUrl) {
          res.json({
            success: true,
            message: "Credenciais válidas. Para completar a integração, você precisa autorizar o acesso ao Google Calendar.",
            authUrl: authUrl,
            nextSteps: [
              "1. Acesse a URL de autorização fornecida",
              "2. Faça login na sua conta Google",
              "3. Autorize o acesso ao Google Calendar",
              "4. Copie o código de autorização",
              "5. Configure o refresh token nas configurações"
            ]
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Erro ao gerar URL de autorização. Verifique as credenciais."
          });
        }
      } catch (googleError: any) {
        console.error("Google Calendar API error:", googleError);
        res.status(400).json({
          success: false,
          message: "Erro ao conectar com a API do Google Calendar",
          details: googleError.message
        });
      }
    } catch (error) {
      console.error("Error testing Google Calendar connection:", error);
      res.status(500).json({ 
        success: false,
        message: "Erro interno do servidor" 
      });
    }
  });

  // Get upcoming calendar events for franchise
  app.get("/api/franchise/calendar-events", isAuthenticated, async (req: any, res) => {
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
      
      // Buscar configurações do Google Calendar
      const [settings] = await db.select().from(googleCalendarSettings).where(eq(googleCalendarSettings.franchiseId, franchise.id));
      
      if (!settings || !settings.isEnabled || !settings.refreshToken) {
        return res.json([]); // Retorna array vazio se não configurado
      }
      
      try {
        // Configurar cliente OAuth2
        const oauth2Client = new google.auth.OAuth2(
          settings.clientId,
          settings.clientSecret,
          'urn:ietf:wg:oauth:2.0:oob'
        );
        
        // Definir refresh token
        oauth2Client.setCredentials({
          refresh_token: settings.refreshToken
        });
        
        // Configurar cliente do Calendar
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        
        // Buscar eventos dos próximos 7 dias
        const now = new Date();
        const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const response = await calendar.events.list({
          calendarId: settings.calendarId || 'primary',
          timeMin: now.toISOString(),
          timeMax: oneWeekFromNow.toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        });
        
        const events = response.data.items || [];
        
        // Formatar eventos para o frontend
        const formattedEvents = events.map(event => {
          const startDateTime = event.start?.dateTime || event.start?.date;
          const endDateTime = event.end?.dateTime || event.end?.date;
          
          return {
            id: event.id,
            summary: event.summary || 'Sem título',
            description: event.description,
            start: startDateTime,
            end: endDateTime,
            location: event.location,
            attendees: event.attendees?.map(attendee => ({
              email: attendee.email,
              displayName: attendee.displayName,
              responseStatus: attendee.responseStatus
            })),
            created: event.created,
            updated: event.updated
          };
        });
        
        res.json(formattedEvents);
      } catch (googleError: any) {
        console.error("Google Calendar API error:", googleError);
        
        // Se erro de autenticação, marcar como desconectado
        if (googleError.code === 401) {
          await db.update(googleCalendarSettings)
            .set({ isConnected: false })
            .where(eq(googleCalendarSettings.franchiseId, franchise.id));
        }
        
        res.status(400).json({
          message: "Erro ao buscar eventos do Google Calendar",
          details: googleError.message
        });
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  // OAuth initialization for Google Calendar
  app.post("/api/franchise/calendar-oauth", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied: only franchise users can access this route" });
      }
      
      const { clientId, clientSecret, calendarId } = req.body;
      
      if (!clientId || !clientSecret) {
        return res.status(400).json({ 
          message: "Client ID e Client Secret são obrigatórios" 
        });
      }
      
      try {
        // Configurar cliente OAuth2
        const oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          `${req.protocol}://${req.get('host')}/api/franchise/calendar-oauth-callback`
        );
        
        // Gerar URL de autorização
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: ['https://www.googleapis.com/auth/calendar'],
          prompt: 'consent' // Force consent to get refresh token
        });
        
        // Store temporary data for callback
        const franchise = await storage.getFranchiseByUserId(userId);
        if (!franchise) {
          return res.status(404).json({ message: "Franchise not found" });
        }
        
        // In a production app, you'd store this in a temporary cache (Redis, etc.)
        // For now, we'll use a simple in-memory store
        global.tempOAuthData = global.tempOAuthData || {};
        global.tempOAuthData[franchise.id] = {
          clientId,
          clientSecret,
          calendarId: calendarId || 'primary',
          oauth2Client
        };
        
        res.json({
          success: true,
          authUrl: authUrl,
          message: "URL de autorização gerada. Abra a URL em uma nova janela para autorizar."
        });
        
      } catch (googleError: any) {
        console.error("Google OAuth error:", googleError);
        res.status(400).json({
          message: "Erro ao gerar URL de autorização",
          details: googleError.message
        });
      }
    } catch (error) {
      console.error("Error starting OAuth:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // OAuth callback for Google Calendar
  app.get("/api/franchise/calendar-oauth-callback", async (req: any, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).send(`
          <html>
            <body>
              <h2>Erro de Autorização</h2>
              <p>Código de autorização não recebido.</p>
              <script>window.close();</script>
            </body>
          </html>
        `);
      }
      
      // Get temporary OAuth data (in production, use proper session/cache)
      const tempData = global.tempOAuthData || {};
      let franchiseData = null;
      
      // Find the franchise data (this is a simple implementation)
      for (const [franchiseId, data] of Object.entries(tempData)) {
        franchiseData = { franchiseId, ...data };
        break; // Take the first one for simplicity
      }
      
      if (!franchiseData) {
        return res.status(400).send(`
          <html>
            <body>
              <h2>Erro</h2>
              <p>Dados de autorização não encontrados. Tente novamente.</p>
              <script>window.close();</script>
            </body>
          </html>
        `);
      }
      
      try {
        // Exchange code for tokens
        const { tokens } = await franchiseData.oauth2Client.getToken(code);
        
        // Save settings with refresh token
        const updateData = {
          clientId: franchiseData.clientId,
          clientSecret: franchiseData.clientSecret,
          calendarId: franchiseData.calendarId,
          refreshToken: tokens.refresh_token,
          isConnected: true,
          isEnabled: true,
          lastSync: new Date(),
          updatedAt: new Date()
        };
        
        // Check if settings exist
        const [existingSettings] = await db.select().from(googleCalendarSettings)
          .where(eq(googleCalendarSettings.franchiseId, franchiseData.franchiseId));
        
        if (existingSettings) {
          // Update existing
          await db.update(googleCalendarSettings)
            .set(updateData)
            .where(eq(googleCalendarSettings.franchiseId, franchiseData.franchiseId));
        } else {
          // Create new
          await db.insert(googleCalendarSettings)
            .values({
              franchiseId: franchiseData.franchiseId,
              ...updateData,
              defaultEventDuration: 60,
              eventTitle: "Consulta Agendada",
              eventDescription: "Consulta agendada via WhatsApp",
              eventLocation: ""
            });
        }
        
        // Clean up temporary data
        delete global.tempOAuthData[franchiseData.franchiseId];
        
        res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #10B981;">✓ Conexão Realizada com Sucesso!</h2>
              <p>Seu Google Calendar foi conectado com sucesso.</p>
              <p>Você pode fechar esta janela e retornar ao aplicativo.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
        `);
        
      } catch (tokenError) {
        console.error("Error exchanging code for tokens:", tokenError);
        res.status(500).send(`
          <html>
            <body>
              <h2>Erro</h2>
              <p>Erro ao trocar código por tokens: ${tokenError.message}</p>
              <script>window.close();</script>
            </body>
          </html>
        `);
      }
      
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.status(500).send(`
        <html>
          <body>
            <h2>Erro</h2>
            <p>Erro interno do servidor.</p>
            <script>window.close();</script>
          </body>
        </html>
      `);
    }
  });

  // Disconnect Google Calendar
  app.post("/api/franchise/calendar-disconnect", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ message: "Access denied: only franchise users can access this route" });
      }
      
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }
      
      // Update settings to disconnect
      await db.update(googleCalendarSettings)
        .set({ 
          isConnected: false, 
          refreshToken: null,
          updatedAt: new Date()
        })
        .where(eq(googleCalendarSettings.franchiseId, franchise.id));
      
      res.json({
        success: true,
        message: "Google Calendar desconectado com sucesso"
      });
      
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      res.status(500).json({ message: "Erro ao desconectar Google Calendar" });
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


  app.post("/api/franchise/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise') {
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

  app.patch("/api/franchise/whatsapp-instances/:instanceId/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
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

  app.delete("/api/franchise/whatsapp-instances/:instanceId", isAuthenticated, async (req: any, res) => {
    try {
      console.log(`🚀 DELETE /api/franchise/whatsapp-instances/${req.params.instanceId} iniciado`);

      const userId = getCurrentUserId(req);
      if (!userId) {
        console.log("❌ Usuário não autenticado");
        return res.status(401).json({ message: "Not authenticated" });
      }

      console.log(`👤 Usuário autenticado: ${userId}`);

      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise') {
        console.log(`❌ Acesso negado - role: ${user?.role}`);
        return res.status(403).json({ message: "Access denied" });
      }

      const { instanceId } = req.params;
      console.log(`🔍 Verificando instância: ${instanceId}`);

      // Verify instance belongs to user's franchise
      const instance = await storage.getWhatsappInstance(instanceId);
      if (!instance) {
        console.log("❌ Instância não encontrada");
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      console.log(`📱 Instância encontrada: ${instance.instanceName}`);

      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise || instance.franchiseId !== franchise.id) {
        console.log(`❌ Instância não pertence à franquia do usuário`);
        return res.status(404).json({ message: "Instância não encontrada" });
      }

      console.log(`🏢 Franquia verificada: ${franchise.id}`);

      // Always proceed with database deletion, regardless of Evolution API result
      let evolutionApiSuccess = false;

      // Get admin WhatsApp settings
      const adminSettings = await storage.getWhatsappApiSettings();
      if (adminSettings && adminSettings.evolutionApiUrl && adminSettings.globalToken) {
        try {
          console.log(`🌐 Tentando excluir da Evolution API: ${instance.instanceKey}`);
          // Try to delete from Evolution API
          const response = await fetch(`${adminSettings.evolutionApiUrl}/instance/delete/${instance.instanceKey}`, {
            method: 'DELETE',
            headers: {
              'apikey': adminSettings.globalToken,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            console.log(`✅ Excluído da Evolution API com sucesso`);
            evolutionApiSuccess = true;
          } else {
            console.warn(`⚠️ Evolution API retornou status ${response.status} - instância pode não existir mais`);
          }
        } catch (error) {
          console.warn("⚠️ Falha ao excluir da Evolution API (instância pode não existir mais):", error);
        }
      }

      // Delete from database - ALWAYS execute this, regardless of Evolution API result
      console.log(`🗃️ Iniciando exclusão do banco de dados...`);
      await storage.deleteWhatsappInstance(instanceId);

      console.log(`🎉 Instância excluída com sucesso do banco de dados`);

      const message = evolutionApiSuccess
        ? "Instância excluída com sucesso"
        : "Instância excluída do banco local (não encontrada na Evolution API)";

      res.json({ message });
    } catch (error) {
      console.error("❌ Erro ao excluir instância WhatsApp:", error);
      res.status(500).json({ message: "Falha ao excluir instancia do banco de dados" });
    }
  });

  app.post("/api/franchise/whatsapp-instances/:instanceKey/webhook", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
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
      const webhookUrl = `${baseUrl}/api/franchise/whatsapp-webhook/${instanceKey}`;
      
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

  app.post("/api/franchise/whatsapp-instances/:instanceKey/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
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
  app.post("/api/franchise/whatsapp-webhook/:instanceKey", async (req: any, res) => {
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

  // Get WhatsApp instances for client/franchise users
  app.get("/api/franchise/whatsapp-instances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'client' && user.role !== 'franchise')) {
        return res.status(403).json({ message: "Access denied" });
      }

      console.log(`🔍 Buscando instâncias WhatsApp para usuário ${user.role}: ${userId}`);

      // Get user's franchise
      let franchise;
      if (user.role === 'franchise') {
        franchise = await storage.getFranchiseByUserId(userId);
      } else if (user.role === 'client') {
        // For clients, get their franchise  
        franchise = await storage.getFranchiseByUserId(userId);
      }

      if (!franchise) {
        console.log(`❌ Franquia não encontrada para usuário ${userId}`);
        return res.status(404).json({ message: "Franquia não encontrada" });
      }
      
      console.log(`📍 Franquia encontrada: ${franchise.id} - ${franchise.businessName}`);

      const instances = await storage.getWhatsappInstancesByFranchise(franchise.id);
      console.log(`📱 Total de instâncias encontradas: ${instances.length}`);

      // Verificar status de cada instância
      const instancesWithStatus = await Promise.all(
        instances.map(async (instance) => {
          try {
            const statusResult = await whatsappService.getInstanceStatus(instance.instanceKey);
            return {
              id: instance.id,
              instanceKey: instance.instanceKey,
              friendlyName: instance.friendlyName || instance.instanceKey,
              isActive: instance.isActive,
              status: statusResult.success ? statusResult.status : 'disconnected'
            };
          } catch (error) {
            console.error(`Erro ao verificar status da instância ${instance.instanceKey}:`, error);
            return {
              id: instance.id,
              instanceKey: instance.instanceKey,
              friendlyName: instance.friendlyName || instance.instanceKey,
              isActive: instance.isActive,
              status: 'disconnected'
            };
          }
        })
      );

      console.log(`📊 Instâncias processadas: ${instancesWithStatus.length}`);
      
      res.json(instancesWithStatus);
    } catch (error: any) {
      console.error("Erro ao buscar instâncias WhatsApp:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp instances" });
    }
  });

  // Get conversations from Evolution API for client/franchise users
  app.get("/api/franchise/conversations-evolution", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Extract query parameters
      const { search, startDate, endDate, instanceKey } = req.query;
      
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'client' && user.role !== 'franchise')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      console.log(`🔍 Buscando conversas da Evolution para usuário ${user.role}: ${userId}`);
      console.log(`📋 Parâmetros: search=${search}, instanceKey=${instanceKey}`);
      
      // Get user's franchise
      let franchise;
      if (user.role === 'franchise') {
        franchise = await storage.getFranchiseByUserId(userId);
      } else if (user.role === 'client') {
        // For clients, get their franchise  
        franchise = await storage.getFranchiseByUserId(userId);
      }
      
      if (!franchise) {
        console.log(`❌ Franquia não encontrada para usuário ${userId}`);
        return res.status(404).json({ message: "Franquia não encontrada" });
      }
      
      console.log(`📍 Franquia encontrada: ${franchise.id} - ${franchise.businessName}`);
      
      // Get WhatsApp instances for this franchise
      const instances = await storage.getWhatsappInstancesByFranchise(franchise.id);
      
      // Filter instances based on instanceKey parameter or get active instances
      let targetInstances;
      if (instanceKey && typeof instanceKey === 'string') {
        targetInstances = instances.filter(instance => 
          instance.instanceKey === instanceKey && instance.isActive
        );
        console.log(`📱 Filtrando por instância específica: ${instanceKey}`);
      } else {
        targetInstances = instances.filter(instance => instance.isActive && instance.status === 'connected');
        console.log(`📱 Buscando em todas as instâncias ativas`);
      }
      
      const activeInstances = targetInstances;
      
      console.log(`📱 Instâncias encontradas: ${instances.length}, alvo: ${activeInstances.length}`);
      
      if (activeInstances.length === 0) {
        console.log(`⚠️  Nenhuma instância alvo encontrada`);
        return res.json([]);
      }
      
      // Collect conversations from all active instances
      const allConversations = [];
      
      for (const instance of activeInstances) {
        try {
          console.log(`🔍 Buscando chats da instância: ${instance.instanceKey}`);
          
          const chatsResult = await whatsappService.findChats(instance.instanceKey);
          
          if (!chatsResult.success) {
            console.error(`❌ Erro ao buscar chats da instância ${instance.instanceKey}:`, chatsResult.error);
            continue;
          }
          
          const chats = Array.isArray(chatsResult.data) ? chatsResult.data : (chatsResult.data?.chats || []);
          console.log(`📬 ${chats.length} chats encontrados na instância ${instance.instanceKey}`);
          
          // Transform Evolution API chat data to frontend format
          for (const chat of chats) {
            try {
              // Extract contact info - prioritize remoteJid (real WhatsApp ID) over internal ID
              const remoteJid = chat.remoteJid || chat.id || '';
              const contactPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
              
              // Extract contact name with fallback to phone number
              let contactName = contactPhone; // Default to phone number
              
              // Try to get a real contact name from various fields
              if (chat.name && chat.name !== contactPhone) {
                contactName = chat.name;
              } else if (chat.pushName && chat.pushName !== contactPhone && chat.pushName !== "Você") {
                contactName = chat.pushName;
              } else if (chat.contact?.name && chat.contact.name !== contactPhone) {
                contactName = chat.contact.name;
              } else if (chat.contact?.pushName && chat.contact.pushName !== contactPhone && chat.contact.pushName !== "Você") {
                contactName = chat.contact.pushName;
              } else if (chat.contact?.notify && chat.contact.notify !== contactPhone && chat.contact.notify !== "Você") {
                contactName = chat.contact.notify;
              }
              
              // Try to get name from last message ONLY if it's from the contact (not from us)
              if (chat.lastMessage?.pushName && 
                  chat.lastMessage.key?.fromMe === false && // Must be from contact
                  chat.lastMessage.pushName !== "Você" && 
                  chat.lastMessage.pushName !== contactPhone) {
                contactName = chat.lastMessage.pushName;
              }
              
              // If we still only have the phone number, try to find a name in message history
              if (contactName === contactPhone && chat.messages && Array.isArray(chat.messages)) {
                for (const msg of chat.messages) {
                  if (msg.key?.fromMe === false && msg.pushName && 
                      msg.pushName !== contactPhone && msg.pushName !== "Você") {
                    contactName = msg.pushName;
                    break; // Use the first valid name found
                  }
                }
              }
              
              // Final guarantee: contactName should NEVER be "Você" - always use phone as fallback
              if (contactName === "Você" || !contactName) {
                contactName = contactPhone;
              }
              
                      
              // Get last message info
              const lastMessage = chat.lastMessage || (chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null);
              const lastMessageText = lastMessage?.message?.conversation || 
                                    lastMessage?.message?.extendedTextMessage?.text ||
                                    lastMessage?.body ||
                                    lastMessage?.text ||
                                    'Sem mensagens';
              
              // Convert timestamp to proper date format
              let lastMessageTime = new Date().toISOString();
              if (lastMessage?.messageTimestamp) {
                // messageTimestamp usually comes as Unix timestamp (seconds)
                const timestamp = typeof lastMessage.messageTimestamp === 'string' ? 
                  parseInt(lastMessage.messageTimestamp) : lastMessage.messageTimestamp;
                lastMessageTime = new Date(timestamp * 1000).toISOString();
              } else if (lastMessage?.timestamp) {
                // timestamp might come as milliseconds or seconds
                const timestamp = typeof lastMessage.timestamp === 'string' ? 
                  parseInt(lastMessage.timestamp) : lastMessage.timestamp;
                // If timestamp is less than 10 digits, it's likely in seconds
                const multiplier = timestamp.toString().length <= 10 ? 1000 : 1;
                lastMessageTime = new Date(timestamp * multiplier).toISOString();
              }
              
              // Calculate unread count
              const unreadCount = chat.unreadCount || 0;
              
              // Determine status
              let status = 'active';
              if (chat.archived) {
                status = 'archived';
              } else if (unreadCount > 0) {
                status = 'pending';
              }
              
              const conversation = {
                id: remoteJid,
                contactName: contactName,
                contactPhone: contactPhone,
                lastMessage: lastMessageText.substring(0, 100), // Limit length
                lastMessageTime: lastMessageTime,
                status: status,
                unreadCount: unreadCount,
                avatar: chat.contact?.profilePictureUrl || null,
                instanceKey: instance.instanceKey,
                instanceName: instance.instanceName
              };
              
              allConversations.push(conversation);
              
            } catch (chatError) {
              console.error(`❌ Erro ao processar chat:`, chatError);
              continue;
            }
          }
          
        } catch (instanceError) {
          console.error(`❌ Erro ao processar instância ${instance.instanceKey}:`, instanceError);
          continue;
        }
      }
      
      // Apply filters if provided
      let filteredConversations = allConversations;
      
      // Search filter
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        filteredConversations = filteredConversations.filter(conv => 
          conv.contactName.toLowerCase().includes(searchTerm) ||
          conv.contactPhone.includes(searchTerm) ||
          conv.lastMessage.toLowerCase().includes(searchTerm)
        );
      }
      
      // Date filters
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        filteredConversations = filteredConversations.filter(conv => 
          new Date(conv.lastMessageTime) >= start
        );
      }
      
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of day
        filteredConversations = filteredConversations.filter(conv => 
          new Date(conv.lastMessageTime) <= end
        );
      }
      
      // Sort by last message time (most recent first)
      filteredConversations.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      console.log(`✅ Retornando ${filteredConversations.length} conversas (${allConversations.length} total antes dos filtros)`);
      
      res.json(filteredConversations);
      
    } catch (error) {
      console.error("❌ Error fetching conversations from Evolution:", error);
      res.status(500).json({ 
        message: "Erro ao buscar conversas", 
        error: error.message 
      });
    }
  });

  // Get messages for a specific conversation from Evolution API
  app.get("/api/franchise/conversations/:conversationId/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || (user.role !== 'client' && user.role !== 'franchise')) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const { conversationId } = req.params;
      console.log(`🔍 Buscando mensagens para conversa: ${conversationId}`);
      
      // Get user's franchise
      let franchise;
      if (user.role === 'franchise') {
        franchise = await storage.getFranchiseByUserId(userId);
      } else if (user.role === 'client') {
        franchise = await storage.getFranchiseByUserId(userId);
      }
      
      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }
      
      // Get WhatsApp instances for this franchise
      const instances = await storage.getWhatsappInstancesByFranchise(franchise.id);
      const activeInstances = instances.filter(instance => instance.isActive && instance.status === 'connected');
      
      if (activeInstances.length === 0) {
        return res.json([]);
      }
      
      // The conversationId is the remoteJid (e.g., "554999214230@s.whatsapp.net")
      console.log(`🔍 Buscando mensagens para remoteJid: ${conversationId}`);
      
      let allMessages = [];
      
      for (const instance of activeInstances) {
        try {
          console.log(`🔍 Tentando instância: ${instance.instanceKey}`);
          
          // First try using findMessagesFromChats which is more specific
          const chatsResult = await whatsappService.findMessagesFromChats(instance.instanceKey, conversationId);
          
          if (chatsResult.success && chatsResult.data && Array.isArray(chatsResult.data)) {
            // Extract messages from the chat data
            let messages = [];
            
            for (const chat of chatsResult.data) {
              if (chat.messages && Array.isArray(chat.messages)) {
                messages = messages.concat(chat.messages);
              } else if (chat.lastMessages && Array.isArray(chat.lastMessages)) {
                messages = messages.concat(chat.lastMessages);
              }
            }
            
            console.log(`📬 ${messages.length} mensagens encontradas via findMessagesFromChats`);
            
            if (messages.length > 0) {
              // Transform and sort messages
              const transformedMessages = messages
                .map(msg => {
                  // Extract message content
                  let content = '';
                  if (msg.message?.conversation) {
                    content = msg.message.conversation;
                  } else if (msg.message?.extendedTextMessage?.text) {
                    content = msg.message.extendedTextMessage.text;
                  } else if (msg.body) {
                    content = msg.body;
                  } else if (msg.text) {
                    content = msg.text;
                  } else if (typeof msg.message === 'string') {
                    content = msg.message;
                  } else {
                    content = 'Mensagem de mídia ou tipo não suportado';
                  }
                  
                  // Determine if message is from user (outgoing) or contact (incoming)
                  const isFromUser = msg.key?.fromMe || msg.fromMe || false;
                  
                  // Get timestamp and convert properly
                  let timestamp = new Date().toISOString();
                  if (msg.messageTimestamp) {
                    const ts = typeof msg.messageTimestamp === 'string' ? 
                      parseInt(msg.messageTimestamp) : msg.messageTimestamp;
                    timestamp = new Date(ts * 1000).toISOString();
                  } else if (msg.timestamp) {
                    const ts = typeof msg.timestamp === 'string' ? 
                      parseInt(msg.timestamp) : msg.timestamp;
                    const multiplier = ts.toString().length <= 10 ? 1000 : 1;
                    timestamp = new Date(ts * multiplier).toISOString();
                  }
                  
                  // Determine message status
                  let status = 'sent';
                  if (msg.status) {
                    switch (msg.status.toLowerCase()) {
                      case 'pending':
                        status = 'sent';
                        break;
                      case 'server':
                      case 'delivered':
                        status = 'delivered';
                        break;
                      case 'read':
                        status = 'read';
                        break;
                      case 'error':
                        status = 'failed';
                        break;
                      default:
                        status = 'sent';
                    }
                  }
                  
                  return {
                    id: msg.key?.id || msg.id || `msg_${Date.now()}_${Math.random()}`,
                    content: content,
                    timestamp: timestamp,
                    isFromUser: isFromUser,
                    status: status
                  };
                })
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Sort by timestamp ascending
              
              allMessages = transformedMessages;
              console.log(`✅ Sucesso! ${allMessages.length} mensagens transformadas e ordenadas`);
              break; // Found messages, no need to check other instances
            }
          }
          
          // Fallback: try the original findMessages method
          console.log(`🔄 Tentando método findMessages como fallback...`);
          const messagesResult = await whatsappService.findMessages(instance.instanceKey, conversationId, 1, 100);
          
          if (messagesResult.success && messagesResult.data && Array.isArray(messagesResult.data) && messagesResult.data.length > 0) {
            const messages = messagesResult.data;
            console.log(`📬 ${messages.length} mensagens encontradas via findMessages`);
            
            // Transform messages with same logic as above
            const transformedMessages = messages
              .map(msg => {
                let content = '';
                if (msg.message?.conversation) {
                  content = msg.message.conversation;
                } else if (msg.message?.extendedTextMessage?.text) {
                  content = msg.message.extendedTextMessage.text;
                } else if (msg.body) {
                  content = msg.body;
                } else if (msg.text) {
                  content = msg.text;
                } else if (typeof msg.message === 'string') {
                  content = msg.message;
                } else {
                  content = 'Mensagem de mídia ou tipo não suportado';
                }
                
                const isFromUser = msg.key?.fromMe || msg.fromMe || false;
                
                let timestamp = new Date().toISOString();
                if (msg.messageTimestamp) {
                  const ts = typeof msg.messageTimestamp === 'string' ? 
                    parseInt(msg.messageTimestamp) : msg.messageTimestamp;
                  timestamp = new Date(ts * 1000).toISOString();
                } else if (msg.timestamp) {
                  const ts = typeof msg.timestamp === 'string' ? 
                    parseInt(msg.timestamp) : msg.timestamp;
                  const multiplier = ts.toString().length <= 10 ? 1000 : 1;
                  timestamp = new Date(ts * multiplier).toISOString();
                }
                
                let status = 'sent';
                if (msg.status) {
                  switch (msg.status.toLowerCase()) {
                    case 'pending': status = 'sent'; break;
                    case 'server':
                    case 'delivered': status = 'delivered'; break;
                    case 'read': status = 'read'; break;
                    case 'error': status = 'failed'; break;
                    default: status = 'sent';
                  }
                }
                
                return {
                  id: msg.key?.id || msg.id || `msg_${Date.now()}_${Math.random()}`,
                  content: content,
                  timestamp: timestamp,
                  isFromUser: isFromUser,
                  status: status
                };
              })
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
            allMessages = transformedMessages;
            console.log(`✅ Fallback sucesso! ${allMessages.length} mensagens encontradas`);
            break;
          }
          
        } catch (instanceError) {
          console.error(`❌ Erro ao buscar mensagens na instância ${instance.instanceKey}:`, instanceError);
          continue;
        }
      }
      
      // Sort messages by timestamp (oldest first)
      allMessages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      console.log(`✅ Retornando ${allMessages.length} mensagens para conversa ${conversationId}`);
      
      res.json(allMessages);
      
    } catch (error) {
      console.error("❌ Error fetching messages from Evolution:", error);
      res.status(500).json({ 
        message: "Erro ao buscar mensagens", 
        error: error.message 
      });
    }
  });

  // Client profile routes
  app.get("/api/franchise/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem role franchise/client
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ 
          message: "Access denied: only franchise users can access this route"
        });
      }

      // Buscar dados da franquia
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }

      // Mapear campos da franquia para campos esperados pelo frontend
      const franchiseProfile = {
        companyName: franchise.franchiseName,
        legalName: franchise.franchiseName, // Para compatibilidade
        cpfCnpj: franchise.franchiseCode, // Usando franchiseCode como identificador
        taxId: '', // Campo vazio por compatibilidade
        street: franchise.street,
        number: franchise.number,
        complement: franchise.complement || '',
        neighborhood: franchise.neighborhood,
        city: franchise.city,
        state: franchise.state,
        zipCode: franchise.zipCode,
        contactPhone: franchise.contactPhone,
        whatsapp: franchise.contactPhone, // Usando mesmo telefone
        email: franchise.email,
        website: '', // Campo vazio por compatibilidade
        address: `${franchise.street}, ${franchise.number}${franchise.complement ? ', ' + franchise.complement : ''}, ${franchise.neighborhood}, ${franchise.city}/${franchise.state}`, // Endereço completo
        
        // Dados específicos da franquia
        franchiseName: franchise.franchiseName,
        franchiseCode: franchise.franchiseCode,
        managerName: franchise.managerName,
        managerPhone: franchise.managerPhone || '',
        managerEmail: franchise.managerEmail || '',
      };

      console.log('✅ Perfil da franquia carregado:', franchise.franchiseName);
      res.json(franchiseProfile);
      
    } catch (error) {
      console.error("Error fetching franchise profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/franchise/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verificar se o usuário tem role franchise/client
      const user = await storage.getUser(userId);
      if (user?.role !== 'franchise' && user?.role !== 'client') {
        return res.status(403).json({ 
          message: "Access denied: only franchise users can access this route"
        });
      }

      // Buscar franquia existente
      const franchise = await storage.getFranchiseByUserId(userId);
      if (!franchise) {
        return res.status(404).json({ message: "Franchise not found" });
      }

      // Validar dados recebidos usando campos compatíveis
      const updateData = {
        franchiseName: req.body.companyName || req.body.franchiseName || franchise.franchiseName,
        street: req.body.street || franchise.street || "",
        number: req.body.number || franchise.number || "",
        complement: req.body.complement || franchise.complement || "",
        neighborhood: req.body.neighborhood || franchise.neighborhood || "",
        city: req.body.city || franchise.city || "",
        state: req.body.state || franchise.state || "",
        zipCode: req.body.zipCode || franchise.zipCode || "",
        contactPhone: req.body.contactPhone || req.body.whatsapp || franchise.contactPhone || "",
        email: req.body.email || franchise.email || "",
        managerName: req.body.managerName || franchise.managerName || franchise.franchiseName || "",
        managerPhone: req.body.managerPhone || franchise.managerPhone || "",
        managerEmail: req.body.managerEmail || franchise.managerEmail || req.body.email || "",
        currentPassword: req.body.currentPassword || "",
        newPassword: req.body.newPassword || "",
        confirmPassword: req.body.confirmPassword || "",
      };

      try {
        // Validar com schema
        const validatedData = editFranchiseProfileSchema.parse(updateData);
        
        // Verificar se há alteração de senha - só altera se nova senha foi preenchida
        if (validatedData.newPassword && validatedData.newPassword.length > 0 && validatedData.currentPassword) {
          // Verificar senha atual
          const isCurrentPasswordValid = await bcrypt.compare(
            validatedData.currentPassword, 
            user.password
          );
          
          if (!isCurrentPasswordValid) {
            return res.status(400).json({ 
              message: "Senha atual incorreta" 
            });
          }
          
          // Hash da nova senha
          const hashedNewPassword = await bcrypt.hash(validatedData.newPassword, 10);
          
          // Atualizar senha do usuário
          await db
            .update(users)
            .set({
              password: hashedNewPassword,
              updatedAt: sql`CURRENT_TIMESTAMP`,
            })
            .where(eq(users.id, userId));
            
          console.log('✅ Senha do usuário atualizada');
        }
        
        // Atualizar dados da franquia (removendo campos de senha)
        const { currentPassword, newPassword, confirmPassword, ...franchiseData } = validatedData;
        
        await db
          .update(franchises)
          .set({
            ...franchiseData,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(franchises.id, franchise.id));

        console.log('✅ Perfil da franquia atualizado:', franchise.franchiseName);
        res.json({ message: "Profile updated successfully" });
        
      } catch (validationError) {
        console.error("Validation error:", validationError);
        return res.status(400).json({ 
          message: "Invalid data",
          errors: validationError.errors || validationError.message
        });
      }
      
    } catch (error) {
      console.error("Error updating franchise profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Rotas para gerenciar clientes da franquia
  // GET /api/franchise/clients - Listar clientes da franquia
  app.get("/api/franchise/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));
      
      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Buscar clientes da franquia
      const clients = await db.select()
        .from(franchiseClients)
        .where(eq(franchiseClients.franchiseId, franchise.id))
        .orderBy(desc(franchiseClients.createdAt));

      res.json(clients);
    } catch (error) {
      console.error("Error fetching franchise clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  // POST /api/franchise/clients - Criar novo cliente
  app.post("/api/franchise/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      
      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));
      
      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Validar dados do cliente
      const clientData = {
        ...req.body,
        franchiseId: franchise.id
      };

      // Validar se já existe cliente com o mesmo telefone na franquia
      const [existingClient] = await db.select()
        .from(franchiseClients)
        .where(
          and(
            eq(franchiseClients.franchiseId, franchise.id),
            eq(franchiseClients.phone, clientData.phone)
          )
        );

      if (existingClient) {
        return res.status(400).json({ message: "Já existe um cliente com este telefone" });
      }

      // Criar cliente
      await db.insert(franchiseClients)
        .values(clientData);

      // Buscar o cliente criado (o mais recente da franquia com o mesmo telefone)
      const [newClient] = await db.select()
        .from(franchiseClients)
        .where(
          and(
            eq(franchiseClients.franchiseId, franchise.id),
            eq(franchiseClients.phone, clientData.phone)
          )
        )
        .orderBy(desc(franchiseClients.createdAt))
        .limit(1);

      res.status(201).json(newClient);
    } catch (error) {
      console.error("Error creating franchise client:", error);
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });

  // GET /api/franchise/clients/:id - Buscar cliente específico
  app.get("/api/franchise/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const clientId = req.params.id;
      
      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));
      
      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Buscar cliente específico da franquia
      const [client] = await db.select()
        .from(franchiseClients)
        .where(
          and(
            eq(franchiseClients.id, clientId),
            eq(franchiseClients.franchiseId, franchise.id)
          )
        );

      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json(client);
    } catch (error) {
      console.error("Error fetching franchise client:", error);
      res.status(500).json({ message: "Erro ao buscar cliente" });
    }
  });

  // PUT /api/franchise/clients/:id - Atualizar cliente
  app.put("/api/franchise/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const clientId = req.params.id;
      
      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));
      
      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Verificar se cliente existe e pertence à franquia
      const [existingClient] = await db.select()
        .from(franchiseClients)
        .where(
          and(
            eq(franchiseClients.id, clientId),
            eq(franchiseClients.franchiseId, franchise.id)
          )
        );

      if (!existingClient) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      // Verificar se o telefone não está sendo usado por outro cliente
      if (req.body.phone && req.body.phone !== existingClient.phone) {
        const [duplicateClient] = await db.select()
          .from(franchiseClients)
          .where(
            and(
              eq(franchiseClients.franchiseId, franchise.id),
              eq(franchiseClients.phone, req.body.phone),
              ne(franchiseClients.id, clientId)
            )
          );

        if (duplicateClient) {
          return res.status(400).json({ message: "Já existe um cliente com este telefone" });
        }
      }

      // Atualizar cliente
      await db.update(franchiseClients)
        .set({
          ...req.body,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(franchiseClients.id, clientId),
            eq(franchiseClients.franchiseId, franchise.id)
          )
        );

      // Buscar o cliente atualizado
      const [updatedClient] = await db.select()
        .from(franchiseClients)
        .where(
          and(
            eq(franchiseClients.id, clientId),
            eq(franchiseClients.franchiseId, franchise.id)
          )
        )
        .limit(1);

      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating franchise client:", error);
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });

  // DELETE /api/franchise/clients/:id - Deletar cliente
  app.delete("/api/franchise/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const clientId = req.params.id;
      
      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));
      
      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Verificar se cliente existe e pertence à franquia
      const [existingClient] = await db.select()
        .from(franchiseClients)
        .where(
          and(
            eq(franchiseClients.id, clientId),
            eq(franchiseClients.franchiseId, franchise.id)
          )
        );

      if (!existingClient) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      // Deletar cliente
      await db.delete(franchiseClients)
        .where(
          and(
            eq(franchiseClients.id, clientId),
            eq(franchiseClients.franchiseId, franchise.id)
          )
        );

      res.json({ message: "Cliente deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting franchise client:", error);
      res.status(500).json({ message: "Erro ao deletar cliente" });
    }
  });

  // Rotas para gerenciar cards do kanban CRM
  // GET /api/franchise/crm/kanban - Listar cards do kanban da franquia
  app.get("/api/franchise/crm/kanban", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));

      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Buscar cards do kanban da franquia
      const kanbanCards = await storage.getCrmKanbanCards(franchise.id);

      res.json(kanbanCards);
    } catch (error) {
      console.error("Error fetching kanban cards:", error);
      res.status(500).json({ message: "Erro ao buscar cards do kanban" });
    }
  });

  // POST /api/franchise/crm/kanban - Criar novo card do kanban
  app.post("/api/franchise/crm/kanban", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));

      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      const cardData = {
        ...req.body,
        franchiseId: franchise.id,
      };

      const newCard = await storage.createCrmKanbanCard(cardData);

      res.status(201).json(newCard);
    } catch (error) {
      console.error("Error creating kanban card:", error);
      res.status(500).json({ message: "Erro ao criar card do kanban" });
    }
  });

  // PUT /api/franchise/crm/kanban/:id - Atualizar card do kanban
  app.put("/api/franchise/crm/kanban/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const cardId = req.params.id;

      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));

      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Verificar se o card pertence à franquia
      const existingCard = await storage.getCrmKanbanCard(cardId);
      if (!existingCard || existingCard.franchiseId !== franchise.id) {
        return res.status(404).json({ message: "Card não encontrado" });
      }

      const updatedCard = await storage.updateCrmKanbanCard(cardId, req.body);

      res.json(updatedCard);
    } catch (error) {
      console.error("Error updating kanban card:", error);
      res.status(500).json({ message: "Erro ao atualizar card do kanban" });
    }
  });

  // DELETE /api/franchise/crm/kanban/:id - Deletar card do kanban
  app.delete("/api/franchise/crm/kanban/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = getCurrentUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }
      const cardId = req.params.id;

      // Buscar franquia do usuário
      const [franchise] = await db.select().from(franchises).where(eq(franchises.userId, userId));

      if (!franchise) {
        return res.status(404).json({ message: "Franquia não encontrada" });
      }

      // Verificar se o card pertence à franquia
      const existingCard = await storage.getCrmKanbanCard(cardId);
      if (!existingCard || existingCard.franchiseId !== franchise.id) {
        return res.status(404).json({ message: "Card não encontrado" });
      }

      await storage.deleteCrmKanbanCard(cardId);

      res.json({ message: "Card deletado com sucesso" });
    } catch (error) {
      console.error("Error deleting kanban card:", error);
      res.status(500).json({ message: "Erro ao deletar card do kanban" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}