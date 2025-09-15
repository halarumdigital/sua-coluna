import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '20250915000003_create_franchise_clients_table',
  name: 'Create franchise clients table',

  async up() {
    console.log('Executando migration: Create franchise clients table');

    // Criar a tabela franchise_clients conforme definida no schema
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS franchise_clients (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        franchise_id VARCHAR(36) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        cpf VARCHAR(14),
        street VARCHAR(255),
        number VARCHAR(20),
        complement VARCHAR(100),
        neighborhood VARCHAR(100),
        city VARCHAR(100),
        state VARCHAR(50),
        zip_code VARCHAR(10),
        last_appointment_date TIMESTAMP NULL,
        total_appointments INT NOT NULL DEFAULT 0,
        notes TEXT,
        source VARCHAR(50) NOT NULL DEFAULT 'whatsapp',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_franchise_clients_franchise (franchise_id),
        INDEX idx_franchise_clients_phone (phone),
        INDEX idx_franchise_clients_status (status),

        CONSTRAINT fk_franchise_clients_franchise
          FOREIGN KEY (franchise_id) REFERENCES franchises(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Tabela franchise_clients criada com sucesso');

    // Verificar se existem dados na tabela clients antiga que podem ser migrados
    console.log('\\n🔍 Verificando dados na tabela clients antiga...');

    try {
      const [clientsExists] = await db.execute(sql.raw(`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
        AND table_name = 'clients'
      `));

      if ((clientsExists as any)[0].count > 0) {
        console.log('📋 Tabela clients ainda existe');

        // Verificar quantos registros existem
        const [clientsCount] = await db.execute(sql`SELECT COUNT(*) as count FROM clients`);
        console.log(`   Encontrados ${(clientsCount as any)[0].count} registros em clients`);

        if ((clientsCount as any)[0].count > 0) {
          console.log('\\n💡 RECOMENDAÇÃO: Migrar dados de clients para franchise_clients');
          console.log('   Execute o seguinte SQL manualmente após verificar os dados:');
          console.log(`
   INSERT INTO franchise_clients (
     franchise_id, full_name, phone, email, cpf,
     street, number, complement, neighborhood, city, state, zip_code,
     notes, source, status, created_at, updated_at
   )
   SELECT
     franchise_id, full_name, phone, email, cpf_cnpj,
     street, number, complement, neighborhood, city, state, zip_code,
     notes, 'legacy' as source, status, created_at, updated_at
   FROM clients
   WHERE franchise_id IS NOT NULL;
          `);

          console.log('\\n   Após migrar os dados, remova a tabela clients:');
          console.log('   DROP TABLE clients;');
        }
      } else {
        console.log('✅ Tabela clients não existe mais (já foi removida)');
      }
    } catch (error) {
      console.log('⚠️  Erro ao verificar tabela clients:', (error as any).message);
    }

    console.log('\\n✅ Migration create franchise clients table concluída');
  },

  async down() {
    console.log('Revertendo migration: Create franchise clients table');

    // Remover foreign key primeiro
    try {
      await db.execute(sql`
        ALTER TABLE franchise_clients
        DROP FOREIGN KEY fk_franchise_clients_franchise
      `);
      console.log('✅ Foreign key removida');
    } catch (error) {
      console.log('⚠️  Foreign key pode não existir');
    }

    // Remover a tabela
    await db.execute(sql`DROP TABLE IF EXISTS franchise_clients`);
    console.log('✅ Tabela franchise_clients removida');

    console.log('⚠️  ATENÇÃO: Dados da tabela franchise_clients foram perdidos');
    console.log('ℹ️  Certifique-se de ter backup dos dados antes de fazer rollback');
  }
};