# IA - Movida para Super Root

## 🎯 Alterações Implementadas

### ✅ **Funcionalidade Movida para Super Root:**

#### **🔐 Controle de Acesso:**
- **Super Root Exclusivo** - Apenas usuários `super_root` podem configurar a IA global
- **Removido do Admin** - Franqueadores não têm mais acesso às configurações de IA
- **Rota Protegida** - `/api/super-root/ai-*` com validação de permissões

#### **🤖 Configurações de IA:**
1. **API Key OpenAI** - Configurar chave da API do ChatGPT
2. **Modelo de IA** - Selecionar GPT-3.5, GPT-4, GPT-4 Turbo, GPT-4o
3. **Temperatura** - Controlar criatividade (0-2)
4. **Tokens Máximos** - Definir tamanho das respostas (1-4000)
5. **Prompt Global** - Configurar comportamento padrão da IA
6. **Teste de Conexão** - Validar configurações com OpenAI
7. **Estatísticas de Uso** - Monitorar tokens, custos e requests

#### **📊 Dashboard de Estatísticas:**
- **Total de Tokens** - Consumo total de tokens
- **Custo Total** - Gastos com a API OpenAI
- **Requests Hoje** - Uso diário da IA
- **Requests Este Mês** - Uso mensal da IA
- **Último Uso** - Data/hora da última utilização
- **Auto-refresh** - Atualização automática a cada 30 segundos

## 🗂️ **Estrutura Atualizada**

### **Menu Super Root:**
```
👑 Dashboard
🏢 Planos (Listar/Novo)
🏪 Franqueadores (Listar/Novo)
🤖 IA ← MOVIDO!
📱 API WhatsApp
📊 Relatórios
⚙️ Configurações
```

### **Menu Admin (Franqueador):**
```
📊 Dashboard
🏪 Franquias (Listar/Nova)
```

## 🔧 **API Endpoints**

### **Novos Endpoints Super Root:**
- `GET /api/super-root/ai-settings` - Buscar configurações de IA
- `POST /api/super-root/ai-settings` - Salvar configurações de IA
- `GET /api/super-root/ai-models` - Listar modelos disponíveis
- `GET /api/super-root/ai-usage` - Estatísticas de uso
- `POST /api/super-root/ai-test` - Testar conexão OpenAI
- `POST /api/super-root/ai-chat` - Testar chat com IA

### **Endpoints Removidos do Admin:**
- ❌ `GET /api/admin/ai-settings` - Removido
- ❌ `POST /api/admin/ai-settings` - Removido
- ❌ `GET /api/admin/ai-models` - Removido
- ❌ `GET /api/admin/ai-usage` - Removido
- ❌ `POST /api/admin/ai-test` - Removido
- ❌ `POST /api/admin/ai-chat` - Removido

## 📱 **Interface Moderna**

### **Página Principal:**
- **Cards de Estatísticas** - Métricas em tempo real
- **Formulário de Configuração** - Todos os parâmetros da IA
- **Teste de Agente** - Interface para testar configurações
- **Informações Importantes** - Guia sobre uso e custos

### **Funcionalidades Avançadas:**
- ✅ **Slider de Temperatura** - Controle visual da criatividade
- ✅ **Seletor de Modelo** - Dropdown com modelos disponíveis
- ✅ **Teste em Tempo Real** - Chat direto com a IA
- ✅ **Validação de API Key** - Teste de conexão com OpenAI
- ✅ **Monitoramento de Custos** - Acompanhamento de gastos

### **Segurança:**
- 🔒 **API Key Mascarada** - Chave exibida como ••••••••••••••••
- 🔒 **Validação de Permissões** - Apenas super_root pode acessar
- 🔒 **Logs de Uso** - Registro completo de utilização
- 🔒 **Controle de Custos** - Monitoramento de gastos

## 🗄️ **Banco de Dados**

### **Tabelas Utilizadas:**
```sql
system_settings
├── chatGptApiKey (string)
├── ai_model (string)
├── ai_temperature (number)
├── ai_max_tokens (number)
└── ai_system_prompt (string)

ai_usage
├── id (UUID)
├── user_id (UUID)
├── model (VARCHAR)
├── prompt_tokens (INT)
├── completion_tokens (INT)
├── total_tokens (INT)
├── cost (DECIMAL)
├── request_type (VARCHAR)
├── success (BOOLEAN)
├── error_message (TEXT)
└── created_at (TIMESTAMP)
```

