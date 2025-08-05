# Resposta Automática do WhatsApp com AI

Esta funcionalidade permite que o sistema responda automaticamente às mensagens recebidas no WhatsApp usando inteligência artificial configurada no sistema.

## Como Funciona

### 1. Fluxo de Processamento

Quando uma mensagem é enviada para o WhatsApp conectado no sistema:

1. **Recebimento da Mensagem**: O webhook do WhatsApp recebe a mensagem via Evolution API
2. **Extração de Dados**: O sistema extrai o número do telefone e o texto da mensagem
3. **Verificação de Configurações**: Verifica se as configurações de AI estão ativas
4. **Geração da Resposta**: Usa o AI configurado para gerar uma resposta apropriada
5. **Envio da Resposta**: Envia a resposta automaticamente via WhatsApp
6. **Registro de Uso**: Registra o uso da AI no banco de dados

### 2. Arquivos Principais

- `server/whatsapp.ts`: Serviço para envio de mensagens via Evolution API
- `server/whatsapp-ai-handler.ts`: Processador de mensagens recebidas com AI
- `server/routes.ts`: Webhook do WhatsApp (atualizado para incluir resposta automática)

### 3. Configurações Necessárias

#### Configurações de AI
- API Key do ChatGPT configurada
- Modelo de AI (padrão: gpt-3.5-turbo)
- Temperatura (padrão: 0.7)
- Máximo de tokens (padrão: 1000)
- System Prompt configurado

#### Configurações do WhatsApp
- Evolution API URL configurada
- Global Token configurado
- Instâncias do WhatsApp ativas e conectadas

### 4. Como Testar

#### Teste de Configurações
```bash
node test-whatsapp-ai-auto-reply.cjs
```

Este script verifica:
- Configurações de AI
- Configurações do WhatsApp
- Instâncias ativas
- Clientes configurados
- Status geral do sistema

#### Teste de Envio de Mensagem
```bash
node test-send-whatsapp-message.cjs
```

Este script testa:
- Conexão com Evolution API
- Envio de mensagem de teste
- Status das instâncias

### 5. Estrutura de Dados

#### Mensagem Recebida (Webhook)
```json
{
  "event": "messages.upsert",
  "instance": "instance-key",
  "data": {
    "message": {
      "key": {
        "remoteJid": "5511999999999@s.whatsapp.net"
      },
      "message": {
        "conversation": "Texto da mensagem"
      }
    }
  }
}
```

#### Resposta Gerada
```json
{
  "success": true,
  "messageId": "message-id",
  "response": "Resposta gerada pelo AI"
}
```

### 6. Logs do Sistema

O sistema gera logs detalhados para acompanhar o processamento:

```
🤖 Processando mensagem recebida para resposta automática...
📱 Mensagem de 5511999999999: Olá, preciso de ajuda com um produto.
🧠 Gerando resposta com AI...
🤖 Resposta gerada: Olá! Como posso ajudá-lo com nossos produtos?
📤 Enviando mensagem para 5511999999999 via instância instance-key
✅ Resposta enviada com sucesso para 5511999999999
```

### 7. Configuração do Webhook

Para que a resposta automática funcione, o webhook deve estar configurado corretamente:

1. **URL do Webhook**: `https://seu-dominio.com/api/client/whatsapp-webhook`
2. **Eventos**: `messages.upsert`
3. **Headers**: Authorization com Bearer token

### 8. Personalização

#### System Prompt
O system prompt pode ser personalizado nas configurações de AI para definir o comportamento do assistente:

```
Você é um assistente virtual especializado em atendimento ao cliente. 
Responda de forma cordial e profissional, sempre buscando ajudar o cliente.
```

#### Contexto da Mensagem
O sistema adiciona contexto à mensagem antes de enviar para o AI:

```
Você está respondendo uma mensagem do WhatsApp de 5511999999999. 

Mensagem recebida: "Olá, preciso de ajuda com um produto."

Responda de forma natural e útil, como um assistente virtual. 
Mantenha a resposta concisa e relevante.
```

### 9. Monitoramento

#### Uso da AI
Todas as respostas automáticas são registradas na tabela `ai_usage` com:
- Usuário que gerou a resposta
- Modelo usado
- Tokens consumidos
- Custo estimado
- Dados da requisição e resposta

#### Logs de Erro
Erros são registrados com detalhes para facilitar o debug:
- Falha na configuração
- Erro na API do AI
- Falha no envio da mensagem
- Problemas de conectividade

### 10. Segurança

- Todas as mensagens são processadas de forma segura
- Dados sensíveis são mascarados nos logs
- Uso da AI é limitado pelas configurações do sistema
- Webhook requer autenticação adequada

### 11. Próximos Passos

Funcionalidades que podem ser adicionadas:
- Configuração de auto-reply por instância
- Templates de resposta personalizados
- Filtros por tipo de mensagem
- Integração com histórico de conversas
- Respostas baseadas em contexto da conversa 