# Correção: Agentes Criados Não Aparecem na Lista

## Problema Identificado
Os agentes personalizados eram criados com sucesso no banco de dados, mas não apareciam na lista da interface.

## Causa Raiz
1. **Tabela Ausente**: A tabela `custom_ai_agents` não existia no banco de dados
2. **Condições Restritivas**: As condições para executar a query eram muito restritivas
3. **Roles Não Incluídos**: A query não considerava usuários com role `franchise`

## Correções Implementadas

### 1. Criação da Tabela no Banco de Dados
```sql
CREATE TABLE custom_ai_agents (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  temperature DECIMAL(3,2) NOT NULL DEFAULT 0.7,
  max_tokens INT NOT NULL DEFAULT 1000,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  user_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_custom_ai_agents_user (user_id),
  INDEX idx_custom_ai_agents_active (is_active)
);
```

### 2. Correção das Condições de Query (Frontend)
```typescript
// Antes - muito restritivo
const shouldFetchAgents = location === '/client/ai' && 
                         typeof window !== 'undefined' && 
                         user?.role !== 'super_root' &&
                         user?.role === 'client';

// Depois - incluindo franchise
const shouldFetchAgents = location === '/client/ai' && 
                         typeof window !== 'undefined' && 
                         user?.role !== 'super_root' &&
                         (user?.role === 'client' || user?.role === 'franchise');
```

### 3. Correção do Early Return
```typescript
// Antes
if (location !== '/client/ai' || user?.role === 'super_root') {
  return null;
}

// Depois - mais específico
if (location !== '/client/ai' || 
    user?.role === 'super_root' || 
    (!user?.role || (user?.role !== 'client' && user?.role !== 'franchise'))) {
  return null;
}
```

### 4. Adição de Logs de Debug
- Logs para verificar condições de execução
- Logs para acompanhar requisições HTTP
- Logs para verificar dados recebidos
- Logs para debug da renderização

## Verificações Realizadas

### ✅ Banco de Dados
- Tabela `custom_ai_agents` criada com sucesso
- Estrutura correta com todos os campos necessários
- Índices criados para performance
- Agente de teste inserido e verificado

### ✅ Backend (server/routes.ts)
- Rota GET `/api/client/custom-agents` implementada
- Verificação de permissões para super_root
- Tratamento de erros adequado
- Schema de validação correto

### ✅ Frontend (client/src/pages/client/ai.tsx)
- Condições de query corrigidas
- Early return ajustado
- Logs de debug adicionados
- Tratamento de diferentes roles

## Resultado Esperado
- ✅ Agentes criados devem aparecer na lista
- ✅ Query executa apenas para usuários autorizados
- ✅ Usuários `franchise` podem ver seus agentes
- ✅ Super root não acessa funcionalidades de cliente
- ✅ Logs ajudam no debug de problemas

## Teste
1. Acesse como usuário `franchise` ou `client`
2. Vá para `/client/ai`
3. Crie um novo agente
4. Verifique se aparece na lista
5. Verifique os logs no console do navegador

## Arquivos Modificados
- `client/src/pages/client/ai.tsx` - Correções de lógica e debug
- `server/routes.ts` - Verificações de permissão
- Banco de dados - Criação da tabela `custom_ai_agents`