### **Estatísticas Calculadas:**
- **Total de Tokens** - SUM(total_tokens)
- **Custo Total** - SUM(cost)
- **Requests Hoje** - COUNT(*) WHERE created_at >= hoje
- **Requests Este Mês** - COUNT(*) WHERE created_at >= início do mês
- **Último Uso** - MAX(created_at)

## 🚀 **Como Usar**

### **1. Acesso:**
```
Login: superroot@sistema.com
Senha: superroot123
Menu: IA
```

### **2. Configuração:**
1. **API Key** - Inserir chave da OpenAI (sk-...)
2. **Modelo** - Selecionar GPT-3.5, GPT-4, etc.
3. **Temperatura** - Ajustar criatividade (0-2)
4. **Tokens** - Definir tamanho máximo (1-4000)
5. **Prompt** - Configurar comportamento global
6. **Testar** - Validar configurações
7. **Salvar** - Aplicar para todo o sistema

### **3. Monitoramento:**
- **Dashboard** - Visualizar estatísticas em tempo real
- **Custos** - Acompanhar gastos com OpenAI
- **Uso** - Monitorar requests diários/mensais
- **Performance** - Verificar tokens consumidos

## 📋 **Benefícios da Mudança**

### **Para o Super Root:**
- ✅ **Controle Total** - Gerenciamento global da IA
- ✅ **Visibilidade** - Estatísticas completas de uso
- ✅ **Segurança** - API Key protegida no nível mais alto
- ✅ **Economia** - Controle centralizado de custos

### **Para o Sistema:**
- ✅ **Consistência** - Comportamento uniforme da IA
- ✅ **Eficiência** - Uma única configuração para todos
- ✅ **Manutenção** - Facilita atualizações e ajustes
- ✅ **Escalabilidade** - Suporte a crescimento do sistema

### **Para Franqueadores:**
- ✅ **Simplicidade** - Não precisam configurar IA
- ✅ **Foco** - Concentram-se no negócio
- ✅ **Estabilidade** - IA sempre funcionando
- ✅ **Qualidade** - Configurações otimizadas pelo super_root

### **Para Franquias:**
- ✅ **IA Pronta** - Funcionalidade disponível imediatamente
- ✅ **Qualidade** - Configurações profissionais
- ✅ **Suporte** - IA configurada por especialistas
- ✅ **Economia** - Sem custos individuais de configuração

## 🎉 **Status da Implementação**

- ✅ **Backend** - APIs implementadas e testadas
- ✅ **Frontend** - Interface completa e responsiva
- ✅ **Roteamento** - Rotas atualizadas no App.tsx
- ✅ **Menu** - Sidebar atualizada para ambos os roles
- ✅ **Segurança** - Controle de acesso implementado
- ✅ **Estatísticas** - Dashboard de monitoramento funcional
- ✅ **Testes** - Funcionalidades validadas

## 📊 **Dados Atuais do Sistema**

### **Configurações Existentes:**
- **Modelo**: GPT-4o
- **Temperatura**: 0.7
- **Tokens Máximos**: 100
- **Prompt**: Configurado para atendimento de clínica

### **Estatísticas de Uso:**
- **Total de Requests**: 24
- **Total de Tokens**: 18,234
- **Custo Total**: $0.1031
- **Último Uso**: Ativo

## 📱 **Impacto nos Usuários**

### **Super Root:**
- 🆕 **Nova Funcionalidade** - Controle completo da IA
- 📊 **Dashboard Avançado** - Estatísticas em tempo real
- 🔧 **Configuração Global** - Impacto em todo o sistema

### **Franqueadores (Admin):**
- ❌ **Funcionalidade Removida** - Não configuram mais IA
- ✅ **Simplificação** - Menu mais limpo e focado
- ✅ **IA Sempre Disponível** - Funciona automaticamente

### **Franquias (Client):**
- ✅ **Sem Impacto** - IA continua funcionando normalmente
- ✅ **Melhor Qualidade** - Configurações otimizadas
- ✅ **Estabilidade** - Configurações centralizadas

**Sistema com IA centralizada e otimizada no Super Root!** 🚀