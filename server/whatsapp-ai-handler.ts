import { storage } from './storage';
import { openaiService } from './openai';
import { whatsappService } from './whatsapp';

export class WhatsAppAIHandler {
  // Cache para controlar respostas recentes e evitar loops
  private recentResponses = new Map<string, number>();
  private readonly RESPONSE_COOLDOWN = 30000; // 30 segundos

  // Cache para evitar processar o mesmo webhook múltiplas vezes
  private processedWebhooks = new Map<string, number>();
  private readonly WEBHOOK_DEDUP_WINDOW = 60000; // 60 segundos

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

      // Criar ID único para a mensagem usando o messageId da Evolution API
      const messageId = messageObj.key?.id || `${Date.now()}_${Math.random()}`;
      const webhookKey = `${instanceKey}_${messageId}`;

      // Verificar se já processamos este webhook recentemente
      if (this.isDuplicateWebhook(webhookKey)) {
        console.log(`⏭️ Webhook duplicado ignorado: ${webhookKey}`);
        return;
      }

      // Marcar webhook como processado
      this.markWebhookAsProcessed(webhookKey);

      const phoneNumber = messageObj.key?.remoteJid?.replace('@s.whatsapp.net', '');
      const messageText = messageObj.message?.conversation ||
                         messageObj.message?.extendedTextMessage?.text ||
                         messageObj.message?.imageMessage?.caption ||
                         messageObj.message?.documentMessage?.caption ||
                         '';

      // Verificar se a mensagem contém imagem ou documento (possível comprovante PIX)
      const hasImage = messageObj.message?.imageMessage;
      const hasDocument = messageObj.message?.documentMessage;
      let pixReceiptData = null;

      if (hasImage || hasDocument) {
        console.log('📎 Detectada mensagem com mídia (imagem/documento)');

        try {
          // Tentar detectar e processar comprovante PIX
          const { PixOCRService } = await import("./pix-ocr-service");

          // Baixar a imagem/documento do WhatsApp
          const mediaMessage = hasImage ? messageObj.message.imageMessage : messageObj.message.documentMessage;

          // A Evolution API já fornece a URL da mídia
          if (mediaMessage.url || mediaMessage.directPath) {
            console.log('🔍 Verificando se é comprovante PIX...');

            // Aqui você precisaria baixar a imagem da Evolution API
            // Por enquanto, vamos apenas marcar que existe mídia
            // e o agente de IA pode perguntar ao usuário sobre o comprovante

            console.log('ℹ️  Mídia detectada - será processada pelo agente IA');
          }
        } catch (error: any) {
          console.error('❌ Erro ao processar possível comprovante PIX:', error);
        }
      }

      if (!phoneNumber) {
        console.log('❌ Número de telefone não disponível');
        return;
      }

      // Se não há texto e não há mídia, ignorar
      if (!messageText && !hasImage && !hasDocument) {
        console.log('❌ Mensagem sem texto ou mídia');
        return;
      }

