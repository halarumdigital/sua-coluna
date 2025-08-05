import { storage } from './storage';
import { openaiService } from './openai';
import { whatsappService } from './whatsapp';

export class WhatsAppAIHandler {
  async handleIncomingMessage(instanceKey: string, messageData: any): Promise<void> {
    try {
      console.log('🤖 Processando mensagem recebida para resposta automática...');
      
      // Extrair informações da mensagem
      // messageData já é o objeto com key, message, etc.
      const messageObj = messageData.data || messageData;
      if (!messageObj.message) {
        console.log('❌ Mensagem vazia ou inválida');
        return;
      }

      const phoneNumber = messageObj.key?.remoteJid?.replace('@s.whatsapp.net', '');
      const messageText = messageObj.message?.conversation || 
                         messageObj.message?.extendedTextMessage?.text ||
                         messageObj.message?.imageMessage?.caption ||
                         '';

      if (!phoneNumber || !messageText) {
        console.log('❌ Informações insuficientes da mensagem');
        return;
      }

      console.log(`📱 Mensagem de ${phoneNumber}: ${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}`);

      // Verificar se a instância pertence a um cliente
      const instances = await storage.getWhatsappInstances();
      const instance = instances.find(inst => inst.instanceKey === instanceKey);
      
      if (!instance) {
        console.log(`❌ Instância ${instanceKey} não encontrada`);
        return;
      }

      // Obter configurações de AI do cliente
      const client = await storage.getClient(instance.clientId);
      if (!client) {
        console.log(`❌ Cliente não encontrado para instância ${instanceKey}`);
        return;
      }

      // Obter configurações de AI do sistema
      const aiSettings = await storage.getAISettings();
      if (!aiSettings.chatGptApiKey) {
        console.log('❌ API key do ChatGPT não configurada');
        return;
      }

      // Preparar contexto da mensagem para o AI
      const contextMessage = `Você está respondendo uma mensagem do WhatsApp de ${phoneNumber}. 
      
Mensagem recebida: "${messageText}"

Responda de forma natural e útil, como um assistente virtual. Mantenha a resposta concisa e relevante.`;

      console.log('🧠 Gerando resposta com AI...');

      // Gerar resposta usando AI
      const aiResponse = await openaiService.chat(contextMessage, {
        chatGptApiKey: aiSettings.chatGptApiKey,
        model: aiSettings.model,
        systemPrompt: aiSettings.systemPrompt,
        maxTokens: aiSettings.maxTokens,
        temperature: aiSettings.temperature
      });

      if (!aiResponse.success || !aiResponse.response) {
        console.log('❌ Falha ao gerar resposta com AI:', aiResponse.error);
        return;
      }

      const responseText = aiResponse.response.trim();
      console.log(`🤖 Resposta gerada: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);

      // Enviar resposta via WhatsApp
      const sendResult = await whatsappService.sendMessage(instanceKey, phoneNumber, responseText);
      
      if (sendResult.success) {
        console.log(`✅ Resposta enviada com sucesso para ${phoneNumber}`);
        
        // Registrar uso da AI
        try {
          await storage.recordAIUsage({
            userId: client.userId, // Usar userId do cliente
            model: aiSettings.model,
            promptTokens: aiResponse.usage?.promptTokens || 0,
            completionTokens: aiResponse.usage?.completionTokens || 0,
            totalTokens: aiResponse.usage?.totalTokens || 0,
            cost: aiResponse.usage?.cost || 0,
            requestData: JSON.stringify({
              context: 'WhatsApp Auto-Reply',
              phoneNumber,
              instanceKey,
              originalMessage: messageText.substring(0, 200) + (messageText.length > 200 ? '...' : '')
            }),
            responseData: JSON.stringify({
              response: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : '')
            })
          });
        } catch (error) {
          console.error('❌ Erro ao registrar uso da AI:', error);
        }
      } else {
        console.log('❌ Falha ao enviar resposta:', sendResult.error);
      }

    } catch (error: any) {
      console.error('❌ Erro ao processar mensagem recebida:', error);
    }
  }

  async isAutoReplyEnabled(instanceKey: string): Promise<boolean> {
    try {
      // Por enquanto, sempre retorna true
      // No futuro, pode ser configurável por instância
      return true;
    } catch (error) {
      console.error('❌ Erro ao verificar se auto-reply está habilitado:', error);
      return false;
    }
  }
}

export const whatsappAIHandler = new WhatsAppAIHandler(); 