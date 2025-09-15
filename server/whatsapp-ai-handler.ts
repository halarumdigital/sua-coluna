import { storage } from './storage';
import { openaiService } from './openai';
import { whatsappService } from './whatsapp';

export class WhatsAppAIHandler {
  // Cache para controlar respostas recentes e evitar loops
  private recentResponses = new Map<string, number>();
  private readonly RESPONSE_COOLDOWN = 30000; // 30 segundos

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

      // Verificar se esta mensagem é uma resposta recente do nosso próprio sistema
      const messageKey = `${instanceKey}-${phoneNumber}-${messageText}`;
      if (this.isRecentResponse(messageKey)) {
        console.log(`⏭️ Ignorando mensagem recente do sistema: ${messageKey}`);
        return;
      }

      // Verificar se a instância pertence a um cliente
      const instances = await storage.getWhatsappInstances();
      const instance = instances.find(inst => inst.instanceKey === instanceKey);
      
      if (!instance) {
        console.log(`❌ Instância ${instanceKey} não encontrada`);
        return;
      }

      // Obter dados da franquia
      const franchise = await storage.getFranchise(instance.franchiseId);
      if (!franchise) {
        console.log(`❌ Franquia não encontrada para instância ${instanceKey}`);
        return;
      }

      console.log(`✅ Franquia encontrada: ${franchise.franchiseName}`);

      // Buscar agente de IA vinculado a esta instância
      const agentBindings = await storage.getFranchiseInstanceAgentBindings(franchise.id);
      const activeBinding = agentBindings.find(binding => 
        binding.instanceId === instance.id && binding.isActive
      );
      
      if (!activeBinding) {
        console.log(`❌ Nenhum agente de IA ativo vinculado à instância ${instanceKey}`);
        return;
      }

      console.log(`✅ Agente de IA encontrado: ${activeBinding.agentId}`);

      // Buscar o agente personalizado
      const customAgent = await storage.getCustomAIAgentById(activeBinding.agentId);
      if (!customAgent) {
        console.log(`❌ Agente de IA personalizado não encontrado: ${activeBinding.agentId}`);
        return;
      }

      console.log(`🤖 Usando agente: ${customAgent.name}`);

      // Buscar/criar conversa antes de usar contexto
      const chatId = messageObj.key?.remoteJid || `${phoneNumber}@s.whatsapp.net`;
      const messageId = messageObj.key?.id || `msg_${Date.now()}`;
      const timestamp = new Date(messageObj.messageTimestamp ? messageObj.messageTimestamp * 1000 : Date.now());

      let conversation = await storage.getWhatsappConversationByChatId(instance.id, chatId);
      if (!conversation) {
        conversation = await storage.createWhatsappConversation({
          instanceId: instance.id,
          chatId: chatId,
          phoneNumber: phoneNumber,
          contactName: phoneNumber,
          lastMessage: messageText,
          lastMessageAt: timestamp,
          unreadCount: 1,
          isGroup: chatId.includes('@g.us'),
          status: 'active'
        });
      }

      // Buscar contexto de conversação (últimas mensagens)
      const conversationContext = await storage.getAgentContext(conversation.id, activeBinding.agentId, 50);
      console.log(`📖 Contexto encontrado: ${conversationContext.length} mensagens`);

      // Obter configurações de AI do sistema
      const aiSettings = await storage.getAISettings();
      if (!aiSettings.chatGptApiKey) {
        console.log('❌ API key do ChatGPT não configurada');
        return;
      }

      // Salvar mensagem do usuário no contexto
      const nextMessageOrder = conversationContext.length > 0 ? 
        Math.max(...conversationContext.map(ctx => ctx.messageOrder)) + 1 : 1;
      
      await storage.addToAgentContext({
        conversationId: conversation.id,
        instanceId: instance.id,
        agentId: activeBinding.agentId,
        messageText: messageText,
        messageRole: 'user',
        messageOrder: nextMessageOrder,
        senderPhone: phoneNumber,
        timestamp: new Date()
      });

      // Construir histórico de conversa para o AI
      let conversationHistory = '';
      if (conversationContext.length > 0) {
        // Ordenar por ordem crescente (mais antigas primeiro)
        const sortedContext = conversationContext.sort((a, b) => a.messageOrder - b.messageOrder);
        conversationHistory = '\n\nHistórico da conversa:\n' + 
          sortedContext.map(ctx => 
            `${ctx.messageRole === 'user' ? 'Usuário' : 'Assistente'}: ${ctx.messageText}`
          ).join('\n');
      }

      // Preparar contexto da mensagem para o AI usando o prompt personalizado + histórico
      const contextMessage = `${customAgent.systemPrompt}

Você está respondendo uma mensagem do WhatsApp de ${phoneNumber}.${conversationHistory}

Nova mensagem recebida: "${messageText}";

Responda considerando todo o contexto da conversa acima.`;

      console.log('🧠 Gerando resposta com AI...');

