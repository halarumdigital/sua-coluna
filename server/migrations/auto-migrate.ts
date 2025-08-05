import { Migrator } from './migrator';

export async function runAutoMigrations(): Promise<void> {
  // Só executa migrations automaticamente em desenvolvimento
  if (process.env.NODE_ENV === 'production') {
    console.log('🏭 Ambiente de produção detectado - migrations automáticas desabilitadas');
    console.log('💡 Execute manualmente: npm run migration:run');
    return;
  }

  try {
    console.log('🔄 Verificando migrations pendentes...');
    const migrator = new Migrator();
    await migrator.runMigrations();
  } catch (error) {
    console.error('❌ Erro ao executar migrations automáticas:', error);
    console.log('💡 Execute manualmente: npm run migration:run');
    // Não interrompe a aplicação, apenas loga o erro
  }
}

export async function checkMigrationStatus(): Promise<void> {
  try {
    const migrator = new Migrator();
    await migrator.status();
  } catch (error) {
    console.error('❌ Erro ao verificar status das migrations:', error);
  }
}