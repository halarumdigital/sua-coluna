# Remoção da Tabela Clients

## Mudanças Realizadas

### 1. server/storage.ts
- Comentados métodos relacionados a clients: getClients, getClient, createClient, updateClient, deleteClient, getClientStats
- Removida referência a clients.userId (coluna inexistente)
- Removido totalClients do getAdminStats

### 2. server/routes.ts
- Removidos imports relacionados a clients: insertClientSchema, createClientSchema, editClientSchema

### 3. shared/schema.ts
- Comentada definição da tabela clients
- Comentados tipos: Client, InsertClient, CreateClient, EditClient
- Comentados schemas: insertClientSchema, createClientSchema, editClientSchema
- Comentadas relações que referenciam clients

## Próximos Passos

1. Execute o build: `npm run build`
2. Reinicie o servidor
3. Verifique se os erros foram resolvidos
4. Se necessário, remova completamente a tabela clients do banco de dados

## Nota

A tabela clients foi removida do sistema. Se você precisar de funcionalidade similar, considere usar a tabela franchises ou criar uma nova estrutura de dados.
