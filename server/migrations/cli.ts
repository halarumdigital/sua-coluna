#!/usr/bin/env node

import { Migrator } from './migrator.js';
import { join } from 'path';

const migrator = new Migrator();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'run':
      case 'migrate':
        await migrator.runMigrations();
        break;

      case 'rollback':
        await migrator.rollback();
        break;

      case 'status':
        await migrator.status();
        break;

      case 'create':
        const migrationName = args.slice(1).join(' ');
        if (!migrationName) {
          console.error('❌ Nome da migration é obrigatório');
          console.log('Uso: npm run migration:create "Nome da Migration"');
          process.exit(1);
        }
        await migrator.createMigration(migrationName);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        console.error(`❌ Comando desconhecido: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro ao executar comando:', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🗃️  Sistema de Migrations

Comandos disponíveis:

  run, migrate     Executa todas as migrations pendentes
  rollback         Reverte a última migration executada
  status           Mostra o status de todas as migrations
  create <nome>    Cria uma nova migration
  help             Mostra esta ajuda

Exemplos:

  npm run migration:run
  npm run migration:status
  npm run migration:rollback
  npm run migration:create "Adicionar tabela de produtos"

📁 Migrations são armazenadas em: server/migrations/files/
`);
}

// Executa apenas se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}