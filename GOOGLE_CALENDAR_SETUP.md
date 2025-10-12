# Configuração do Google Calendar - Instruções

## Problema Atual
O erro **"400. Isto é um erro. A solicitação é inválida"** acontece quando a URL de callback do OAuth não está autorizada no Google Cloud Console.

## Solução

### 1. Acesse o Google Cloud Console
Vá para: https://console.cloud.google.com/apis/credentials

### 2. Localize suas Credenciais OAuth 2.0
- Na lista de credenciais, localize o **Client ID OAuth 2.0** que você está usando
- O Client ID começa com: `127886496179-nqn9qv...`

### 3. Adicione a URL de Redirecionamento
Clique no Client ID e adicione estas URLs em **"URIs de redirecionamento autorizados"**:

```
https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback
```

Se você também testa localmente, adicione:
```
http://localhost:5000/api/franchise/calendar-oauth-callback
```

### 4. Salve as Alterações
- Clique em **"SALVAR"** no Google Cloud Console
- Aguarde alguns segundos para as alterações propagarem

### 5. Teste Novamente
- Volte para: https://suacoluna.gilliard.dev.br/franchise/calendar
- Clique em **"Conectar com Google"**
- Autorize o acesso
- Deve funcionar agora!

## URLs de Callback Configuradas

No arquivo `.env`, a URL de callback está definida como:
```
GOOGLE_OAUTH_REDIRECT_URL=https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback
```

## Verificando os Logs

Quando você clicar em "Conectar com Google", o servidor vai exibir nos logs:
- `🔐 OAuth callback URL: ...` - A URL que está sendo usada
- `🔗 Auth URL gerada: ...` - A URL de autorização do Google

Se o erro 400 persistir, verifique se a URL nos logs bate EXATAMENTE com a URL cadastrada no Google Cloud Console.

## Outras Causas Possíveis do Erro 400

1. **Client ID/Secret incorretos** - Verifique se as credenciais estão corretas
2. **API não habilitada** - Certifique-se que a Google Calendar API está habilitada no projeto
3. **Projeto suspenso** - Verifique o status do projeto no Google Cloud Console
4. **Cache do navegador** - Tente em uma aba anônima

## Contato
Se o problema persistir, entre em contato com o suporte técnico com as seguintes informações:
- Screenshot do erro
- Logs do servidor (linhas com 🔐 e 🔗)
- Screenshot das URLs de redirecionamento no Google Cloud Console
