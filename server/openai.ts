import { storage } from './storage';

export class OpenAIService {
  private async getApiKey(): Promise<string | null> {
    try {
      const aiSettings = await storage.getAISettings();
      
      if (!aiSettings.chatGptApiKey) {
        console.warn('OpenAI API key not configured');
        return null;
      }

      return aiSettings.chatGptApiKey;
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  async getAvailableModels(): Promise<{ id: string; name: string; description: string; pricing?: any }[]> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return this.getDefaultModels();
      }

      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch models from OpenAI');
        return this.getDefaultModels();
      }

      const data = await response.json();
      
      // Filter and format GPT models
      const gptModels = data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => ({
          id: model.id,
          name: this.formatModelName(model.id),
          description: this.getModelDescription(model.id),
          pricing: this.getModelPricing(model.id)
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return gptModels.length > 0 ? gptModels : this.getDefaultModels();
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
      return this.getDefaultModels();
    }
  }

  async getUsageStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    requestsToday: number;
    requestsThisMonth: number;
    lastUsed: string | null;
  }> {
    try {
      // Get usage stats from our database instead of OpenAI API
      // since OpenAI doesn't provide usage stats through the API directly
      const stats = await storage.getAIUsageStats();
      return stats;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        requestsToday: 0,
        requestsThisMonth: 0,
        lastUsed: null
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string; model?: string }> {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: 'API key not configured' };
      }

      // Test with a simple completion
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 5
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || 'Connection failed' 
        };
      }

      const data = await response.json();
      return { 
        success: true, 
        model: data.model 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Connection failed' 
      };
    }
  }

  async testChat(message: string, settings: any): Promise<{ 
    success: boolean; 
    response?: string; 
    error?: string; 
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    }
  }> {
    try {
      const apiKey = settings.chatGptApiKey || await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: 'API key not configured' };
      }

      // Prepare the chat completion request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: settings.systemPrompt || 'Você é um assistente útil e prestativo.' },
            { role: 'user', content: message }
          ],
          max_tokens: settings.maxTokens || 1000,
          temperature: settings.temperature || 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || 'Chat request failed' 
        };
      }

      const data = await response.json();
      
      // Calculate cost based on model pricing
      const pricing = this.getModelPricing(settings.model || 'gpt-3.5-turbo');
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || 0;
      const cost = (promptTokens * pricing.input / 1000) + (completionTokens * pricing.output / 1000);

      return { 
        success: true, 
        response: data.choices[0]?.message?.content || 'No response generated',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          cost
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Chat request failed' 
      };
    }
  }

  async chat(message: string, settings: any, userId?: string): Promise<{ 
    success: boolean; 
    response?: string; 
    error?: string; 
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    }
  }> {
    try {
      const apiKey = settings.chatGptApiKey || await this.getApiKey();
      if (!apiKey) {
        return { success: false, error: 'API key not configured' };
      }

      // Prepare the chat completion request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: settings.systemPrompt || 'Você é um assistente útil e prestativo.' },
            { role: 'user', content: message }
          ],
          max_tokens: settings.maxTokens || 1000,
          temperature: settings.temperature || 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { 
          success: false, 
          error: errorData.error?.message || 'Chat request failed' 
        };
      }

      const data = await response.json();
      
      // Calculate cost based on model pricing
      const pricing = this.getModelPricing(settings.model || 'gpt-3.5-turbo');
      const promptTokens = data.usage?.prompt_tokens || 0;
      const completionTokens = data.usage?.completion_tokens || 0;
      const totalTokens = data.usage?.total_tokens || 0;
      const cost = (promptTokens * pricing.input / 1000) + (completionTokens * pricing.output / 1000);

      // Record usage if userId is provided
      if (userId) {
        try {
          await storage.recordAIUsage({
            userId,
            model: settings.model || 'gpt-3.5-turbo',
            promptTokens,
            completionTokens,
            totalTokens,
            cost,
            requestData: JSON.stringify({
              message: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
              settings: {
                model: settings.model,
                maxTokens: settings.maxTokens,
                temperature: settings.temperature,
                hasCustomPrompt: !!settings.systemPrompt
              }
            }),
            responseData: JSON.stringify({
              response: data.choices[0]?.message?.content?.substring(0, 200) + (data.choices[0]?.message?.content && data.choices[0]?.message?.content.length > 200 ? '...' : '')
            })
          });
        } catch (error) {
          console.error('Error recording AI usage:', error);
        }
      }

      return { 
        success: true, 
        response: data.choices[0]?.message?.content || 'No response generated',
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          cost
        }
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Chat request failed' 
      };
    }
  }

  private getDefaultModels() {
    return [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Modelo rápido e eficiente para a maioria das tarefas',
        pricing: { input: 0.0015, output: 0.002 }
      },
      {
        id: 'gpt-3.5-turbo-16k',
        name: 'GPT-3.5 Turbo 16K',
        description: 'Versão com contexto estendido (16K tokens)',
        pricing: { input: 0.003, output: 0.004 }
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Modelo mais avançado com melhor raciocínio',
        pricing: { input: 0.03, output: 0.06 }
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'GPT-4 otimizado com melhor custo-benefício',
        pricing: { input: 0.01, output: 0.03 }
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'Modelo multimodal mais recente da OpenAI',
        pricing: { input: 0.005, output: 0.015 }
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        description: 'Versão compacta e econômica do GPT-4o',
        pricing: { input: 0.00015, output: 0.0006 }
      }
    ];
  }

  private formatModelName(modelId: string): string {
    const nameMap: { [key: string]: string } = {
      'gpt-3.5-turbo': 'GPT-3.5 Turbo',
      'gpt-3.5-turbo-16k': 'GPT-3.5 Turbo 16K',
      'gpt-4': 'GPT-4',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini'
    };

    return nameMap[modelId] || modelId.toUpperCase();
  }

  private getModelDescription(modelId: string): string {
    const descriptions: { [key: string]: string } = {
      'gpt-3.5-turbo': 'Modelo rápido e eficiente para a maioria das tarefas',
      'gpt-3.5-turbo-16k': 'Versão com contexto estendido (16K tokens)',
      'gpt-4': 'Modelo mais avançado com melhor raciocínio',
      'gpt-4-turbo': 'GPT-4 otimizado com melhor custo-benefício',
      'gpt-4o': 'Modelo multimodal mais recente da OpenAI',
      'gpt-4o-mini': 'Versão compacta e econômica do GPT-4o'
    };

    return descriptions[modelId] || 'Modelo GPT da OpenAI';
  }

  private getModelPricing(modelId: string): { input: number; output: number } {
    const pricing: { [key: string]: { input: number; output: number } } = {
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
    };

    return pricing[modelId] || { input: 0, output: 0 };
  }
}

export const openaiService = new OpenAIService();