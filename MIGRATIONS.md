# 🗃️ Sistema de Migrations - Guia Rápido

Sistema completo de migrations implementado para manter o banco de dados sempre atualizado e versionado.

## 🚀 Como Usar

### 1. Verificar Status Atual
```bash
npm run migration:status
```

### 2. Executar Migrations Pendentes
```bash
npm run migration:run
```

### 3. Criar Nova Migration
```bash
npm run migration:create "Adicionar tabela de produtos"
```

### 4. Verificar Saúde do Banco
```bash
npm run db:health
```

### 5. Verificar Integridade das Migrations
```bash
npm run db:integrity
```

## 📋 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run migration:run` | Executa todas as migrations pendentes |
| `npm run migration:status` | Mostra status de todas as migrations |
| `npm run migration:rollback` | Reverte a última migration |
| `npm run migration:create "Nome"` | Cria nova migration |
| `npm run db:health` | Relatório de saúde do banco |
| `npm run db:integrity` | Verifica integridade das migrations |

## 🔄 Execução Automática

- **Desenvolvimento**: Migrations executam automaticamente ao iniciar o servidor
- **Produção**: Deve ser executado manualmente por segurança

## 📁 Estrutura Criada

```
server/migrations/
├── README.md              # Documentação completa
├── migrator.ts            # Sistema principal
├── cli.ts                 # Interface de linha de comando
├── auto-migrate.ts        # Execução automática
├── health-check.ts        # Verificação de saúde
└── files/                 # Arquivos de migration
    ├── 20250204120000_initial_schema.ts
    ├── 20250204120001_add_user_preferences.ts
    └── [suas migrations aqui]
```

## ✨ Funcionalidades

### ✅ Controle de Versão
- Cada migration é executada apenas uma vez
- Registro completo de execuções na tabela `migrations`
- Detecção de alterações via checksum

### ✅ Segurança
- Rollbacks controlados
- Validação de integridade
- Logs detalhados de erros

### ✅ Facilidade de Uso
- Templates automáticos para novas migrations
- Execução automática em desenvolvimento
- Interface CLI intuitiva

### ✅ Monitoramento
- Health checks do banco de dados
- Verificação de integridade
- Relatórios detalhados

## 🎯 Próximos Passos

1. **Teste o sistema**:
   ```bash
   npm run migration:status
   npm run db:health
   ```

2. **Crie sua primeira migration**:
   ```bash
   npm run migration:create "Minha primeira migration"
   ```

3. **Execute as migrations**:
   ```bash
   npm run migration:run
   ```

## 📚 Documentação Completa

Para documentação detalhada, consulte: `server/migrations/README.md`

---

**Sistema implementado com sucesso! 🎉**

O banco de dados agora está preparado para evoluir de forma controlada e segura.