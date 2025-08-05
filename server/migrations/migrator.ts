import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { mysqlTable, varchar, timestamp, text, boolean } from 'drizzle-orm/mysql-core';

// Tabela para controlar as migrations executadas
export const migrations = mysqlTable("migrations", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  executed_at: timestamp("executed_at").default(sql`CURRENT_TIMESTAMP`),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  success: boolean("success").notNull().default(true),
  error_message: text("error_message"),
});

export interface Migration {
  id: string;
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
  checksum: string;
}

export class Migrator {
  private migrationsPath: string;

  constructor(migrationsPath: string = join(process.cwd(), 'server/migrations/files')) {
    this.migrationsPath = migrationsPath;
  }

  // Cria a tabela de migrations se não existir
  async ensureMigrationsTable(): Promise<void> {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS migrations (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          checksum VARCHAR(64) NOT NULL,
          success BOOLEAN NOT NULL DEFAULT TRUE,
          error_message TEXT
        )
      `);
      console.log('✅ Tabela de migrations criada/verificada');
    } catch (error) {
      console.error('❌ Erro ao criar tabela de migrations:', error);
      throw error;
    }
  }

  // Carrega todas as migrations dos arquivos
  async loadMigrations(): Promise<Migration[]> {
    try {
      const files = await readdir(this.migrationsPath);
      const migrationFiles = files
        .filter(file => file.endsWith('.ts') || file.endsWith('.js'))
        .sort(); // Ordena alfabeticamente para garantir ordem de execução

      const migrations: Migration[] = [];

      for (const file of migrationFiles) {
        const filePath = join(this.migrationsPath, file);
        // Convert Windows path to file:// URL for ESM import
        const fileUrl = process.platform === 'win32' 
          ? `file:///${filePath.replace(/\\/g, '/')}`
          : filePath;
        const migration = await import(fileUrl);
        
        if (!migration.default || !migration.default.id || !migration.default.up) {
          console.warn(`⚠️  Migration ${file} não possui estrutura válida`);
          continue;
        }

        // Calcula checksum do arquivo para detectar mudanças
        const content = await readFile(filePath, 'utf-8');
        const checksum = await this.calculateChecksum(content);

        migrations.push({
          ...migration.default,
          checksum
        });
      }

