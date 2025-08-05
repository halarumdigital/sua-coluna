import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250204120001_add_user_preferences',
  name: 'Add User Preferences Table',
  
  async up() {
    console.log('Executando migration: Add User Preferences Table');
    
    // Cria tabela de preferências do usuário
    await db.execute(sql`
      CREATE TABLE user_preferences (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        preference_key VARCHAR(100) NOT NULL,
        preference_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_preference (user_id, preference_key)
      )
    `);

    // Adiciona índices para performance
    await db.execute(sql`
      CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key)
    `);

    // Insere algumas preferências padrão para usuários existentes
    await db.execute(sql`
      INSERT INTO user_preferences (user_id, preference_key, preference_value)
      SELECT id, 'theme', 'light' FROM users WHERE active = TRUE
    `);

    await db.execute(sql`
      INSERT INTO user_preferences (user_id, preference_key, preference_value)
      SELECT id, 'language', 'pt-BR' FROM users WHERE active = TRUE
    `);

    console.log('✅ Tabela user_preferences criada com preferências padrão');
  },
  
  async down() {
    console.log('Revertendo migration: Add User Preferences Table');
    
    // Remove a tabela
    await db.execute(sql`DROP TABLE IF EXISTS user_preferences`);
    
    console.log('✅ Tabela user_preferences removida');
  }
};