      // Gerar resposta usando AI com configurações do agente personalizado
      const aiResponse = await openaiService.chat(contextMessage, {
        chatGptApiKey: aiSettings.chatGptApiKey,
        model: aiSettings.model || 'gpt-3.5-turbo',
        systemPrompt: customAgent.systemPrompt,
        maxTokens: Number(customAgent.maxTokens) || 1000,
        temperature: Number(customAgent.temperature) || 0.7
      });

      if (!aiResponse.success || !aiResponse.response) {
        console.log('❌ Falha ao gerar resposta com AI:', aiResponse.error);
        return;
      }

      const responseText = aiResponse.response.trim();
      console.log(`🤖 Resposta gerada: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);       

      // Salvar resposta do agente no contexto
      await storage.addToAgentContext({
        conversationId: conversation.id,
        instanceId: instance.id,
        agentId: activeBinding.agentId,
        messageText: responseText,
        messageRole: 'assistant',
        messageOrder: nextMessageOrder + 1,
        senderPhone: phoneNumber,
        timestamp: new Date()
      });

      // Registrar esta resposta no cache para evitar loops
      this.registerResponse(messageKey, responseText);

      // Enviar resposta via WhatsApp
      const sendResult = await whatsappService.sendMessage(instanceKey, phoneNumber, responseText);
      
      if (sendResult.success) {
        console.log(`✅ Resposta enviada com sucesso para ${phoneNumber}`);
        
        // Registrar uso da AI
        try {
          await storage.recordAIUsage({
            userId: franchise.userId, // Usar userId da franquia
            model: aiSettings.model || 'gpt-3.5-turbo',
            promptTokens: aiResponse.usage?.promptTokens || 0,
            completionTokens: aiResponse.usage?.completionTokens || 0,
            totalTokens: aiResponse.usage?.totalTokens || 0,
            cost: String(aiResponse.usage?.cost || 0),
            requestType: 'whatsapp_auto_reply',
            success: true
          });
        } catch (error) {
          console.error('❌ Erro ao registrar uso da AI:', error);
        }
      } else {
        console.log('❌ Falha ao enviar resposta:', sendResult.error);
      }

      // Salvar mensagem no sistema tradicional também (para compatibilidade)
      await this.saveConversationAndMessage(instanceKey, phoneNumber, messageText, messageObj);

    } catch (error: any) {
      console.error('❌ Erro ao processar mensagem recebida:', error);
    }
  }

  private isRecentResponse(messageKey: string): boolean {
    const timestamp = this.recentResponses.get(messageKey);
    if (!timestamp) return false;
    
    const isRecent = (Date.now() - timestamp) < this.RESPONSE_COOLDOWN;
    if (isRecent) {
      console.log(`🚫 Detectada resposta recente para ${messageKey}, ignorando para evitar loop`);
    }
    return isRecent;
  }

  private registerResponse(messageKey: string, responseText: string): void {
    this.recentResponses.set(messageKey, Date.now());
    
    // Limpar entradas antigas periodicamente
    if (this.recentResponses.size > 100) {
      const cutoffTime = Date.now() - this.RESPONSE_COOLDOWN;
      // Converter para array para compatibilidade com TypeScript mais antigo
      const entries = Array.from(this.recentResponses.entries());
      for (let i = 0; i < entries.length; i++) {
        const [key, timestamp] = entries[i];
        if (timestamp < cutoffTime) {
          this.recentResponses.delete(key);
        }
      }
    }
    
    console.log(`📝 Resposta registrada no cache: ${messageKey}`);
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
      console.log(`📋 Webhook event: ${webhookData.event}`);
      
      // Process message events
      if (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') {
        await this.processMessageEvents(instanceKey, webhookData);
      }
      // Process chat events (new functionality)
      else if (webhookData.event === 'chats.update' || webhookData.event === 'CHATS_UPDATE' ||
               webhookData.event === 'chats.upsert' || webhookData.event === 'CHATS_UPSERT') {
        await this.processChatEvents(instanceKey, webhookData);
      }
      else {
        console.log(`⏭️ Skipping non-message/chat event: ${webhookData.event}`);
      }
    } catch (error) {
      console.error('❌ Error processing client webhook:', error);
    }
  }

  async handleAdminWebhook(instanceKey: string, webhookData: any): Promise<void> {
    try {
      console.log(`📨 Processing admin webhook for instance: ${instanceKey}`);
      console.log(`📋 Webhook event: ${webhookData.event}`);
      
      // Process message events
      if (webhookData.event === 'messages.upsert' || webhookData.event === 'MESSAGES_UPSERT') {
        await this.processMessageEvents(instanceKey, webhookData);
      }
      // Process chat events (new functionality)
      else if (webhookData.event === 'chats.update' || webhookData.event === 'CHATS_UPDATE' ||
               webhookData.event === 'chats.upsert' || webhookData.event === 'CHATS_UPSERT') {
        await this.processChatEvents(instanceKey, webhookData);
      }
      else {
        console.log(`⏭️ Skipping non-message/chat event: ${webhookData.event}`);
      }
    } catch (error) {
      console.error('❌ Error processing admin webhook:', error);
    }
  }

  private async processMessageEvents(instanceKey: string, webhookData: any): Promise<void> {
    try {
      console.log(`📬 Processing message events for instance: ${instanceKey}`);
      
      // Handle different webhook data structures
      let messages = [];
      
      if (webhookData.data?.messages) {
        // Format: { data: { messages: [...] } }
        messages = webhookData.data.messages;
      } else if (webhookData.data?.key && webhookData.data?.message) {
        // Format: Evolution API { data: { key, message } }
        messages = [webhookData.data];
      } else if (webhookData.messages) {
        // Format: { messages: [...] }
        messages = webhookData.messages;
      } else if (webhookData.key && webhookData.message) {
        // Format: Direct message object (Evolution API format)
        messages = [webhookData];
      }
      
      console.log(`📬 Processing ${messages.length} message(s)`);
      
      for (const message of messages) {
        console.log(`📨 Message details:`, {
          fromMe: message.key?.fromMe,
          hasMessage: !!message.message,
          messageType: message.messageType,
          remoteJid: message.key?.remoteJid
        });
        
        // Only process incoming messages (not sent by us)
        if (!message.key?.fromMe && message.message) {
          console.log(`✅ Processing incoming message from ${message.key.remoteJid}`);
          await this.handleIncomingMessage(instanceKey, message);
        } else {
          console.log(`⏭️ Skipping message: fromMe=${message.key?.fromMe}, hasMessage=${!!message.message}`);
        }
      }
    } catch (error) {
      console.error('❌ Error processing message events:', error);
    }
  }

  private async processChatEvents(instanceKey: string, webhookData: any): Promise<void> {
    try {
      console.log(`💬 Processing chat events for instance: ${instanceKey}`);
      
      // Extract chat data from different possible structures
      let chats = [];
      
      if (webhookData.data?.chats) {
        // Format: { data: { chats: [...] } }
        chats = webhookData.data.chats;
      } else if (webhookData.data?.key && webhookData.data?.message) {
        // Format: Evolution API { data: { key, message } } - treat as single chat
        chats = [webhookData.data];
      } else if (webhookData.chats) {
        // Format: { chats: [...] }
        chats = webhookData.chats;
      } else if (webhookData.key && webhookData.message) {
        // Format: Direct chat object (Evolution API format)
        chats = [webhookData];
      } else if (Array.isArray(webhookData.data)) {
        // Format: data is an array of chat objects (from logs)
        chats = webhookData.data;
      }
      
      console.log(`💬 Processing ${chats.length} chat(s)`);
      
      for (const chat of chats) {
        console.log(`💬 Chat details:`, {
          id: chat.id,
          remoteJid: chat.remoteJid,
          hasMessages: !!chat.messages,
          hasLastMessage: !!chat.lastMessage,
          messageCount: chat.messages ? chat.messages.length : 0
        });
        
        // Se o chat não tem mensagens embutidas, precisamos buscar as mensagens recentes
        if (!chat.messages && !chat.lastMessage) {
          console.log(`🔍 Chat ${chat.remoteJid} não tem mensagens embutidas, buscando mensagens recentes...`);
          await this.fetchAndProcessRecentMessages(instanceKey, chat.remoteJid);
          continue;
        }
        
        // Extract messages from chat
        let messages = [];
        
        if (chat.messages && Array.isArray(chat.messages)) {
          messages = chat.messages;
        } else if (chat.lastMessage) {
          messages = [chat.lastMessage];
        }
        
        console.log(`📨 Found ${messages.length} message(s) in chat`);
        
        // Process each message in the chat
        for (const message of messages) {
          console.log(`📨 Chat message details:`, {
            fromMe: message.key?.fromMe,
            hasMessage: !!message.message,
            messageType: message.messageType,
            remoteJid: message.key?.remoteJid
          });
          
          // Only process incoming messages (not sent by us)
          if (!message.key?.fromMe && message.message) {
            console.log(`✅ Processing incoming chat message from ${message.key.remoteJid}`);
            await this.handleIncomingMessage(instanceKey, message);
          } else {
            console.log(`⏭️ Skipping chat message: fromMe=${message.key?.fromMe}, hasMessage=${!!message.message}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing chat events:', error);
    }
  }

  private async fetchAndProcessRecentMessages(instanceKey: string, remoteJid: string): Promise<void> {
    try {
      console.log(`🔍 Buscando mensagens recentes para ${remoteJid}...`);
      
      // Buscar mensagens usando o serviço do WhatsApp
      const messagesResult = await whatsappService.findMessages(instanceKey, remoteJid, 1, 10);
      
      if (messagesResult.success && messagesResult.data && Array.isArray(messagesResult.data)) {
        const messages = messagesResult.data;
        console.log(`📨 Encontradas ${messages.length} mensagens recentes para ${remoteJid}`);
        
        // Processar apenas mensagens de entrada (não enviadas por nós)
        const incomingMessages = messages.filter(msg => !msg.key?.fromMe && msg.message);
        
        for (const message of incomingMessages) {
          console.log(`✅ Processando mensagem recente de ${message.key?.remoteJid}`);
          await this.handleIncomingMessage(instanceKey, message);
        }
      } else {
        console.log(`⚠️ Não foi possível buscar mensagens para ${remoteJid}:`, messagesResult.error);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar mensagens recentes para ${remoteJid}:`, error);
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