      return migrations;
    } catch (error) {
      console.error('❌ Erro ao carregar migrations:', error);
      throw error;
    }
  }

  // Calcula checksum SHA-256 de uma string
  private async calculateChecksum(content: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // Obtém migrations já executadas
  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await db.execute(sql`SELECT id FROM migrations WHERE success = TRUE ORDER BY executed_at`);
      return result.map((row: any) => row.id);
    } catch (error) {
      // Se a tabela não existir, retorna array vazio
      if (error.code === 'ER_NO_SUCH_TABLE') {
        return [];
      }
      console.error('❌ Erro ao buscar migrations executadas:', error);
      throw error;
    }
  }

  // Executa migrations pendentes
  async runMigrations(): Promise<void> {
    console.log('🚀 Iniciando execução de migrations...');
    
    await this.ensureMigrationsTable();
    
    const allMigrations = await this.loadMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ Nenhuma migration pendente');
      return;
    }

    console.log(`📋 ${pendingMigrations.length} migration(s) pendente(s):`);
    pendingMigrations.forEach(m => console.log(`   - ${m.name}`));

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    console.log('🎉 Todas as migrations foram executadas com sucesso!');
  }

  // Executa uma migration específica
  private async executeMigration(migration: Migration): Promise<void> {
    console.log(`⏳ Executando migration: ${migration.name}`);
    
    try {
      // Verifica se a migration já foi executada com sucesso
      const existing = await db.execute(sql`
        SELECT id FROM migrations WHERE id = ${migration.id} AND success = TRUE
      `);
      
      if (existing.length > 0) {
        console.log(`⚠️  Migration ${migration.name} já foi executada, pulando...`);
        return;
      }
      
      // Executa a migration
      await migration.up();
      
      // Registra como executada com sucesso usando INSERT IGNORE para evitar duplicatas
      await db.execute(sql`
        INSERT IGNORE INTO migrations (id, name, checksum, success) 
        VALUES (${migration.id}, ${migration.name}, ${migration.checksum}, TRUE)
      `);
      
      console.log(`✅ Migration ${migration.name} executada com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao executar migration ${migration.name}:`, error);
      
      try {
        // Registra o erro usando INSERT IGNORE para evitar duplicatas
        await db.execute(sql`
          INSERT IGNORE INTO migrations (id, name, checksum, success, error_message) 
          VALUES (${migration.id}, ${migration.name}, ${migration.checksum}, FALSE, ${String(error)})
        `);
      } catch (insertError) {
        console.error(`❌ Erro ao registrar falha da migration:`, insertError);
      }
      
      throw error;
    }
  }

  // Reverte a última migration
  async rollback(): Promise<void> {
    console.log('🔄 Iniciando rollback...');
    
    const executedMigrations = await db.execute(sql`
      SELECT id, name FROM migrations 
      WHERE success = TRUE 
      ORDER BY executed_at DESC 
      LIMIT 1
    `);

    if (executedMigrations.length === 0) {
      console.log('ℹ️  Nenhuma migration para reverter');
      return;
    }

    const lastMigration = executedMigrations[0] as any;
    const allMigrations = await this.loadMigrations();
    const migrationToRollback = allMigrations.find(m => m.id === lastMigration.id);

    if (!migrationToRollback) {
      console.error(`❌ Migration ${lastMigration.name} não encontrada nos arquivos`);
      return;
    }

    if (!migrationToRollback.down) {
      console.error(`❌ Migration ${lastMigration.name} não possui função down()`);
      return;
    }

    try {
      console.log(`⏳ Revertendo migration: ${migrationToRollback.name}`);
      
      await migrationToRollback.down();
      
      // Remove da tabela de migrations
      await db.execute(sql`DELETE FROM migrations WHERE id = ${lastMigration.id}`);
      
      console.log(`✅ Migration ${migrationToRollback.name} revertida com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao reverter migration ${migrationToRollback.name}:`, error);
      throw error;
    }
  }

  // Lista status das migrations
  async status(): Promise<void> {
    console.log('📊 Status das migrations:\n');
    
    await this.ensureMigrationsTable();
    
    const allMigrations = await this.loadMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    if (allMigrations.length === 0) {
      console.log('ℹ️  Nenhuma migration encontrada');
      return;
    }

    allMigrations.forEach(migration => {
      const status = executedMigrations.includes(migration.id) ? '✅ Executada' : '⏳ Pendente';
      console.log(`${status} - ${migration.name}`);
    });

    console.log(`\n📈 Total: ${allMigrations.length} migrations`);
    console.log(`✅ Executadas: ${executedMigrations.length}`);
    console.log(`⏳ Pendentes: ${allMigrations.length - executedMigrations.length}`);
  }

  // Cria uma nova migration
  async createMigration(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const fileName = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.ts`;
    const filePath = join(this.migrationsPath, fileName);

    const template = `import { sql } from 'drizzle-orm';
import { db } from '../../db';

export default {
  id: '${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}',
  name: '${name}',
  
  async up() {
    // Escreva aqui o código para aplicar a migration
    console.log('Executando migration: ${name}');
    
    // Exemplo:
    // await db.execute(sql\`
    //   CREATE TABLE example (
    //     id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    //     name VARCHAR(255) NOT NULL,
    //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    //   )
    // \`);
  },
  
  async down() {
    // Escreva aqui o código para reverter a migration
    console.log('Revertendo migration: ${name}');
    
    // Exemplo:
    // await db.execute(sql\`DROP TABLE IF EXISTS example\`);
  }
};
`;

    await import('fs/promises').then(fs => fs.writeFile(filePath, template));
    console.log(`✅ Migration criada: ${fileName}`);
    console.log(`📁 Localização: ${filePath}`);
  }
}