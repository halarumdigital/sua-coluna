const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function createFranchiseSystem() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('🚀 Criando sistema de franquias...');

    // 1. Atualizar tabela users para suportar novos roles
    console.log('📝 Atualizando tabela users...');
    await connection.execute(`
      ALTER TABLE users 
      MODIFY COLUMN role VARCHAR(15) NOT NULL DEFAULT 'client'
    `);

    // 2. Criar tabela de planos
    console.log('📝 Criando tabela plans...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS plans (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        max_franchises INT NOT NULL DEFAULT 1,
        max_phone_numbers INT NOT NULL DEFAULT 1,
        max_agents INT NOT NULL DEFAULT 1,
        max_prompts INT NOT NULL DEFAULT 5,
        monthly_price DECIMAL(10,2) NOT NULL,
        features JSON NOT NULL DEFAULT ('[]'),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3. Criar tabela de franqueadores (sem foreign keys primeiro)
    console.log('📝 Criando tabela franchisors...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS franchisors (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        user_id VARCHAR(36) NOT NULL,
        plan_id VARCHAR(36) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        legal_name VARCHAR(255) NOT NULL,
        cnpj VARCHAR(20) UNIQUE NOT NULL,
        street VARCHAR(255) NOT NULL,
        number VARCHAR(20) NOT NULL,
        complement VARCHAR(100),
        neighborhood VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(50) NOT NULL,
        zip_code VARCHAR(10) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        plan_start_date TIMESTAMP NOT NULL,
        plan_end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 3.1. Adicionar foreign keys para franchisors
    console.log('📝 Adicionando foreign keys para franchisors...');
    try {
      await connection.execute(`
        ALTER TABLE franchisors 
        ADD CONSTRAINT fk_franchisors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchisors_user já existe ou erro:', error.message);
      }
    }
    
    try {
      await connection.execute(`
        ALTER TABLE franchisors 
        ADD CONSTRAINT fk_franchisors_plan FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchisors_plan já existe ou erro:', error.message);
      }
    }

    // 4. Criar tabela de franquias (sem foreign keys primeiro)
    console.log('📝 Criando tabela franchises...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS franchises (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchisor_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        franchise_name VARCHAR(255) NOT NULL,
        franchise_code VARCHAR(50) UNIQUE NOT NULL,
        street VARCHAR(255) NOT NULL,
        number VARCHAR(20) NOT NULL,
        complement VARCHAR(100),
        neighborhood VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(50) NOT NULL,
        zip_code VARCHAR(10) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        email VARCHAR(255) NOT NULL,
        manager_name VARCHAR(255) NOT NULL,
        manager_phone VARCHAR(20),
        manager_email VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 4.1. Adicionar foreign keys para franchises
    console.log('📝 Adicionando foreign keys para franchises...');
    try {
      await connection.execute(`
        ALTER TABLE franchises 
        ADD CONSTRAINT fk_franchises_franchisor FOREIGN KEY (franchisor_id) REFERENCES franchisors(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchises_franchisor já existe ou erro:', error.message);
      }
    }
    
    try {
      await connection.execute(`
        ALTER TABLE franchises 
        ADD CONSTRAINT fk_franchises_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchises_user já existe ou erro:', error.message);
      }
    }

    // 5. Criar tabela de números de telefone das franquias (sem foreign keys primeiro)
    console.log('📝 Criando tabela franchise_phone_numbers...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS franchise_phone_numbers (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchise_id VARCHAR(36) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        whatsapp_instance_id VARCHAR(36),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 5.1. Adicionar foreign keys para franchise_phone_numbers
    console.log('📝 Adicionando foreign keys para franchise_phone_numbers...');
    try {
      await connection.execute(`
        ALTER TABLE franchise_phone_numbers 
        ADD CONSTRAINT fk_franchise_phones_franchise FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchise_phones_franchise já existe ou erro:', error.message);
      }
    }
    
    try {
      await connection.execute(`
        ALTER TABLE franchise_phone_numbers 
        ADD CONSTRAINT fk_franchise_phones_whatsapp FOREIGN KEY (whatsapp_instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchise_phones_whatsapp já existe ou erro:', error.message);
      }
    }

    // 6. Criar tabela de agentes das franquias (sem foreign keys primeiro)
    console.log('📝 Criando tabela franchise_agents...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS franchise_agents (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchise_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        department VARCHAR(100),
        specialties JSON DEFAULT ('[]'),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 6.1. Adicionar foreign key para franchise_agents
    console.log('📝 Adicionando foreign key para franchise_agents...');
    try {
      await connection.execute(`
        ALTER TABLE franchise_agents 
        ADD CONSTRAINT fk_franchise_agents_franchise FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchise_agents_franchise já existe ou erro:', error.message);
      }
    }

    // 7. Criar tabela de prompts das franquias (sem foreign keys primeiro)
    console.log('📝 Criando tabela franchise_prompts...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS franchise_prompts (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchise_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        prompt TEXT NOT NULL,
        category VARCHAR(100),
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 7.1. Adicionar foreign key para franchise_prompts
    console.log('📝 Adicionando foreign key para franchise_prompts...');
    try {
      await connection.execute(`
        ALTER TABLE franchise_prompts 
        ADD CONSTRAINT fk_franchise_prompts_franchise FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_franchise_prompts_franchise já existe ou erro:', error.message);
      }
    }

    // 8. Adicionar coluna franchise_id na tabela clients
    console.log('📝 Atualizando tabela clients...');
    try {
      await connection.execute(`
        ALTER TABLE clients 
        ADD COLUMN franchise_id VARCHAR(36)
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate column name')) {
        console.log('⚠️  Erro ao adicionar coluna franchise_id:', error.message);
      } else {
        console.log('⚠️  Coluna franchise_id já existe na tabela clients');
      }
    }

    // 8.1. Adicionar foreign key para clients
    console.log('📝 Adicionando foreign key para clients...');
    try {
      await connection.execute(`
        ALTER TABLE clients 
        ADD CONSTRAINT fk_clients_franchise FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE SET NULL
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_clients_franchise já existe ou erro:', error.message);
      }
    }

    // 9. Criar usuário super root
    console.log('👤 Criando usuário super root...');
    const hashedPassword = await bcrypt.hash('superroot123', 10);
    
    try {
      await connection.execute(`
        INSERT INTO users (email, first_name, last_name, password, role, active)
        VALUES ('superroot@sistema.com', 'Super', 'Root', ?, 'super_root', TRUE)
      `, [hashedPassword]);
      console.log('✅ Usuário super root criado com sucesso!');
      console.log('📧 Email: superroot@sistema.com');
      console.log('🔑 Senha: superroot123');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('⚠️  Usuário super root já existe');
      } else {
        throw error;
      }
    }

    // 10. Criar alguns planos de exemplo
    console.log('📦 Criando planos de exemplo...');
    const planos = [
      {
        name: 'Plano Básico',
        description: 'Plano ideal para pequenas franquias',
        maxFranchises: 5,
        maxPhoneNumbers: 2,
        maxAgents: 3,
        maxPrompts: 10,
        monthlyPrice: 299.90,
        features: JSON.stringify(['WhatsApp Integration', 'Basic AI Support', 'Client Management'])
      },
      {
        name: 'Plano Profissional',
        description: 'Plano para franquias em crescimento',
        maxFranchises: 15,
        maxPhoneNumbers: 5,
        maxAgents: 10,
        maxPrompts: 25,
        monthlyPrice: 599.90,
        features: JSON.stringify(['WhatsApp Integration', 'Advanced AI Support', 'Client Management', 'Analytics', 'Custom Prompts'])
      },
      {
        name: 'Plano Enterprise',
        description: 'Plano para grandes redes de franquia',
        maxFranchises: 50,
        maxPhoneNumbers: 15,
        maxAgents: 30,
        maxPrompts: 100,
        monthlyPrice: 1299.90,
        features: JSON.stringify(['WhatsApp Integration', 'Premium AI Support', 'Advanced Client Management', 'Full Analytics', 'Custom Prompts', 'Priority Support', 'API Access'])
      }
    ];

    for (const plano of planos) {
      try {
        await connection.execute(`
          INSERT INTO plans (name, description, max_franchises, max_phone_numbers, max_agents, max_prompts, monthly_price, features)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [plano.name, plano.description, plano.maxFranchises, plano.maxPhoneNumbers, plano.maxAgents, plano.maxPrompts, plano.monthlyPrice, plano.features]);
        console.log(`✅ Plano "${plano.name}" criado com sucesso!`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️  Plano "${plano.name}" já existe`);
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 Sistema de franquias criado com sucesso!');
    console.log('\n📋 Resumo da hierarquia criada:');
    console.log('1. Super Root - Gerencia planos e franqueadores');
    console.log('2. Franqueadores - Gerenciam suas franquias conforme o plano');
    console.log('3. Franquias - Gerenciam números, agentes e prompts');
    console.log('4. Clientes - Pertencem a uma franquia específica');

  } catch (error) {
    console.error('❌ Erro ao criar sistema de franquias:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createFranchiseSystem()
    .then(() => {
      console.log('✅ Migração concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na migração:', error);
      process.exit(1);
    });
}

module.exports = { createFranchiseSystem };