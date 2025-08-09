const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function fixFranchiseStructure() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    console.log('🔄 Corrigindo estrutura do sistema de franquias...');

    // 1. Primeiro, vamos verificar se existem dados para migrar
    const [existingAdmins] = await connection.execute(`
      SELECT id, email, first_name, last_name, phone, password, created_at
      FROM users 
      WHERE role = 'admin'
    `);

    const [existingClients] = await connection.execute(`
      SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.password, u.created_at as user_created_at
      FROM clients c
      JOIN users u ON c.user_id = u.id
      WHERE u.role = 'client'
    `);

    console.log(`📊 Encontrados ${existingAdmins.length} admins e ${existingClients.length} clients para migrar`);

    // 2. Migrar admins existentes para franqueadores
    if (existingAdmins.length > 0) {
      console.log('🔄 Migrando admins para franqueadores...');
      
      // Primeiro, precisamos de um plano padrão para os franqueadores existentes
      const [defaultPlan] = await connection.execute(`
        SELECT id FROM plans WHERE name = 'Plano Básico' LIMIT 1
      `);

      if (defaultPlan.length === 0) {
        throw new Error('Plano padrão não encontrado. Execute o script de criação primeiro.');
      }

      const defaultPlanId = defaultPlan[0].id;

      for (const admin of existingAdmins) {
        try {
          // Atualizar role do usuário
          await connection.execute(`
            UPDATE users SET role = 'franchisor' WHERE id = ?
          `, [admin.id]);

          // Criar registro de franqueador
          await connection.execute(`
            INSERT INTO franchisors (
              user_id, plan_id, company_name, legal_name, cnpj,
              street, number, neighborhood, city, state, zip_code,
              contact_phone, email, plan_start_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
          `, [
            admin.id,
            defaultPlanId,
            `Empresa ${admin.first_name} ${admin.last_name}`,
            `${admin.first_name} ${admin.last_name} LTDA`,
            '00000000000000', // CNPJ temporário
            'Rua Exemplo',
            '123',
            'Centro',
            'Cidade',
            'Estado',
            '00000-000',
            admin.phone || '(00) 00000-0000',
            admin.email
          ]);

          console.log(`✅ Admin ${admin.email} migrado para franqueador`);
        } catch (error) {
          console.log(`⚠️  Erro ao migrar admin ${admin.email}:`, error.message);
        }
      }
    }

    // 3. Migrar clients existentes para franquias
    if (existingClients.length > 0) {
      console.log('🔄 Migrando clients para franquias...');

      // Pegar o primeiro franqueador para associar as franquias
      const [firstFranchisor] = await connection.execute(`
        SELECT id FROM franchisors LIMIT 1
      `);

      if (firstFranchisor.length === 0) {
        console.log('⚠️  Nenhum franqueador encontrado. Criando franqueador padrão...');
        
        // Criar usuário franqueador padrão
        const hashedPassword = await bcrypt.hash('franqueador123', 10);
        const [userResult] = await connection.execute(`
          INSERT INTO users (email, first_name, last_name, password, role, active)
          VALUES ('franqueador@sistema.com', 'Franqueador', 'Padrão', ?, 'franchisor', TRUE)
        `, [hashedPassword]);

        const defaultUserId = userResult.insertId;

        // Criar franqueador padrão
        const [defaultPlan] = await connection.execute(`
          SELECT id FROM plans WHERE name = 'Plano Básico' LIMIT 1
        `);

        await connection.execute(`
          INSERT INTO franchisors (
            user_id, plan_id, company_name, legal_name, cnpj,
            street, number, neighborhood, city, state, zip_code,
            contact_phone, email, plan_start_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `, [
          defaultUserId,
          defaultPlan[0].id,
          'Franqueador Padrão LTDA',
          'Franqueador Padrão LTDA',
          '11111111111111',
          'Rua Franqueador',
          '456',
          'Centro',
          'Cidade',
          'Estado',
          '11111-111',
          '(11) 11111-1111',
          'franqueador@sistema.com'
        ]);

        const [newFranchisor] = await connection.execute(`
          SELECT id FROM franchisors WHERE user_id = ?
        `, [defaultUserId]);

        firstFranchisor[0] = { id: newFranchisor[0].id };
      }

      const defaultFranchisorId = firstFranchisor[0].id;

      for (const client of existingClients) {
        try {
          // Atualizar role do usuário
          await connection.execute(`
            UPDATE users SET role = 'franchise' WHERE id = ?
          `, [client.user_id]);

          // Criar registro de franquia
          await connection.execute(`
            INSERT INTO franchises (
              franchisor_id, user_id, franchise_name, franchise_code,
              street, number, complement, neighborhood, city, state, zip_code,
              contact_phone, email, manager_name, manager_phone, manager_email
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            defaultFranchisorId,
            client.user_id,
            client.company_name || `Franquia ${client.first_name} ${client.last_name}`,
            `FRAN${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
            client.street || 'Rua Exemplo',
            client.number || '123',
            client.complement,
            client.neighborhood || 'Centro',
            client.city || 'Cidade',
            client.state || 'Estado',
            client.zip_code || '00000-000',
            client.contact_phone || client.phone || '(00) 00000-0000',
            client.email,
            client.primary_contact_name || `${client.first_name} ${client.last_name}`,
            client.primary_contact_phone || client.phone,
            client.primary_contact_email || client.email
          ]);

          console.log(`✅ Client ${client.email} migrado para franquia`);
        } catch (error) {
          console.log(`⚠️  Erro ao migrar client ${client.email}:`, error.message);
        }
      }
    }

    // 4. Criar novos clientes que agora pertencem às franquias
    console.log('📝 Criando tabela de novos clientes...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS new_clients (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchise_id VARCHAR(36) NOT NULL,
        
        -- Dados básicos do cliente
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        cpf_cnpj VARCHAR(20),
        
        -- Endereço
        street VARCHAR(255),
        number VARCHAR(20),
        complement VARCHAR(100),
        neighborhood VARCHAR(100),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(10),
        
        -- Informações adicionais
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Adicionar foreign key para new_clients
    try {
      await connection.execute(`
        ALTER TABLE new_clients 
        ADD CONSTRAINT fk_new_clients_franchise FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
      `);
    } catch (error) {
      if (!error.message.includes('Duplicate foreign key constraint name')) {
        console.log('⚠️  Foreign key fk_new_clients_franchise já existe ou erro:', error.message);
      }
    }

    // 5. Renomear tabela clients para old_clients (backup)
    console.log('📝 Fazendo backup da tabela clients...');
    try {
      await connection.execute(`RENAME TABLE clients TO old_clients`);
      console.log('✅ Tabela clients renomeada para old_clients');
    } catch (error) {
      console.log('⚠️  Erro ao renomear tabela clients:', error.message);
    }

    // 6. Renomear new_clients para clients
    try {
      await connection.execute(`RENAME TABLE new_clients TO clients`);
      console.log('✅ Tabela new_clients renomeada para clients');
    } catch (error) {
      console.log('⚠️  Erro ao renomear tabela new_clients:', error.message);
    }

    console.log('\n🎉 Estrutura corrigida com sucesso!');
    console.log('\n📋 Nova hierarquia:');
    console.log('1. Super Root - Gerencia planos e franqueadores');
    console.log('2. Franqueadores (ex-admins) - Gerenciam suas franquias');
    console.log('3. Franquias (ex-clients) - Gerenciam seus clientes finais');
    console.log('4. Clientes - Clientes finais das franquias');

    console.log('\n👤 Credenciais de acesso:');
    console.log('Super Root: superroot@sistema.com / superroot123');
    if (existingAdmins.length === 0) {
      console.log('Franqueador Padrão: franqueador@sistema.com / franqueador123');
    }

  } catch (error) {
    console.error('❌ Erro ao corrigir estrutura:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixFranchiseStructure()
    .then(() => {
      console.log('✅ Correção concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na correção:', error);
      process.exit(1);
    });
}

module.exports = { fixFranchiseStructure };