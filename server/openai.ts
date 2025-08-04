import OpenAI from 'openai';
import { storage } from './storage';

export class OpenAIService {
  private openai: OpenAI | null = null;

  private async initializeOpenAI(): Promise<OpenAI | null> {
    try {
      const aiSettings = await storage.getAISettings();
      
      if (!aiSettings.chatGptApiKey) {
        console.warn('OpenAI API key not configured');
        return null;
      }

      this.openai = new OpenAI({
        apiKey: aiSettings.chatGptApiKey,
      });

      return this.openai;
    } catch (error) {
      console.error('Error initializing OpenAI:', error);
      return null;
    }
  }

  async getAvailableModels(): Promise<{ id: string; name: string; description: string; pricing?: any }[]> {
    try {
      const openai = await this.initializeOpenAI();
      if (!openai) {
        return this.getDefaultModels();
      }

      const models = await openai.models.list();
      
      // Filter and format GPT models
      const gptModels = models.data
        .filter(model => model.id.includes('gpt'))
        .map(model => ({
          id: model.id,
          name: this.formatModelName(model.id),
          description: this.getModelDescription(model.id),
          pricing: this.getModelPricing(model.id)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

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
      const openai = await this.initializeOpenAI();
      if (!openai) {
        return {
          totalTokens: 0,
          totalCost: 0,
          requestsToday: 0,
          requestsThisMonth: 0,
          lastUsed: null
        };
      }

      // Note: OpenAI doesn't provide usage stats through the API directly
      // This would typically require storing usage data in your own database
      // For now, we'll return mock data and implement tracking later
      
      return {
        totalTokens: 0,
        totalCost: 0,
        requestsToday: 0,
        requestsThisMonth: 0,
        lastUsed: null
      };
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
      const openai = await this.initializeOpenAI();
      if (!openai) {
        return { success: false, error: 'API key not configured' };
      }

      // Test with a simple completion
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      });

      return { 
        success: true, 
        model: response.model 
      };
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Connection failed' 
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