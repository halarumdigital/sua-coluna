# Funcionalidade: Consulta de Horários Disponíveis

## Descrição

Sistema automático que detecta quando um usuário pergunta sobre horários disponíveis via WhatsApp e responde com 5 opções de horários livres consultados diretamente do Google Calendar.

## Como Funciona

### 1. Detecção Automática

Quando um usuário envia uma mensagem via WhatsApp perguntando sobre disponibilidade, o sistema detecta automaticamente através de palavras-chave:

**Exemplos de mensagens que acionam a funcionalidade:**
- "Quais horários disponíveis?"
- "Tem vaga hoje?"
- "Me mostra os horários livres"
- "Quando você pode me atender?"
- "Qual a disponibilidade da agenda?"
- "Tem algum horário essa semana?"

### 2. Busca no Google Calendar

O sistema:
1. Conecta ao Google Calendar da franquia
2. Busca eventos nos próximos 14 dias
3. Identifica horários livres no horário comercial (9h às 18h)
4. Ignora finais de semana
5. Retorna as 5 primeiras opções disponíveis

### 3. Resposta Automática

O bot envia automaticamente uma mensagem formatada:

```
📅 *Horários Disponíveis*

Aqui estão 5 opções de horários disponíveis para você:

1. segunda-feira, 14/10 às 10:00
2. segunda-feira, 14/10 às 11:00
3. terça-feira, 15/10 às 09:00
4. terça-feira, 15/10 às 14:00
5. quarta-feira, 16/10 às 15:00

💬 Para agendar, me informe qual opção você prefere ou sugira outro horário!
```

## Arquivos Modificados

### 1. `server/google-calendar-service.ts` (linhas 317-467)

Adicionado método `getAvailableTimeSlots`:

```typescript
async getAvailableTimeSlots(
  franchiseId: string,
  preferredDurationMinutes: number = 60
): Promise<{
  success: boolean;
  slots?: Array<{
    date: string;
    dateFormatted: string;
    time: string;
    datetime: Date;
    dayOfWeek: string;
  }>;
  error?: string;
}>
```

**Funcionalidades:**
- Busca eventos do Google Calendar nos próximos 14 dias
- Verifica conflitos de horários
- Filtra dias úteis (segunda a sexta)
- Retorna horários das 9h às 18h
- Gera slots de 1 hora (configurável)

### 2. `server/whatsapp-ai-handler.ts` (linhas 482-553 e 1095-1145)

**Método de Detecção (`detectAvailabilityRequest`):**
- Detecta 30+ variações de perguntas sobre disponibilidade
- Suporta português com e sem acentuação
- Case-insensitive

**Integração no Fluxo Principal:**
- Intercepta mensagens antes da IA
- Busca horários disponíveis no Google Calendar
- Formata e envia resposta automática
- Salva interação no contexto da conversa
- Registra uso da funcionalidade

## Palavras-Chave Detectadas

O sistema detecta as seguintes expressões (e variações):

```typescript
- 'horários disponíveis' / 'horarios disponiveis'
- 'que horas'
- 'quais horários' / 'quais horarios'
- 'tem vaga'
- 'tem horário' / 'tem horario'
- 'disponibilidade'
- 'agenda disponível' / 'agenda disponivel'
- 'horário livre' / 'horario livre'
- 'vagas disponíveis' / 'vagas disponiveis'
- 'quando pode'
- 'quando tem'
- 'tem algum horário' / 'tem algum horario'
- 'opções de horário' / 'opcoes de horario'
- 'mostrar horários' / 'mostrar horarios'
- 'ver horários' / 'ver horarios'
- 'consultar horários' / 'consultar horarios'
- 'checar disponibilidade'
- 'verificar disponibilidade'
```

## Configurações

### Horário Comercial
- **Início:** 9h
- **Fim:** 18h
- **Dias úteis:** Segunda a Sexta
- **Modificável em:** `google-calendar-service.ts` linhas 362-364

### Duração dos Slots
- **Padrão:** 60 minutos
- **Modificável em:** Parâmetro `preferredDurationMinutes` do método

### Período de Busca
- **Padrão:** 14 dias
- **Modificável em:** `google-calendar-service.ts` linha 368

## Requisitos

Para que a funcionalidade funcione corretamente:

1. ✅ Google Calendar configurado e conectado
2. ✅ Instância do WhatsApp ativa
3. ✅ Agente de IA vinculado à instância
4. ✅ Refresh token válido do Google

## Fluxo Técnico

```
Usuário envia: "Quais horários disponíveis?"
       ↓
WhatsAppAIHandler.handleIncomingMessage()
       ↓
detectAvailabilityRequest() retorna TRUE
       ↓
GoogleCalendarService.getAvailableTimeSlots()
       ↓
Google Calendar API: calendar.events.list()
       ↓
Processa eventos e gera slots disponíveis
       ↓
Formata mensagem com 5 opções
       ↓
whatsappService.sendMessage()
       ↓
Salva no contexto da conversa
       ↓
✅ Usuário recebe horários disponíveis
```

## Vantagens

1. **Automatização Total:** Não requer intervenção manual
2. **Sincronização em Tempo Real:** Consulta direto do Google Calendar
3. **Inteligente:** Detecta variações de perguntas
4. **Contextual:** Salva na conversa para referência futura
5. **Configurável:** Horários e duração ajustáveis

## Logs

O sistema gera logs detalhados para depuração:

```
🔍 Detectada solicitação de horários: "Quais horários disponíveis?"
📅 Usuário solicitou horários disponíveis, buscando no Google Calendar...
📅 Buscando horários disponíveis...
🔍 Buscando eventos entre: { start: '...', end: '...' }
📋 Eventos encontrados: 12
✅ Horários disponíveis encontrados: 5
✅ Mensagem de disponibilidade gerada: ...
✅ Horários disponíveis enviados com sucesso
```

## Tratamento de Erros

Se o Google Calendar não estiver configurado ou houver erro:
- Sistema loga o erro
- Continua o fluxo normal (IA responde)
- Não interrompe o atendimento

## Registro de Uso

Cada consulta é registrada na tabela `ai_usage`:
- `requestType`: `'calendar_availability'`
- `promptTokens`: 0
- `completionTokens`: 0
- `cost`: '0'
- `success`: true

## Data de Implementação

2025-10-12

## Testes Sugeridos

1. Enviar mensagem: "Quais horários disponíveis?"
2. Verificar se recebe 5 opções de horários
3. Confirmar que horários são de dias úteis
4. Verificar que não há conflitos com eventos existentes
5. Testar com diferentes variações de perguntas
