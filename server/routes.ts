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
import { db } from "./db";
import { aiUsage } from "@shared/schema";
import { sum, count, desc, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from uploads directory
  const path = await import('path');
  const express = await import('express');
  app.use('/uploads', express.default.static(path.join(process.cwd(), 'public', 'uploads')));

  // System settings route (public - no auth required)
  app.get("/api/system/settings", async (req: any, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
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

  const httpServer = createServer(app);
  return httpServer;
}