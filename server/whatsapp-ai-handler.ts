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

      // Salvar conversa e mensagem no banco de dados
      await this.saveConversationAndMessage(instanceKey, phoneNumber, messageText, messageObj);

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

  async handleClientWebhook(instanceKey: string, webhookData: any): Promise<void> {
    try {
      console.log(`📨 Processing client webhook for instance: ${instanceKey}`);
      
      // Check if this is a message event
      if (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') {
        const messages = webhookData.data?.messages || webhookData.messages || [];
        
        for (const message of messages) {
          // Only process incoming messages (not sent by us)
          if (!message.key?.fromMe && message.message) {
            await this.handleIncomingMessage(instanceKey, message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing client webhook:', error);
    }
  }

  async handleAdminWebhook(instanceKey: string, webhookData: any): Promise<void> {
    try {
      console.log(`📨 Processing admin webhook for instance: ${instanceKey}`);
      
      // Check if this is a message event
      if (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') {
        const messages = webhookData.data?.messages || webhookData.messages || [];
        
        for (const message of messages) {
          // Only process incoming messages (not sent by us)
          if (!message.key?.fromMe && message.message) {
            await this.handleIncomingMessage(instanceKey, message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing admin webhook:', error);
    }
  }

  private async saveConversationAndMessage(instanceKey: string, phoneNumber: string, messageText: string, messageObj: any): Promise<void> {
    try {
      // Encontrar a instância
      const instances = await storage.getWhatsappInstances();
      const instance = instances.find(inst => inst.instanceKey === instanceKey);
      
      if (!instance) {
        console.log(`❌ Instância ${instanceKey} não encontrada`);
        return;
      }

      const chatId = messageObj.key?.remoteJid || `${phoneNumber}@s.whatsapp.net`;
      const messageId = messageObj.key?.id || `msg_${Date.now()}`;
      const timestamp = new Date(messageObj.messageTimestamp ? messageObj.messageTimestamp * 1000 : Date.now());

      // Verificar se a conversa já existe
      let conversation = await storage.getWhatsappConversationByChatId(instance.id, chatId);

      if (!conversation) {
        // Criar nova conversa
        conversation = await storage.createWhatsappConversation({
          instanceId: instance.id,
          chatId: chatId,
          phoneNumber: phoneNumber,
          contactName: phoneNumber, // Pode ser atualizado depois com o nome real
          lastMessage: messageText,
          lastMessageAt: timestamp,
          unreadCount: 1,
          isGroup: chatId.includes('@g.us'),
          status: 'active'
        });
        console.log(`✅ Nova conversa criada: ${conversation.id}`);
      } else {
        // Atualizar conversa existente
        conversation = await storage.updateWhatsappConversation(conversation.id, {
          lastMessage: messageText,
          lastMessageAt: timestamp,
          unreadCount: (conversation.unreadCount || 0) + 1
        });
        console.log(`✅ Conversa atualizada: ${conversation.id}`);
      }

      // Salvar a mensagem
      await storage.createWhatsappMessage({
        conversationId: conversation.id,
        messageId: messageId,
        senderPhone: phoneNumber,
        messageText: messageText,
        messageType: 'text',
        direction: 'inbound',
        status: 'delivered',
        timestamp: timestamp,
        isAiResponse: false
      });

      console.log(`✅ Mensagem salva no banco de dados`);
    } catch (error) {
      console.error('❌ Erro ao salvar conversa/mensagem:', error);
    }
  }
}

export const whatsappAIHandler = new WhatsAppAIHandler(); 