      // Verificar se é um comando de edição de cliente
      if (messageText.toLowerCase().startsWith('/editarcliente')) {
        console.log('📝 Detectado comando de edição de cliente');
        await this.handleEditClientCommand(instanceKey, phoneNumber, messageText);
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

      // SEMPRE criar/atualizar card do kanban CRM quando um usuário envia uma mensagem (antes de verificar cooldown)
      try {
        const contactName = messageObj.key?.pushName || messageObj.pushName || `Cliente ${phoneNumber}`;
        console.log(`📋 Criando/atualizando card do kanban para: ${phoneNumber}, nome: ${contactName}`);

        // Usar timestamp da mensagem ou data atual
        const messageTimestamp = new Date(messageObj.messageTimestamp ? messageObj.messageTimestamp * 1000 : Date.now());

        const kanbanCard = await storage.createOrUpdateCrmKanbanCard(
          instance.franchiseId,
          phoneNumber,
          contactName,
          undefined, // conversationId será definido mais tarde
          messageTimestamp
        );
        console.log(`✅ Card do kanban criado/atualizado: ${kanbanCard.id} - Status: ${kanbanCard.status}`);
      } catch (error) {
        console.error('❌ Erro ao criar/atualizar card do kanban:', error);
        // Continuar o fluxo mesmo se falhar a criação do card
      }

      // Verificar se esta mensagem é uma resposta recente do nosso próprio sistema (apenas para AI)
      const messageKey = `${instanceKey}-${phoneNumber}-${messageText}`;
      if (this.isRecentResponse(messageKey)) {
        console.log(`⏭️ Ignorando resposta automática da IA para mensagem recente: ${messageKey}`);
        console.log(`📋 Mas card do kanban foi criado/atualizado normalmente`);
        return;
      }

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
      const conversationMessageId = messageObj.key?.id || `msg_${Date.now()}`;
      const timestamp = new Date(messageObj.messageTimestamp ? messageObj.messageTimestamp * 1000 : Date.now());

      // Sempre verificar e criar cliente se necessário, independente de existir conversa
      try {
        const contactName = messageObj.key?.pushName || messageObj.pushName || `Cliente ${phoneNumber}`;
        console.log(`👤 Verificando/criando cliente automaticamente para o telefone: ${phoneNumber}, nome: ${contactName}`);

        const client = await storage.getOrCreateClientFromWhatsApp(
          instance.franchiseId,
          phoneNumber,
          contactName,
          {
            source: "whatsapp",
            notes: "Cliente criado automaticamente via mensagem no WhatsApp"
          }
        );
        console.log(`✅ Cliente verificado/criado com sucesso: ${client.id} - ${client.fullName}`);
      } catch (error) {
        console.error('❌ Erro ao verificar/criar cliente automaticamente:', error);
        // Continuar o fluxo mesmo se falhar a criação do cliente
      }

      let conversation = await storage.getWhatsappConversationByChatId(instance.id, chatId);
      if (!conversation) {
        conversation = await storage.createWhatsappConversation({
          instanceId: instance.id,
          chatId: chatId,
          phoneNumber: phoneNumber,
          contactName: messageObj.key?.pushName || messageObj.pushName || phoneNumber,
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

      // Adicionar informação sobre mídia anexada
      let mediaInfo = '';
      if (hasImage || hasDocument) {
        mediaInfo = '\n\n📎 IMPORTANTE: O usuário enviou uma IMAGEM/DOCUMENTO junto com esta mensagem.';
        if (hasImage) {
          mediaInfo += '\n- Tipo: Imagem (pode ser um comprovante de pagamento PIX, screenshot, foto, etc.)';
        }
        if (hasDocument) {
          mediaInfo += '\n- Tipo: Documento (pode ser PDF, comprovante, arquivo, etc.)';
        }
        mediaInfo += '\n\nSe o usuário mencionou pagamento, PIX, comprovante ou transferência, é MUITO PROVÁVEL que seja um comprovante de pagamento PIX.';
        mediaInfo += '\nVocê DEVE reconhecer isso e responder adequadamente (ex: "Obrigado por enviar o comprovante! Vou verificar o pagamento.")';
      }

      // Preparar contexto da mensagem para o AI usando o prompt personalizado + histórico
      const contextMessage = `${customAgent.systemPrompt}

Você está respondendo uma mensagem do WhatsApp de ${phoneNumber}.${conversationHistory}${mediaInfo}

Nova mensagem recebida: "${messageText || '[Sem texto - apenas mídia]'}";

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

      // Adicionar um pequeno delay para evitar problemas de timing
      await new Promise(resolve => setTimeout(resolve, 1000));

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

  private isDuplicateWebhook(webhookKey: string): boolean {
    const timestamp = this.processedWebhooks.get(webhookKey);
    if (!timestamp) return false;

    const isDuplicate = (Date.now() - timestamp) < this.WEBHOOK_DEDUP_WINDOW;
    if (isDuplicate) {
      console.log(`🚫 Webhook duplicado detectado para ${webhookKey}, ignorando para evitar processamento múltiplo`);
    }
    return isDuplicate;
  }

  private markWebhookAsProcessed(webhookKey: string): void {
    this.processedWebhooks.set(webhookKey, Date.now());

    // Limpar entradas antigas periodicamente para evitar memory leak
    if (this.processedWebhooks.size > 1000) {
      const cutoffTime = Date.now() - this.WEBHOOK_DEDUP_WINDOW;
      const entries = Array.from(this.processedWebhooks.entries());
      for (let i = 0; i < entries.length; i++) {
        const [key, timestamp] = entries[i];
        if (timestamp < cutoffTime) {
          this.processedWebhooks.delete(key);
        }
      }
      console.log(`🧹 Cache de webhooks limpo, ${this.processedWebhooks.size} entradas restantes`);
    }
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
      const messagesResult = await whatsappService.findMessages(instanceKey, remoteJid, 1, 20);
      
      if (messagesResult.success && messagesResult.data && Array.isArray(messagesResult.data)) {
        const messages = messagesResult.data;
        console.log(`📨 Encontradas ${messages.length} mensagens recentes para ${remoteJid}`);
        
        // Log detalhado das mensagens encontradas para depuração
        console.log(`🔍 Detalhamento das mensagens encontradas:`);
        messages.forEach((msg, index) => {
          console.log(`  ${index + 1}. fromMe: ${msg.key?.fromMe}, hasMessage: ${!!msg.message}, text: ${msg.message?.conversation?.substring(0, 50) || 'N/A'}...`);
        });
        
        // Processar apenas mensagens de entrada (não enviadas por nós)
        const incomingMessages = messages.filter(msg => !msg.key?.fromMe && msg.message);
        
        console.log(`📨 ${incomingMessages.length} mensagens de entrada encontradas após filtro`);
        
        if (incomingMessages.length === 0) {
          console.log(`⚠️ Nenhuma mensagem de entrada encontrada. Isso pode indicar que:`);
          console.log(`   1. A mensagem mais recente ainda não foi indexada pela API`);
          console.log(`   2. Todas as mensagens recentes são do sistema`);
          console.log(`   3. O webhook foi disparado antes da mensagem ser salva`);
          
          // Tentar buscar mensagens mais antigas ou usar abordagem alternativa
          console.log(`🔄 Tentando buscar mensagens de páginas anteriores...`);
          
          // Buscar mais algumas páginas para encontrar mensagens de entrada
          for (let page = 2; page <= 5; page++) {
            console.log(`🔍 Buscando página ${page}...`);
            const olderMessagesResult = await whatsappService.findMessages(instanceKey, remoteJid, page, 10);
            
            if (olderMessagesResult.success && olderMessagesResult.data && Array.isArray(olderMessagesResult.data)) {
              const olderMessages = olderMessagesResult.data;
              const olderIncomingMessages = olderMessages.filter(msg => !msg.key?.fromMe && msg.message);
              
              if (olderIncomingMessages.length > 0) {
                console.log(`✅ Encontradas ${olderIncomingMessages.length} mensagens de entrada na página ${page}`);
                
                // Processar a mensagem mais recente de entrada encontrada
                const mostRecentIncoming = olderIncomingMessages[0]; // Assume que já está ordenada
                console.log(`✅ Processando mensagem mais recente de entrada encontrada`);
                await this.handleIncomingMessage(instanceKey, mostRecentIncoming);
                return;
              }
            } else {
              console.log(`❌ Falha ao buscar página ${page}:`, olderMessagesResult.error);
              break;
            }
          }
          
          console.log(`❌ Nenhuma mensagem de entrada encontrada em nenhuma página`);
          return;
        }
        
        // Processar a mensagem mais recente de entrada
        const mostRecentIncoming = incomingMessages[0]; // Assume que já está ordenada por timestamp
        console.log(`✅ Processando mensagem mais recente de entrada`);
        await this.handleIncomingMessage(instanceKey, mostRecentIncoming);
        
      } else {
        console.log(`⚠️ Não foi possível buscar mensagens para ${remoteJid}:`, messagesResult.error);
      }
    } catch (error) {
      console.error(`❌ Erro ao buscar mensagens recentes para ${remoteJid}:`, error);
    }
  }

  private async handleEditClientCommand(instanceKey: string, phoneNumber: string, messageText: string): Promise<void> {
    try {
      console.log('📝 Processando comando de edição de cliente...');
      
      // Extrair parâmetros do comando
      // Formato esperado: /editarcliente email=novo@email.com nome=Novo Nome
      const params = this.extractCommandParameters(messageText);
      
      if (!params.email) {
        const response = '❌ Por favor, informe o email do cliente. Exemplo: /editarcliente email=novo@email.com';
        await whatsappService.sendMessage(instanceKey, phoneNumber, response);
        return;
      }

      // Encontrar a instância
      const instances = await storage.getWhatsappInstances();
      const instance = instances.find(inst => inst.instanceKey === instanceKey);
      
      if (!instance) {
        console.log(`❌ Instância ${instanceKey} não encontrada`);
        const response = '❌ Instância não encontrada';
        await whatsappService.sendMessage(instanceKey, phoneNumber, response);
        return;
      }

      // Buscar cliente pelo telefone
      const franchiseClients = await storage.getFranchiseClients(instance.franchiseId);
      const client = franchiseClients.find(c => c.phone === phoneNumber);
      
      if (!client) {
        console.log(`❌ Cliente não encontrado para o telefone: ${phoneNumber}`);
        const response = '❌ Cliente não encontrado. Por favor, envie uma mensagem primeiro para criar seu cadastro.';
        await whatsappService.sendMessage(instanceKey, phoneNumber, response);
        return;
      }

      console.log(`✅ Cliente encontrado: ${client.fullName} (${client.email})`);

      // Preparar dados para atualização
      const updateData: any = {};
      if (params.email) updateData.email = params.email;
      if (params.nome) updateData.fullName = params.nome;
      if (params.cpf) updateData.cpf = params.cpf;
      if (params.rua) updateData.street = params.rua;
      if (params.numero) updateData.number = params.numero;
      if (params.complemento) updateData.complement = params.complemento;
      if (params.bairro) updateData.neighborhood = params.bairro;
      if (params.cidade) updateData.city = params.cidade;
      if (params.estado) updateData.state = params.estado;
      if (params.cep) updateData.zipCode = params.cep;

      // Verificar se há algo para atualizar
      if (Object.keys(updateData).length === 0) {
        const response = '❌ Nenhum parâmetro válido informado. Use: /editarcliente email=novo@email.com nome=Novo Nome';
        await whatsappService.sendMessage(instanceKey, phoneNumber, response);
        return;
      }

      // Atualizar cliente
      const updatedClient = await storage.updateFranchiseClient(client.id, updateData);
      console.log(`✅ Cliente atualizado com sucesso: ${updatedClient.fullName}`);

      // Enviar confirmação
      const response = `✅ Cliente atualizado com sucesso!\n\n` +
        `Nome: ${updatedClient.fullName}\n` +
        `Email: ${updatedClient.email}\n` +
        `Telefone: ${updatedClient.phone}\n\n` +
        `Se precisar de mais alterações, use o comando /editarcliente novamente.`;
      
      await whatsappService.sendMessage(instanceKey, phoneNumber, response);
      
    } catch (error) {
      console.error('❌ Erro ao processar comando de edição de cliente:', error);
      const response = '❌ Ocorreu um erro ao processar seu comando. Por favor, tente novamente.';
      await whatsappService.sendMessage(instanceKey, phoneNumber, response);
    }
  }

  private extractCommandParameters(messageText: string): Record<string, string> {
    const params: Record<string, string> = {};
    
    // Remover o comando do início
    const commandText = messageText.replace(/^\/editarcliente\s*/i, '').trim();
    
    // Extrair parâmetros no formato chave=valor
    const paramMatches = commandText.match(/(\w+)=([^\s]+)/g);
    
    if (paramMatches) {
      paramMatches.forEach(match => {
        const [key, value] = match.split('=');
        params[key.toLowerCase()] = value;
      });
    }
    
    console.log('📋 Parâmetros extraídos:', params);
    return params;
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
      const convMessageId = messageObj.key?.id || `msg_${Date.now()}`;
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
        messageId: convMessageId,
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
