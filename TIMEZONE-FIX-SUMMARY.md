# Correção do Timezone - Google Calendar

## Problema Identificado

Quando o paciente solicitava um agendamento dizendo "terça às 10", o sistema criava o evento no Google Calendar às **07:00** ao invés de **10:00**.

## Causa Raiz

### Fluxo do Problema:

1. **IA extrai corretamente:**
   ```json
   {
     "dateTime": "2025-10-14T10:00:00",
     "patientName": "gilliard damaceno",
     "confidence": 100
   }
   ```

2. **JavaScript interpreta como UTC:**
   ```javascript
   const dateTime = new Date("2025-10-14T10:00:00");
   // Resultado: 2025-10-14T10:00:00.000Z
   // Ou seja: 10:00 UTC
   ```

3. **Google Calendar converte UTC → Brazil (UTC-3):**
   - Recebe: `2025-10-14T10:00:00.000Z` (10:00 UTC)
   - Converte para `America/Sao_Paulo` (UTC-3)
   - Resultado: **07:00** horário de Brasília ❌

### Diagrama do Problema:

```
Paciente diz: "terça às 10"
       ↓
IA extrai: "2025-10-14T10:00:00" (sem timezone)
       ↓
JavaScript: new Date("2025-10-14T10:00:00")
       ↓
Interpreta como: 10:00 UTC = 2025-10-14T10:00:00.000Z
       ↓
Google Calendar converte UTC-3:
       ↓
Evento criado: 07:00 BRT ❌ (10:00 UTC - 3 horas)
```

## Solução Implementada

### Código Modificado em `server/google-calendar-service.ts` (linhas 272-285):

```typescript
// Parsear a data e garantir que está no timezone correto (America/Sao_Paulo = UTC-3)
// Se a IA retornou "2025-10-14T10:00:00", precisamos interpretar como 10:00 horário de Brasília
const dateTimeString = parsedResponse.dateTime;

// Se a string não tem timezone (termina com Z ou +/-), assumir que é horário de Brasília
let dateTime: Date;
if (dateTimeString.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateTimeString)) {
  // Já tem timezone, usar direto
  dateTime = new Date(dateTimeString);
} else {
  // Não tem timezone, interpretar como horário de Brasília (UTC-3)
  // Adicionar -03:00 ao final
  dateTime = new Date(dateTimeString + '-03:00');
}
```

### Como Funciona:

1. **Detecta se a string tem timezone:**
   - Termina com `Z`? (UTC)
   - Tem `+03:00` ou `-03:00`? (timezone explícito)

2. **Se NÃO tem timezone:**
   - Adiciona `-03:00` ao final
   - Exemplo: `"2025-10-14T10:00:00"` → `"2025-10-14T10:00:00-03:00"`

3. **Resultado:**
   - `new Date("2025-10-14T10:00:00-03:00")`
   - Interpreta como: 10:00 horário de Brasília
   - Converte para UTC: 13:00 UTC (10:00 + 3 horas)
   - Google Calendar recebe: `2025-10-14T13:00:00.000Z`
   - Converte para Brazil: **10:00 BRT** ✅

### Diagrama da Solução:

```
Paciente diz: "terça às 10"
       ↓
IA extrai: "2025-10-14T10:00:00" (sem timezone)
       ↓
NOVA LÓGICA: Adiciona "-03:00"
       ↓
JavaScript: new Date("2025-10-14T10:00:00-03:00")
       ↓
Interpreta como: 10:00 BRT = 2025-10-14T13:00:00.000Z (13:00 UTC)
       ↓
Google Calendar recebe 13:00 UTC e converte:
       ↓
Evento criado: 10:00 BRT ✅ (13:00 UTC - 3 horas)
```

## Teste de Verificação

Execute: `node test-timezone-fix.js`

Resultado esperado:
```
✅ NEW BEHAVIOR (parsing as Brazil time):
  - Added timezone: 2025-10-14T10:00:00-03:00
  - Parsed as: 2025-10-14T13:00:00.000Z
  - Hours (UTC): 13 (13:00 UTC = 10:00 BRT)
  - Local time (Brazil): 14/10/2025, 10:00:00
  - Result: Google Calendar will show 10:00 ✅

🔍 VERIFICATION:
  - Test result: ✅ PASSED
```

## Como Testar no Sistema Real

1. Envie um comprovante PIX via WhatsApp
2. Agende dizendo "terça às 10" (ou qualquer horário)
3. Verifique o Google Calendar
4. **Resultado esperado:** Evento criado no horário correto (10:00, não 07:00)

## Arquivos Modificados

- ✅ `server/google-calendar-service.ts` (linhas 272-285)
- ✅ Build executado: `npm run build`
- ✅ Código compilado em: `dist/index.js` (linha 4389)

## Data da Correção

2025-10-12
