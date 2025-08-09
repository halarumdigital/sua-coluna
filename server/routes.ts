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
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (user?.role !== 'super_root') {
        return res.status(403).json({ message: "Access denied" });
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
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create franchisor" });
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

      const { insertPlanSchema } = await import("@shared/schema");
      const validatedData = insertPlanSchema.parse(req.body);

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
      const { insertPlanSchema } = await import("@shared/schema");
      const validatedData = insertPlanSchema.parse(req.body);

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

  const httpServer = createServer(app);
  return httpServer;
}