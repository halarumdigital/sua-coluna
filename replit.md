# Sistema de Franquias

## Overview

This is a comprehensive franchise management system built with modern web technologies. The system implements a hierarchical structure with four distinct user roles: Super Root (system administrator), Franchisors (franchise network owners), Franchises (individual franchise units), and end Clients. The platform provides complete management capabilities including AI-powered WhatsApp automation, custom agent creation, financial tracking, and multi-level administration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: Radix UI with Tailwind CSS using shadcn/ui design system
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with custom CSS variables for theming

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **Authentication**: Session-based auth with passport.js and Replit OIDC
- **API Design**: RESTful APIs with role-based access control
- **File Uploads**: Multer for handling file uploads (logos, favicons, PDFs)
- **Validation**: Zod schemas for runtime type validation

### Database Architecture
- **Database**: MySQL with connection pooling
- **ORM**: Drizzle ORM for type-safe database operations
- **Migrations**: Custom migration system for database versioning
- **Schema Management**: Centralized schema definitions in shared module

### Data Storage Solutions
- **Primary Database**: MySQL for all application data
- **Session Storage**: MySQL-based session store
- **File Storage**: Local filesystem for uploaded files (logos, documents)
- **Configuration**: Environment-based configuration management

### Authentication and Authorization
- **Authentication Provider**: Replit OIDC integration
- **Session Management**: Express sessions with MySQL store
- **Role-Based Access Control**: Four-tier hierarchy (super_root, franchisor, franchise, client)
- **Route Protection**: Middleware-based route protection per role
- **Permission System**: Granular permissions for different system features

### AI Integration Architecture
- **AI Provider**: OpenAI GPT models integration
- **Agent Management**: Custom AI agents with personalized prompts
- **PDF Training**: Document upload and text extraction for agent training
- **Usage Tracking**: Token consumption and cost monitoring
- **Model Configuration**: Temperature, max tokens, and model selection

### WhatsApp Integration
- **Evolution API**: Integration with Evolution API for WhatsApp automation
- **Instance Management**: Multi-instance support for different clients
- **Message Handling**: Automated message processing and responses
- **Conversation Tracking**: Complete conversation history storage
- **AI-Powered Responses**: Intelligent responses using custom AI agents

### Migration System
- **Version Control**: Chronological migration files with checksums
- **Auto-Migration**: Automatic execution in development environment
- **Manual Control**: Production migrations require explicit execution
- **Rollback Support**: Reversible migrations where applicable
- **Health Checks**: Database integrity and migration status monitoring

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Database connectivity layer
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/***: Comprehensive UI component library
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **mysql2**: MySQL database driver with promise support

### Authentication
- **passport**: Authentication middleware
- **openid-client**: OpenID Connect client implementation
- **express-session**: Session management middleware
- **express-mysql-session**: MySQL session store

### AI and ML Services
- **OpenAI API**: GPT model integration for AI agents
- **PDF Processing**: Server-side PDF text extraction capabilities

### UI and Styling
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **clsx**: Conditional className utility
- **lucide-react**: Icon library

### Development Tools
- **typescript**: Static type checking
- **vite**: Build tool and development server
- **tsx**: TypeScript execution for Node.js
- **cross-env**: Cross-platform environment variables

### WhatsApp Integration
- **Evolution API**: External WhatsApp Business API service
- **Webhook Support**: Real-time message processing
- **Media Handling**: Support for images, documents, and other media types

### File Processing
- **multer**: File upload handling
- **PDF Text Extraction**: Server-side PDF content processing for AI training