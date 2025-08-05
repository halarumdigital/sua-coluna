import { storage } from './storage';
import fetch from 'node-fetch';

export class WhatsAppService {
  private async getApiSettings() {
    try {
      const settings = await storage.getWhatsappApiSettings();
      if (!settings || !settings.isActive) {
        throw new Error('WhatsApp API settings not configured or inactive');
      }
      return settings;
    } catch (error) {
      console.error('Error getting WhatsApp API settings:', error);
      throw error;
    }
  }

  async sendMessage(instanceKey: string, phoneNumber: string, message: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const apiSettings = await this.getApiSettings();
      
      // Prepare the message data for Evolution API
      const messageData = {
        number: phoneNumber,
        text: message
      };

      console.log(`📤 Enviando mensagem para ${phoneNumber} via instância ${instanceKey}`);
      console.log(`📋 Mensagem: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
      console.log(`🔗 URL: ${apiSettings.evolutionApiUrl}/message/sendText/${instanceKey}`);
      console.log(`🔑 Token: ${apiSettings.globalToken?.substring(0, 20)}...`);
      console.log(`📋 Dados:`, messageData);

      const response = await fetch(`${apiSettings.evolutionApiUrl}/message/sendText/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': apiSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao enviar mensagem: ${response.status} - ${errorText}`);
        return { 
          success: false, 
          error: `Failed to send message: ${response.status} - ${errorText}` 
        };
      }

      const result = await response.json();
      console.log(`✅ Mensagem enviada com sucesso:`, result);
      
      return { 
        success: true, 
        messageId: result.key?.id || result.id || 'unknown'
      };
    } catch (error: any) {
      console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error sending message' 
      };
    }
  }

  async getInstanceInfo(instanceKey: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const apiSettings = await this.getApiSettings();
      
      const response = await fetch(`${apiSettings.evolutionApiUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'apikey': apiSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Failed to get instance info: ${response.status} - ${errorText}` 
        };
      }

      const instances = await response.json();
      const instance = instances.find((inst: any) => inst.instance.instanceName === instanceKey);
      
      if (!instance) {
        return { 
          success: false, 
          error: `Instance ${instanceKey} not found` 
        };
      }

      return { 
        success: true, 
        data: instance 
      };
    } catch (error: any) {
      console.error('❌ Erro ao obter informações da instância:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error getting instance info' 
      };
    }
  }
}

export const whatsappService = new WhatsAppService(); 