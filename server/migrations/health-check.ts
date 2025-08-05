import { db } from '../db';
import { sql } from 'drizzle-orm';
import { Migrator } from './migrator';

export class DatabaseHealthCheck {
  private migrator: Migrator;

  constructor() {
    this.migrator = new Migrator();
  }

  // Verifica a saúde geral do banco de dados
  async checkHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: any;
    }>;
  }> {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    // 1. Verifica conexão com o banco
    try {
      await db.execute(sql`SELECT 1`);
      checks.push({
        name: 'Database Connection',
        status: 'pass' as const,
        message: 'Conexão com o banco de dados estabelecida'
      });
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        status: 'fail' as const,
        message: 'Falha na conexão com o banco de dados',
        details: error
      });
      overallStatus = 'error';
    }

    // 2. Verifica tabela de migrations
    try {
      await this.migrator.ensureMigrationsTable();
      const migrationsCount = await db.execute(sql`SELECT COUNT(*) as count FROM migrations`);
      checks.push({
        name: 'Migrations Table',
        status: 'pass' as const,
        message: `Tabela de migrations existe com ${(migrationsCount[0] as any).count} registros`
      });
    } catch (error) {
      checks.push({
        name: 'Migrations Table',
        status: 'fail' as const,
        message: 'Erro ao verificar tabela de migrations',
        details: error
      });
      overallStatus = 'error';
    }

    // 3. Verifica migrations pendentes
    try {
      const allMigrations = await this.migrator.loadMigrations();
      const executedMigrations = await this.migrator.getExecutedMigrations();
      const pendingCount = allMigrations.length - executedMigrations.length;

      if (pendingCount === 0) {
        checks.push({
          name: 'Migration Status',
          status: 'pass' as const,
          message: 'Todas as migrations estão atualizadas'
        });
      } else {
        checks.push({
          name: 'Migration Status',
          status: 'warning' as const,
          message: `${pendingCount} migration(s) pendente(s)`,
          details: { pending: pendingCount, total: allMigrations.length }
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }
    } catch (error) {
      checks.push({
        name: 'Migration Status',
        status: 'fail' as const,
        message: 'Erro ao verificar status das migrations',
        details: error
      });
      overallStatus = 'error';
    }

    // 4. Verifica integridade das tabelas principais
    const essentialTables = ['users', 'clients', 'system_settings'];
    for (const table of essentialTables) {
      try {
        const result = await db.execute(sql.raw(`SHOW TABLES LIKE '${table}'`));
        if (result.length > 0) {
          checks.push({
            name: `Table: ${table}`,
            status: 'pass' as const,
            message: `Tabela ${table} existe`
          });
        } else {
          checks.push({
            name: `Table: ${table}`,
            status: 'fail' as const,
            message: `Tabela ${table} não encontrada`
          });
          overallStatus = 'error';
        }
      } catch (error) {
        checks.push({
          name: `Table: ${table}`,
          status: 'fail' as const,
          message: `Erro ao verificar tabela ${table}`,
          details: error
        });
        overallStatus = 'error';
      }
    }

    // 5. Verifica migrations com falha
    try {
      const failedMigrations = await db.execute(sql`
        SELECT id, name, error_message, executed_at 
        FROM migrations 
        WHERE success = FALSE 
        ORDER BY executed_at DESC
      `);

      if (failedMigrations.length === 0) {
        checks.push({
          name: 'Failed Migrations',
          status: 'pass' as const,
          message: 'Nenhuma migration com falha encontrada'
        });
      } else {
        checks.push({
          name: 'Failed Migrations',
          status: 'warning' as const,
          message: `${failedMigrations.length} migration(s) com falha encontrada(s)`,
          details: failedMigrations
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }
    } catch (error) {
      checks.push({
        name: 'Failed Migrations',
        status: 'fail' as const,
        message: 'Erro ao verificar migrations com falha',
        details: error
      });
      overallStatus = 'error';
    }

    return { status: overallStatus, checks };
  }

  // Gera relatório detalhado
  async generateReport(): Promise<void> {
    console.log('🏥 Verificação de Saúde do Banco de Dados\n');
    
    const health = await this.checkHealth();
    
    // Status geral
    const statusEmoji = {
      healthy: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    console.log(`Status Geral: ${statusEmoji[health.status]} ${health.status.toUpperCase()}\n`);
    
    // Detalhes dos checks
    console.log('Verificações Detalhadas:');
    console.log('─'.repeat(50));
    
    health.checks.forEach(check => {
      const emoji = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      console.log(`${emoji} ${check.name}: ${check.message}`);
      
      if (check.details) {
        console.log(`   Detalhes: ${JSON.stringify(check.details, null, 2)}`);
      }
    });
    
    console.log('\n' + '─'.repeat(50));
    
    // Recomendações
    if (health.status === 'error') {
      console.log('\n🚨 Ação Necessária:');
      console.log('- Verifique a conexão com o banco de dados');
      console.log('- Execute: npm run migration:run');
      console.log('- Verifique os logs de erro acima');
    } else if (health.status === 'warning') {
      console.log('\n⚠️  Recomendações:');
      console.log('- Execute: npm run migration:run para aplicar migrations pendentes');
      console.log('- Verifique migrations com falha se houver');
    } else {
      console.log('\n🎉 Banco de dados está saudável!');
    }
  }

  // Verifica checksums das migrations
  async verifyMigrationIntegrity(): Promise<void> {
    console.log('🔍 Verificando integridade das migrations...\n');
    
    try {
      const allMigrations = await this.migrator.loadMigrations();
      const executedMigrations = await db.execute(sql`
        SELECT id, name, checksum FROM migrations WHERE success = TRUE
      `);
      
      const executedMap = new Map(
        executedMigrations.map((m: any) => [m.id, m])
      );
      
      let hasIssues = false;
      
      for (const migration of allMigrations) {
        const executed = executedMap.get(migration.id);
        
        if (executed) {
          if (executed.checksum !== migration.checksum) {
            console.log(`❌ ${migration.name}`);
            console.log(`   Checksum alterado! Migration já executada foi modificada.`);
            console.log(`   Esperado: ${executed.checksum}`);
            console.log(`   Atual: ${migration.checksum}`);
            hasIssues = true;
          } else {
            console.log(`✅ ${migration.name} - Integridade OK`);
          }
        } else {
          console.log(`⏳ ${migration.name} - Pendente`);
        }
      }
      
      if (hasIssues) {
        console.log('\n🚨 ATENÇÃO: Migrations executadas foram modificadas!');
        console.log('Isso pode causar inconsistências entre ambientes.');
        console.log('Considere criar novas migrations para as alterações.');
      } else {
        console.log('\n✅ Todas as migrations têm integridade preservada');
      }
      
    } catch (error) {
      console.error('❌ Erro ao verificar integridade:', error);
    }
  }
}

// CLI para health check
if (import.meta.url === `file://${process.argv[1]}`) {
  const healthCheck = new DatabaseHealthCheck();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'report':
      await healthCheck.generateReport();
      break;
    case 'integrity':
      await healthCheck.verifyMigrationIntegrity();
      break;
    default:
      console.log(`
🏥 Database Health Check

Comandos:
  report     - Gera relatório completo de saúde
  integrity  - Verifica integridade das migrations

Exemplos:
  tsx server/migrations/health-check.ts report
  tsx server/migrations/health-check.ts integrity
      `);
  }
}