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

  async getInstanceStatus(instanceKey: string): Promise<{ success: boolean; status?: 'connected' | 'disconnected' | 'connecting'; error?: string }> {
    try {
      const apiSettings = await this.getApiSettings();
      
      console.log(`🔍 Verificando status da instância ${instanceKey}`);
      console.log(`🔗 URL: ${apiSettings.evolutionApiUrl}/instance/connectionState/${instanceKey}`);

      const response = await fetch(`${apiSettings.evolutionApiUrl}/instance/connectionState/${instanceKey}`, {
        method: 'GET',
        headers: {
          'apikey': apiSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao verificar status: ${response.status} - ${errorText}`);
        return { 
          success: false, 
          error: `Failed to get instance status: ${response.status} - ${errorText}` 
        };
      }

      const result = await response.json();
      console.log(`📋 Resposta do status:`, result);
      
      // A Evolution API pode retornar diferentes formatos de status
      let status: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
      
      if (result.instance) {
        // Formato: { instance: { state: "open" } }
        const state = result.instance.state;
        if (state === 'open') {
          status = 'connected';
        } else if (state === 'connecting') {
          status = 'connecting';
        } else {
          status = 'disconnected';
        }
      } else if (result.state) {
        // Formato: { state: "open" }
        const state = result.state;
        if (state === 'open') {
          status = 'connected';
        } else if (state === 'connecting') {
          status = 'connecting';
        } else {
          status = 'disconnected';
        }
      } else if (result.status) {
        // Formato: { status: "connected" }
        status = result.status;
      }

      console.log(`✅ Status da instância ${instanceKey}: ${status}`);
      
      return { 
        success: true, 
        status: status 
      };
    } catch (error: any) {
      console.error('❌ Erro ao verificar status da instância:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error getting instance status' 
      };
    }
  }

  async findChats(instanceKey: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const apiSettings = await this.getApiSettings();
      
      console.log(`🔍 Buscando chats para instância ${instanceKey}`);
      console.log(`🔗 URL: ${apiSettings.evolutionApiUrl}/chat/findChats/${instanceKey}`);

      const response = await fetch(`${apiSettings.evolutionApiUrl}/chat/findChats/${instanceKey}`, {
        method: 'POST',
        headers: {
          'apikey': apiSettings.globalToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro ao buscar chats: ${response.status} - ${errorText}`);
        return { 
          success: false, 
          error: `Failed to find chats: ${response.status} - ${errorText}` 
        };
      }

      const result = await response.json();
      const chats = Array.isArray(result) ? result : (result.chats || []);
      console.log(`✅ Chats encontrados: ${chats.length || 0} chats`);
      
      return { 
        success: true, 
        data: result 
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar chats:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error finding chats' 
      };
    }
  }

  async findMessages(instanceKey: string, remoteJid: string, page: number = 1, offset: number = 50): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const apiSettings = await this.getApiSettings();
      
      // Testar diferentes formatos de requisição para a Evolution API
      const requestVariants = [
        // Formato 1: Com where.key.remoteJid (padrão atual)
        {
          where: {
            key: {
              remoteJid: remoteJid
            }
          },
          page: page,
          offset: offset
        },
        // Formato 2: Com where.remoteJid direto
        {
          where: {
            remoteJid: remoteJid
          },
          page: page,
          offset: offset
        },
        // Formato 3: Só remoteJid
        {
          remoteJid: remoteJid,
          page: page,
          offset: offset
        },
        // Formato 4: Sem filtros, buscar todas as mensagens
        {
          page: page,
          offset: offset
        }
      ];

      console.log(`🔍 Buscando mensagens para ${remoteJid} via instância ${instanceKey}`);
      console.log(`📋 Parâmetros: página ${page}, offset ${offset}`);
      console.log(`🔗 URL: ${apiSettings.evolutionApiUrl}/chat/findMessages/${instanceKey}`);

      // Tentar cada formato até encontrar mensagens
      for (let i = 0; i < requestVariants.length; i++) {
        const requestData = requestVariants[i];
        console.log(`🧪 Testando formato ${i + 1}:`, JSON.stringify(requestData, null, 2));

        const response = await fetch(`${apiSettings.evolutionApiUrl}/chat/findMessages/${instanceKey}`, {
          method: 'POST',
          headers: {
            'apikey': apiSettings.globalToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Erro no formato ${i + 1}: ${response.status} - ${errorText}`);
          continue; // Tentar próximo formato
        }

        const result = await response.json();
        console.log(`📋 Resposta formato ${i + 1}:`, {
          type: typeof result,
          isArray: Array.isArray(result),
          keys: typeof result === 'object' ? Object.keys(result) : 'N/A'
        });

        // Verificar diferentes estruturas de resposta
        let messages = [];
        
        if (Array.isArray(result)) {
          messages = result;
        } else if (result.messages && Array.isArray(result.messages)) {
          messages = result.messages;
        } else if (result.messages && result.messages.records && Array.isArray(result.messages.records)) {
          // Estrutura paginada: { messages: { records: [...], total: X } }
          messages = result.messages.records;
          console.log(`📊 Estrutura paginada encontrada: ${result.messages.total} total, página ${result.messages.currentPage}/${result.messages.pages}`);
        } else if (result.data && Array.isArray(result.data)) {
          messages = result.data;
        } else if (result.records && Array.isArray(result.records)) {
          messages = result.records;
        }
        
        console.log(`📬 Mensagens encontradas no formato ${i + 1}: ${messages.length}`);
        
        if (Array.isArray(messages) && messages.length > 0) {
          console.log(`✅ Sucesso com formato ${i + 1}! ${messages.length} mensagens encontradas`);
          console.log(`📨 Primeira mensagem exemplo:`, JSON.stringify(messages[0], null, 2).substring(0, 300));
          
          // Retornar com a estrutura original mas garantindo que messages contenha o array correto
          return { 
            success: true, 
            data: messages // Retornar diretamente o array de mensagens
          };
        }
      }

      // Se chegou aqui, tentar método GET alternativo
      console.log(`🔄 Tentando método GET alternativo...`);
      
      try {
        const getResponse = await fetch(`${apiSettings.evolutionApiUrl}/chat/findMessages/${instanceKey}?remoteJid=${encodeURIComponent(remoteJid)}&page=${page}&offset=${offset}`, {
          method: 'GET',
          headers: {
            'apikey': apiSettings.globalToken,
            'Content-Type': 'application/json'
          }
        });

        if (getResponse.ok) {
          const getResult = await getResponse.json();
          console.log(`📋 Resposta GET:`, {
            type: typeof getResult,
            isArray: Array.isArray(getResult),
            keys: typeof getResult === 'object' ? Object.keys(getResult) : 'N/A'
          });

          // Verificar estrutura da resposta GET
          let getMessages = [];
          
          if (Array.isArray(getResult)) {
            getMessages = getResult;
          } else if (getResult.messages && Array.isArray(getResult.messages)) {
            getMessages = getResult.messages;
          } else if (getResult.messages && getResult.messages.records && Array.isArray(getResult.messages.records)) {
            getMessages = getResult.messages.records;
          } else if (getResult.data && Array.isArray(getResult.data)) {
            getMessages = getResult.data;
          } else if (getResult.records && Array.isArray(getResult.records)) {
            getMessages = getResult.records;
          }
          
          if (Array.isArray(getMessages) && getMessages.length > 0) {
            console.log(`✅ Sucesso com GET! ${getMessages.length} mensagens encontradas`);
            return { 
              success: true, 
              data: getMessages // Retornar diretamente o array
            };
          }
        }
      } catch (getError) {
        console.log(`❌ Erro no método GET:`, getError);
      }

      // Se chegou aqui, nenhum método retornou mensagens
      console.log(`⚠️ Nenhum método retornou mensagens para ${remoteJid}`);
      return { 
        success: true, 
        data: [] 
      };

    } catch (error: any) {
      console.error('❌ Erro ao buscar mensagens:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error finding messages' 
      };
    }
  }
}

export const whatsappService = new WhatsAppService(); 