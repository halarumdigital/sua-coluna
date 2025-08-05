# Sistema de Migrations

Este sistema de migrations permite manter o banco de dados atualizado de forma controlada e versionada.

## 🚀 Comandos Disponíveis

### Executar Migrations
```bash
npm run migration:run
```
Executa todas as migrations pendentes em ordem cronológica.

### Verificar Status
```bash
npm run migration:status
```
Mostra quais migrations foram executadas e quais estão pendentes.

### Reverter Migration
```bash
npm run migration:rollback
```
Reverte a última migration executada (se ela tiver uma função `down()`).

### Criar Nova Migration
```bash
npm run migration:create "Nome da Migration"
```
Cria um novo arquivo de migration com template básico.

## 📁 Estrutura de Arquivos

```
server/migrations/
├── README.md              # Esta documentação
├── migrator.ts            # Classe principal do sistema
├── cli.ts                 # Interface de linha de comando
├── auto-migrate.ts        # Execução automática em desenvolvimento
└── files/                 # Arquivos de migration
    ├── 20250204120000_initial_schema.ts
    ├── 20250204120001_add_user_preferences.ts
    └── ...
```

## 📝 Estrutura de uma Migration

Cada migration deve seguir este padrão:

```typescript
import { sql } from 'drizzle-orm';
import { db } from '../../db.js';

export default {
  id: '20250204120000_nome_da_migration',
  name: 'Nome Descritivo da Migration',
  
  async up() {
    // Código para aplicar a migration
    await db.execute(sql`
      CREATE TABLE exemplo (
        id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
        nome VARCHAR(255) NOT NULL
      )
    `);
  },
  
  async down() {
    // Código para reverter a migration
    await db.execute(sql`DROP TABLE IF EXISTS exemplo`);
  }
};
```

## 🔧 Funcionamento

### Tabela de Controle
O sistema cria automaticamente uma tabela `migrations` para controlar:
- Quais migrations foram executadas
- Quando foram executadas
- Se foram executadas com sucesso
- Checksum dos arquivos (para detectar alterações)

### Execução Automática
Em ambiente de desenvolvimento, as migrations são executadas automaticamente na inicialização do servidor.

Em produção, devem ser executadas manualmente por segurança.

### Ordem de Execução
As migrations são executadas em ordem alfabética dos nomes dos arquivos. Por isso usamos o padrão:
`YYYYMMDDHHMMSS_nome_da_migration.ts`

### Segurança
- Cada migration só é executada uma vez
- Se uma migration falhar, o processo para e registra o erro
- Checksums detectam alterações em migrations já executadas
- Rollbacks são opcionais e devem ser implementados cuidadosamente

## 📋 Boas Práticas

### Nomenclatura
- Use nomes descritivos: `add_user_preferences_table`
- Seja específico: `add_email_index_to_users` em vez de `add_index`
- Use inglês para consistência

### Estrutura
- Sempre implemente `up()` e `down()`
- Teste as migrations em ambiente de desenvolvimento
- Use transações quando necessário
- Documente mudanças complexas

### Dados
- Cuidado ao alterar dados existentes
- Faça backup antes de migrations destrutivas
- Considere migrations de dados separadas das de schema

### Exemplo de Migration Complexa
```typescript
export default {
  id: '20250204120002_migrate_user_data',
  name: 'Migrate User Data to New Format',
  
  async up() {
    // 1. Adiciona nova coluna
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN full_name VARCHAR(255)
    `);
    
    // 2. Migra dados existentes
    await db.execute(sql`
      UPDATE users 
      SET full_name = CONCAT(first_name, ' ', last_name)
      WHERE first_name IS NOT NULL AND last_name IS NOT NULL
    `);
    
    // 3. Adiciona constraint
    await db.execute(sql`
      ALTER TABLE users 
      MODIFY COLUMN full_name VARCHAR(255) NOT NULL
    `);
  },
  
  async down() {
    await db.execute(sql`
      ALTER TABLE users DROP COLUMN full_name
    `);
  }
};
```

## 🚨 Troubleshooting

### Migration Falhou
1. Verifique os logs de erro
2. Corrija o problema na migration
3. Execute `npm run migration:rollback` se necessário
4. Execute `npm run migration:run` novamente

### Migration Já Executada Mas Precisa de Alteração
1. **NUNCA** altere uma migration já executada em produção
2. Crie uma nova migration com as correções
3. Use rollback apenas em desenvolvimento

### Banco Fora de Sincronia
1. Execute `npm run migration:status` para verificar
2. Execute `npm run migration:run` para sincronizar
3. Se necessário, execute migrations manualmente

## 🔄 Fluxo de Desenvolvimento

1. **Desenvolvimento Local**
   ```bash
   npm run migration:create "Add new feature table"
   # Edite o arquivo criado
   npm run migration:run
   ```

2. **Teste**
   ```bash
   npm run migration:status  # Verifica se tudo está ok
   npm run migration:rollback  # Testa o rollback
   npm run migration:run  # Executa novamente
   ```

3. **Deploy**
   ```bash
   # Em produção
   npm run migration:status  # Verifica pendências
   npm run migration:run     # Executa migrations
   ```

## 📊 Monitoramento

O sistema registra todas as execuções na tabela `migrations`:
- `id`: ID único da migration
- `name`: Nome descritivo
- `executed_at`: Timestamp da execução
- `checksum`: Hash do arquivo para detectar alterações
- `success`: Se foi executada com sucesso
- `error_message`: Mensagem de erro se falhou

Consulte esta tabela para auditoria e troubleshooting:
```sql
SELECT * FROM migrations ORDER BY executed_at DESC;
```