import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { runAutoMigrations } from "./migrations/auto-migrate";
import { db } from "./db";
import { sql } from "drizzle-orm";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from public directory
app.use('/uploads', (req, res, next) => {
  console.log('Static file request:', req.path);
  next();
}, express.static(path.join(process.cwd(), 'public/uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Função para garantir que as colunas PDF existam
async function ensurePDFColumns() {
  try {
    console.log('🔧 Verificando colunas PDF...');
    
    // Verificar se as colunas já existem
    const tableInfo = await db.execute(sql`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'custom_ai_agents'
      AND COLUMN_NAME IN ('pdf_files', 'pdf_contents')
    `);
    
    const existingColumns = (tableInfo as any[]).map(row => row.COLUMN_NAME);
    console.log('📊 Colunas PDF existentes:', existingColumns);
    
    // Adicionar pdf_files se não existir
    if (!existingColumns.includes('pdf_files')) {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_files JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_files adicionada');
    }
    
    // Adicionar pdf_contents se não existir
    if (!existingColumns.includes('pdf_contents')) {
      await db.execute(sql`
        ALTER TABLE custom_ai_agents 
        ADD COLUMN pdf_contents JSON DEFAULT ('[]')
      `);
      console.log('✅ Coluna pdf_contents adicionada');
    }
    
    console.log('🎉 Colunas PDF configuradas!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar colunas PDF:', error);
    // Não falhar a aplicação por causa disso
  }
}

(async () => {
  // Executa migrations automaticamente em desenvolvimento
  await runAutoMigrations();
  
  // Garantir que as colunas PDF existam
  await ensurePDFColumns();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('🔥 Error in middleware:', err);
    res.status(status).json({ message });
    // throw err; // Commented out to prevent HTML responses
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
