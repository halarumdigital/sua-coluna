# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Development Server:**
```bash
npm run dev          # Start development server with hot reload
```

**Build and Production:**
```bash
npm run build        # Build for production (Vite + esbuild)
npm start           # Start production server
npm run check       # Run TypeScript type checking
```

**Database Management:**
```bash
npm run db:push             # Push schema changes to database
npm run migration:run       # Execute pending migrations
npm run migration:status    # Check migration status
npm run migration:rollback  # Rollback last migration
npm run migration:create    # Create new migration
npm run db:health          # Database health check
npm run db:integrity       # Database integrity check
```

## Architecture Overview

This is a full-stack franchise management system built with **Express.js backend** and **React frontend**, using a **multi-tenant architecture** supporting different user roles.

### Tech Stack
- **Backend**: Express.js + TypeScript, Drizzle ORM with MySQL
- **Frontend**: React + TypeScript, Wouter for routing, TanStack Query, Radix UI + Tailwind CSS
- **Database**: MySQL with Drizzle ORM and custom migration system
- **Authentication**: Session-based auth with Passport.js
- **Build Tools**: Vite (frontend), esbuild (backend)

### Core Architecture

**Multi-Tenant Role System:**
- `super_root`: System administrator (manages franchisors and plans)
- `admin`: Franchisor (manages franchises and their settings)  
- `franchise`: Franchise owner (manages clients and operations)
- `team`: Franchise team member (limited access)

**Key Components:**
- **Database Schema** (`shared/schema.ts`): Shared type definitions and Drizzle schema
- **Routes** (`server/routes.ts`): All API endpoints with role-based access control
- **Authentication** (`server/replitAuth.ts`): Session management and user authentication
- **Migrations** (`server/migrations/`): Custom database migration system
- **WhatsApp Integration** (`server/whatsapp.ts`, `server/whatsapp-ai-handler.ts`): Integration with WhatsApp Business API
- **AI Services** (`server/openai.ts`): OpenAI integration for AI agents and responses

### Project Structure
```
├── server/           # Backend Express.js application
│   ├── migrations/   # Database migration system
│   └── *.ts         # Core server modules
├── client/          # Frontend React application  
│   └── src/
│       ├── pages/   # Route components organized by user role
│       ├── components/ # Reusable UI components
│       └── hooks/   # Custom React hooks
├── shared/          # Shared schema and types
└── public/          # Static assets and uploads
```

### Database Design
- Uses **MySQL** with **Drizzle ORM**
- Custom migration system (not drizzle-kit migrations)
- Multi-tenant design with franchise hierarchy
- Tables for users, franchises, WhatsApp instances, AI agents, conversations, etc.

### Development Notes

**Frontend Routing:**
Uses Wouter with role-based route protection. Pages are organized by user role in `client/src/pages/`.

**API Structure:**
RESTful APIs in `/api/*` with middleware for authentication and role validation.

**File Uploads:**
Handled via multer middleware, stored in `public/uploads/` directory.

**Environment Configuration:**
Uses `.env` for configuration. Database credentials, API keys, and service URLs are environment-dependent.

**Migration System:**
Custom implementation in `server/migrations/` - migrations auto-run in development, must be run manually in production.

**WhatsApp Integration:**
Supports multiple WhatsApp Business instances per franchise with webhook-based message handling and AI-powered responses.