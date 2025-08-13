# Correção do Erro na Página de AI do Super Root

## Problema Identificado
A página `/client/src/pages/super-root/ai.tsx` estava exibindo um erro relacionado à rota `/api/client/custom-agents` não encontrada.

## Causa Raiz
O problema estava na página `/client/src/pages/client/ai.tsx` que estava fazendo requisições para a API de custom-agents mesmo quando o usuário estava navegando em outras páginas, incluindo a página de AI do super-root.

## Correções Implementadas

### 1. Frontend - Controle de Renderização e Queries
- **Early Return**: Adicionada verificação no início da função para não renderizar se não for a página correta ou se for super_root
- **Query Condicional**: Criada variável `shouldFetchAgents` para determinar quando executar a query
- **Tratamento de Erro 403**: Adicionado tratamento específico para erro 403 (usuário sem permissão)

```typescript
// Early return se não deveria renderizar esta página
if (location !== '/client/ai' || user?.role === 'super_root') {
  return null;
}

// Determinar se deve executar a query
const shouldFetchAgents = location === '/client/ai' && 
                         typeof window !== 'undefined' && 
                         user?.role !== 'super_root' &&
                         user?.role === 'client';

// Query com controles rigorosos
const { data: agents, isLoading: agentsLoading, error: agentsError } = useQuery({
  queryKey: ["/api/client/custom-agents"],
  queryFn: async () => {
    if (!shouldFetchAgents) {
      return [];
    }
    // ... resto da query
  },
  enabled: shouldFetchAgents,
  staleTime: 5 * 60 * 1000,
  cacheTime: 10 * 60 * 1000,
});
```

### 2. Backend - Verificação de Permissões
- **Verificação de Role**: Adicionada verificação em todas as rotas de custom-agents
- **Erro 403 Específico**: Retorna erro 403 com mensagem específica para super_root
- **Redirecionamento**: Sugere redirecionamento para a página correta

```typescript
// Verificar se o usuário tem permissão para acessar esta rota
const user = await storage.getUser(userId);
if (user?.role === 'super_root') {
  return res.status(403).json({ 
    message: "Super root users should use super-root AI settings instead",
    redirect: "/super-root/ai"
  });
}
```

### 3. Rotas Protegidas
Todas as rotas de custom-agents agora verificam permissões:
- `GET /api/client/custom-agents`
- `POST /api/client/custom-agents`
- `PUT /api/client/custom-agents/:id`
- `DELETE /api/client/custom-agents/:id`

## Resultado Esperado
- ✅ A página de AI do super-root não exibe mais erros relacionados à API de custom-agents
- ✅ A página `/client/ai` não renderiza para usuários super_root
- ✅ Queries não executam desnecessariamente
- ✅ Backend retorna erro 403 apropriado para super_root
- ✅ Melhor performance e segurança

## Arquivos Modificados
- `client/src/pages/client/ai.tsx` - Controles de renderização e query
- `server/routes.ts` - Verificações de permissão nas rotas

## Teste
Para testar se a correção funcionou:
1. Acesse a página `/super-root/ai` como super_root
2. Verifique se não há mais erros no console relacionados à API de custom-agents
3. Verifique se a página carrega corretamente sem mensagens de erro
4. Confirme que usuários não-super_root ainda podem acessar `/client/ai` normalmente