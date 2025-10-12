# 🚀 Passo a Passo: Corrigir Erro 400 do Google Calendar

## ❌ Erro Atual
```
400. Isto é um erro.
A solicitação é inválida e não pôde ser processada pelo servidor.
```

## ✅ Solução (5 minutos)

### Passo 1: Acesse o Google Cloud Console
Abra no navegador:
```
https://console.cloud.google.com/apis/credentials
```

### Passo 2: Localize suas Credenciais OAuth 2.0

Na página, você verá uma lista de credenciais. Procure por:
- **Tipo:** ID do cliente OAuth 2.0
- **Nome:** (o nome que você deu quando criou)
- **ID do cliente:** `127886496179-nqn9qvm...` (começa assim)

👉 **Clique no nome** dessa credencial para abrir as configurações

### Passo 3: Encontre a Seção "URIs de redirecionamento autorizados"

Na página de configuração, role para baixo até encontrar:
```
URIs de redirecionamento autorizados
```

### Passo 4: Adicione a URL de Callback

Clique em **"+ ADICIONAR URI"** e cole EXATAMENTE esta URL:
```
https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback
```

⚠️ **ATENÇÃO:**
- NÃO adicione espaços no início ou fim
- NÃO adicione "/" no final
- Certifique-se que está em HTTPS (não HTTP)

### Passo 5: Salvar

1. Clique no botão **"SALVAR"** na parte inferior da página
2. Aguarde a mensagem de confirmação (pode levar 5-10 segundos)
3. ✅ Pronto! A URL está autorizada

### Passo 6: Testar Novamente

1. Volte para: https://suacoluna.gilliard.dev.br/franchise/calendar
2. Clique em **"Conectar com Google"**
3. Uma janela popup do Google vai abrir
4. Escolha sua conta Google
5. Clique em **"Permitir"** para autorizar o acesso ao calendário
6. A janela vai fechar automaticamente
7. ✅ Você verá "Conectado" na interface!

## 🔍 Como Verificar se Funcionou

Depois de autorizar, você deve ver na página:

**Status da Integração:**
- ✅ Integração: **Ativada**
- ✅ Status: **Conectado**
- ✅ Última Sincronização: (data/hora atual)

E um card verde com:
```
✓ Google Calendar Conectado com Sucesso!
```

## ❓ Ainda não funcionou?

Se o erro 400 persistir após adicionar a URL:

1. **Verifique se salvou:** Confirme que clicou em "SALVAR" no Google Cloud Console
2. **Aguarde 30 segundos:** As alterações podem levar alguns segundos para propagar
3. **Limpe o cache:** Tente em uma aba anônima do navegador
4. **Verifique a API:** No Google Cloud Console, vá em "APIs e serviços" > "Biblioteca" e confirme que a **"Google Calendar API"** está HABILITADA

## 📸 Screenshots de Referência

### Como deve ficar no Google Cloud Console:

```
URIs de redirecionamento autorizados
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
URI 1  https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback  [🗑️]
       [+ ADICIONAR URI]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Logs do servidor (para referência):
```
🔐 OAuth callback URL: https://suacoluna.gilliard.dev.br/api/franchise/calendar-oauth-callback
🔗 Auth URL gerada (primeiros 150 chars): https://accounts.google.com/o/oauth2/v2/auth?...
```

✅ Se esses logs aparecem, significa que o servidor está configurado corretamente!

## 🆘 Ainda precisa de ajuda?

Se após seguir todos os passos o erro persistir, tire screenshots de:
1. A página de erro 400 do Google
2. A seção "URIs de redirecionamento autorizados" no Google Cloud Console
3. Os logs do servidor

E envie para análise técnica.
