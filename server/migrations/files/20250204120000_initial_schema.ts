import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250204120000_initial_schema',
  name: 'Initial Schema Setup',
  
  async up() {
    console.log('Executando migration: Initial Schema Setup');
    
    // Esta migration garante que todas as tabelas do schema atual existam
    // Útil para ambientes que já têm o banco criado via drizzle-kit push
    
    // Verifica se as tabelas principais existem, se não, cria
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR(128) PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL,
        INDEX IDX_session_expire (expire)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) NOT NULL DEFAULT 'string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.execute(sql`
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

    await db.execute(sql`
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

    console.log('✅ Tabelas principais criadas/verificadas');
  },
  
  async down() {
    console.log('Revertendo migration: Initial Schema Setup');
    
    // Esta migration não deve ser revertida pois remove tabelas fundamentais
    console.log('⚠️  Esta migration não pode ser revertida pois contém o schema inicial');
    throw new Error('Migration inicial não pode ser revertida');
  }
};