const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigrations() {
  try {
    console.log('Executando migrations manualmente...');
    
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root', 
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'sua_coluna',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
    });

    console.log('✅ Conexão estabelecida!');
    
    // Execute the main schema creation
    console.log('Criando tabelas principais...');
    
    // Sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(128) PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL,
        INDEX IDX_session_expire (expire)
      )
    `);
    
    // System settings table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) NOT NULL DEFAULT 'string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // User roles table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        description TEXT,
        permissions JSON NOT NULL DEFAULT ('[]'),
        is_system BOOLEAN NOT NULL DEFAULT FALSE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        email VARCHAR(255) UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        profile_image_url VARCHAR(500),
        password VARCHAR(255),
        role VARCHAR(10) NOT NULL DEFAULT 'client',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    // Clients table with all fields
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        company_name VARCHAR(255),
        legal_name VARCHAR(255),
        cpf_cnpj VARCHAR(20),
        tax_id VARCHAR(50),
        street VARCHAR(255),
        number VARCHAR(20),
        complement VARCHAR(100),
        neighborhood VARCHAR(100),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(10),
        address TEXT,
        contact_phone VARCHAR(20),
        whatsapp VARCHAR(20),
        email VARCHAR(255),
        website VARCHAR(255),
        system_password VARCHAR(255),
        full_name VARCHAR(255),
        primary_contact_name VARCHAR(255),
        primary_contact_phone VARCHAR(20),
        primary_contact_email VARCHAR(255),
        phone VARCHAR(20),
        business_sector VARCHAR(100),
        general_notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Team members table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS team_members (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        position VARCHAR(100),
        department VARCHAR(100),
        salary DECIMAL(10, 2),
        hire_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);
    
    // Projects table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        client_id VARCHAR(36),
        status VARCHAR(15) NOT NULL DEFAULT 'planning',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        budget DECIMAL(10, 2),
        progress INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id)
      )
    `);
    
    // Other tables...
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS project_assignments (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        project_id VARCHAR(36),
        team_member_id VARCHAR(36),
        role VARCHAR(100),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (team_member_id) REFERENCES team_members(id)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        number VARCHAR(50) UNIQUE NOT NULL,
        client_id VARCHAR(36),
        project_id VARCHAR(36),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(15) NOT NULL DEFAULT 'draft',
        issue_date TIMESTAMP NOT NULL,
        due_date TIMESTAMP NOT NULL,
        paid_date TIMESTAMP,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(id),
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);
    
    // AI tables
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_configurations (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(100) UNIQUE NOT NULL,
        display_name VARCHAR(200) NOT NULL,
        description TEXT,
        api_key VARCHAR(500),
        model VARCHAR(50) NOT NULL DEFAULT 'gpt-3.5-turbo',
        temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
        max_tokens INT NOT NULL DEFAULT 1000,
        system_prompt TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        created_by VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_ai_config_active (is_active),
        INDEX idx_ai_config_default (is_default)
      )
    `);
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ai_usage (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36),
        model VARCHAR(50) NOT NULL,
        prompt_tokens INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        total_tokens INT NOT NULL DEFAULT 0,
        cost DECIMAL(10, 6) NOT NULL DEFAULT 0,
        request_type VARCHAR(50) NOT NULL DEFAULT 'chat',
        success BOOLEAN NOT NULL DEFAULT TRUE,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        INDEX idx_ai_usage_user (user_id),
        INDEX idx_ai_usage_date (created_at),
        INDEX idx_ai_usage_model (model)
      )
    `);
    
    console.log('✅ Todas as tabelas criadas com sucesso!');
    
    // Mark migration as completed
    await connection.execute(`
      INSERT INTO migrations (id, name, checksum, success) 
      VALUES ('20250204120000_initial_schema', 'Initial Schema Setup', 'manual_execution', TRUE)
    `);
    
    console.log('✅ Migration marcada como executada!');
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

runMigrations();