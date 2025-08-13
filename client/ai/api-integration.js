// Exemplo de integração com APIs reais de IA
// Este arquivo demonstra como conectar o sistema com APIs como OpenAI

class AIService {
    constructor(apiKey, baseUrl = 'https://api.openai.com/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }

    // Testar conexão com a API
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return {
                success: true,
                models: data.data.map(model => model.id),
                message: 'Conexão estabelecida com sucesso!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: 'Falha na conexão com a API'
            };
        }
    }

    // Enviar mensagem para um agente específico
    async sendMessage(agent, message, conversationHistory = []) {
        try {
            const messages = [
                { role: 'system', content: agent.systemPrompt },
                ...conversationHistory,
                { role: 'user', content: message }
            ];

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: agent.model,
                    messages: messages,
                    temperature: agent.temperature,
                    max_tokens: agent.maxTokens,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            
            return {
                success: true,
                response: data.choices[0].message.content,
                usage: data.usage,
                model: data.model,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Obter lista de modelos disponíveis
    async getAvailableModels() {
        try {
            const response = await fetch(`${this.baseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            return data.data
                .filter(model => model.id.includes('gpt'))
                .map(model => ({
                    id: model.id,
                    name: model.id.toUpperCase(),
                    created: model.created
                }))
                .sort((a, b) => b.created - a.created);
        } catch (error) {
            console.error('Erro ao buscar modelos:', error);
            return [];
        }
    }

    // Calcular custo estimado
    calculateCost(usage, model) {
        // Preços aproximados por 1K tokens (valores de exemplo)
        const pricing = {
            'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
            'gpt-4': { input: 0.03, output: 0.06 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 },
            'gpt-4o': { input: 0.005, output: 0.015 }
        };

        const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
        const inputCost = (usage.prompt_tokens / 1000) * modelPricing.input;
        const outputCost = (usage.completion_tokens / 1000) * modelPricing.output;
        
        return {
            inputCost,
            outputCost,
            totalCost: inputCost + outputCost,
            currency: 'USD'
        };
    }
}

// Classe para gerenciar conversas
class ConversationManager {
    constructor() {
        this.conversations = new Map();
    }

    // Iniciar nova conversa
    startConversation(agentId, userId = 'default') {
        const conversationId = `${agentId}_${userId}_${Date.now()}`;
        this.conversations.set(conversationId, {
            id: conversationId,
            agentId,
            userId,
            messages: [],
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        });
        return conversationId;
    }

    // Adicionar mensagem à conversa
    addMessage(conversationId, role, content, metadata = {}) {
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.messages.push({
                role,
                content,
                timestamp: new Date().toISOString(),
                ...metadata
            });
            conversation.lastActivity = new Date().toISOString();
        }
    }

    // Obter histórico da conversa
    getConversationHistory(conversationId) {
        const conversation = this.conversations.get(conversationId);
        return conversation ? conversation.messages : [];
    }

    // Limpar conversa
    clearConversation(conversationId) {
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
            conversation.messages = [];
            conversation.lastActivity = new Date().toISOString();
        }
    }

    // Salvar conversas no localStorage
    saveConversations() {
        const conversationsArray = Array.from(this.conversations.entries());
        localStorage.setItem('ai-conversations', JSON.stringify(conversationsArray));
    }

    // Carregar conversas do localStorage
    loadConversations() {
        const saved = localStorage.getItem('ai-conversations');
        if (saved) {
            const conversationsArray = JSON.parse(saved);
            this.conversations = new Map(conversationsArray);
        }
    }
}

// Classe para métricas e analytics
class AnalyticsManager {
    constructor() {
        this.metrics = {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            agentUsage: {},
            modelUsage: {},
            dailyUsage: {}
        };
        this.loadMetrics();
    }

    // Registrar uso de agente
    recordUsage(agentId, model, usage, cost) {
        this.metrics.totalRequests++;
        this.metrics.totalTokens += usage.total_tokens;
        this.metrics.totalCost += cost.totalCost;

        // Uso por agente
        if (!this.metrics.agentUsage[agentId]) {
            this.metrics.agentUsage[agentId] = {
                requests: 0,
                tokens: 0,
                cost: 0
            };
        }
        this.metrics.agentUsage[agentId].requests++;
        this.metrics.agentUsage[agentId].tokens += usage.total_tokens;
        this.metrics.agentUsage[agentId].cost += cost.totalCost;

        // Uso por modelo
        if (!this.metrics.modelUsage[model]) {
            this.metrics.modelUsage[model] = {
                requests: 0,
                tokens: 0,
                cost: 0
            };
        }
        this.metrics.modelUsage[model].requests++;
        this.metrics.modelUsage[model].tokens += usage.total_tokens;
        this.metrics.modelUsage[model].cost += cost.totalCost;

        // Uso diário
        const today = new Date().toISOString().split('T')[0];
        if (!this.metrics.dailyUsage[today]) {
            this.metrics.dailyUsage[today] = {
                requests: 0,
                tokens: 0,
                cost: 0
            };
        }
        this.metrics.dailyUsage[today].requests++;
        this.metrics.dailyUsage[today].tokens += usage.total_tokens;
        this.metrics.dailyUsage[today].cost += cost.totalCost;

        this.saveMetrics();
    }

    // Obter métricas
    getMetrics() {
        return { ...this.metrics };
    }

    // Obter uso de hoje
    getTodayUsage() {
        const today = new Date().toISOString().split('T')[0];
        return this.metrics.dailyUsage[today] || { requests: 0, tokens: 0, cost: 0 };
    }

    // Obter uso do mês
    getMonthUsage() {
        const currentMonth = new Date().toISOString().substring(0, 7);
        let monthUsage = { requests: 0, tokens: 0, cost: 0 };

        Object.entries(this.metrics.dailyUsage).forEach(([date, usage]) => {
            if (date.startsWith(currentMonth)) {
                monthUsage.requests += usage.requests;
                monthUsage.tokens += usage.tokens;
                monthUsage.cost += usage.cost;
            }
        });

        return monthUsage;
    }

    // Salvar métricas
    saveMetrics() {
        localStorage.setItem('ai-metrics', JSON.stringify(this.metrics));
    }

    // Carregar métricas
    loadMetrics() {
        const saved = localStorage.getItem('ai-metrics');
        if (saved) {
            this.metrics = { ...this.metrics, ...JSON.parse(saved) };
        }
    }

    // Resetar métricas
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            totalTokens: 0,
            totalCost: 0,
            agentUsage: {},
            modelUsage: {},
            dailyUsage: {}
        };
        this.saveMetrics();
    }
}

// Exemplo de uso integrado
class IntegratedAIManager {
    constructor() {
        this.aiService = null;
        this.conversationManager = new ConversationManager();
        this.analyticsManager = new AnalyticsManager();
        this.currentConversations = new Map();
    }

    // Configurar API
    setupAPI(apiKey) {
        this.aiService = new AIService(apiKey);
        return this.aiService.testConnection();
    }

    // Testar agente com integração completa
    async testAgentIntegrated(agent, message) {
        if (!this.aiService) {
            throw new Error('API não configurada. Configure a chave da API primeiro.');
        }

        try {
            // Obter ou criar conversa
            let conversationId = this.currentConversations.get(agent.id);
            if (!conversationId) {
                conversationId = this.conversationManager.startConversation(agent.id);
                this.currentConversations.set(agent.id, conversationId);
            }

            // Obter histórico da conversa
            const history = this.conversationManager.getConversationHistory(conversationId);

            // Enviar mensagem
            const result = await this.aiService.sendMessage(agent, message, history);

            if (result.success) {
                // Registrar mensagens na conversa
                this.conversationManager.addMessage(conversationId, 'user', message);
                this.conversationManager.addMessage(conversationId, 'assistant', result.response, {
                    model: result.model,
                    usage: result.usage
                });

                // Calcular custo
                const cost = this.aiService.calculateCost(result.usage, result.model);

                // Registrar métricas
                this.analyticsManager.recordUsage(agent.id, result.model, result.usage, cost);

                // Salvar dados
                this.conversationManager.saveConversations();

                return {
                    ...result,
                    cost,
                    conversationId
                };
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Obter estatísticas
    getStatistics() {
        return {
            metrics: this.analyticsManager.getMetrics(),
            todayUsage: this.analyticsManager.getTodayUsage(),
            monthUsage: this.analyticsManager.getMonthUsage(),
            activeConversations: this.currentConversations.size
        };
    }
}

// Exportar para uso global
window.AIService = AIService;
window.ConversationManager = ConversationManager;
window.AnalyticsManager = AnalyticsManager;
window.IntegratedAIManager = IntegratedAIManager;