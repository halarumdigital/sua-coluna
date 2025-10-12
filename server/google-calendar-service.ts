import { google } from 'googleapis';
import { storage } from './storage';

/**
 * Serviço para gerenciar eventos do Google Calendar
 */
export class GoogleCalendarService {
  /**
   * Cria um evento no Google Calendar
   */
  async createEvent(
    franchiseId: string,
    eventData: {
      title: string;
      description?: string;
      location?: string;
      startDateTime: Date;
      endDateTime: Date;
      attendeeEmail?: string;
      attendeeName?: string;
    }
  ): Promise<{
    success: boolean;
    eventId?: string;
    eventLink?: string;
    error?: string;
  }> {
    try {
      console.log(`📅 Criando evento no Google Calendar para franquia: ${franchiseId}`);

      // Buscar configurações do Google Calendar
      const settings = await storage.getGoogleCalendarSettings(franchiseId);

      if (!settings) {
        console.log('❌ Configurações do Google Calendar não encontradas');
        return {
          success: false,
          error: 'Configurações do Google Calendar não encontradas'
        };
      }

      if (!settings.isEnabled || !settings.isConnected) {
        console.log('❌ Google Calendar não está habilitado ou conectado');
        return {
          success: false,
          error: 'Google Calendar não está habilitado ou conectado'
        };
      }

      if (!settings.refreshToken) {
        console.log('❌ Refresh token não encontrado');
        return {
          success: false,
          error: 'Refresh token não encontrado. Reconecte sua conta do Google.'
        };
      }

      // Configurar cliente OAuth2
      const oauth2Client = new google.auth.OAuth2(
        settings.clientId,
        settings.clientSecret,
        'urn:ietf:wg:oauth:2.0:oob'
      );

      oauth2Client.setCredentials({
        refresh_token: settings.refreshToken
      });

      // Configurar cliente do Calendar
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Preparar dados do evento (SEM Google Meet)
      const event: any = {
        summary: eventData.title || settings.eventTitle,
        description: eventData.description || settings.eventDescription,
        location: eventData.location || settings.eventLocation,
        start: {
          dateTime: eventData.startDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: eventData.endDateTime.toISOString(),
          timeZone: 'America/Sao_Paulo',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 dia antes
            { method: 'popup', minutes: 60 }, // 1 hora antes
          ],
        },
        // Desabilitar Google Meet
        conferenceData: null,
      };

      // Adicionar participante se fornecido
      if (eventData.attendeeEmail) {
        event.attendees = [
          {
            email: eventData.attendeeEmail,
            displayName: eventData.attendeeName,
          }
        ];
      }

      console.log('📅 Dados do evento:', {
        summary: event.summary,
        start: event.start.dateTime,
        end: event.end.dateTime,
        attendees: event.attendees
      });

      // Criar evento
      const response = await calendar.events.insert({
        calendarId: settings.calendarId || 'primary',
        requestBody: event,
        sendUpdates: eventData.attendeeEmail ? 'all' : 'none', // Enviar convite se tiver email
      });

      console.log('✅ Evento criado com sucesso:', response.data.id);

      return {
        success: true,
        eventId: response.data.id || undefined,
        eventLink: response.data.htmlLink || undefined
      };

    } catch (error: any) {
      console.error('❌ Erro ao criar evento no Google Calendar:', error);

      // Tratar erros específicos do Google
      if (error.code === 401) {
        return {
          success: false,
          error: 'Token expirado. Reconecte sua conta do Google Calendar.'
        };
      }

      if (error.code === 403) {
        return {
          success: false,
          error: 'Sem permissão para acessar o calendário. Verifique as configurações.'
        };
      }

      return {
        success: false,
        error: error.message || 'Erro ao criar evento no Google Calendar'
      };
    }
  }

  /**
   * Extrai data e hora de um texto usando o agente de IA
   */
  async extractDateTimeFromContext(
    conversationContext: string,
    pixData?: any
  ): Promise<{
    success: boolean;
    dateTime?: Date;
    patientName?: string;
    error?: string;
  }> {
    try {
      console.log('🧠 Extraindo data/hora do contexto da conversa...');

      const { openaiService } = await import('./openai');
      const aiSettings = await storage.getAISettings();

      if (!aiSettings.chatGptApiKey) {
        return {
          success: false,
          error: 'API key do ChatGPT não configurada'
        };
      }

      const prompt = `Analise a conversa abaixo e extraia APENAS as seguintes informações:
1. Data e hora do agendamento mencionado pelo paciente
2. Nome do paciente que ELE MESMO forneceu na conversa

CONVERSA:
${conversationContext}

${pixData ? `\nCOMPROVANTE PIX RECEBIDO:
- Valor: ${pixData.valor || 'N/A'}
- Data do pagamento: ${pixData.data || 'N/A'}
- Hora do pagamento: ${pixData.hora || 'N/A'}
` : ''}

INSTRUÇÕES IMPORTANTES:
- Procure na conversa quando o paciente mencionou a data/hora desejada para o agendamento
- Se não encontrar data/hora na conversa, retorne null
- Para o nome do paciente: use APENAS o nome que o PACIENTE forneceu na conversa
- NUNCA use o nome do pagador do PIX, apenas o nome que o paciente disse na conversa
- Se o paciente não forneceu o nome, retorne null
- Use a data ATUAL como referência: ${new Date().toISOString()}

Retorne APENAS um JSON no formato:
{
  "dateTime": "YYYY-MM-DDTHH:MM:SS" ou null,
  "patientName": "string" ou null,
  "confidence": 0-100
}`;

      const response = await openaiService.chat(prompt, {
        chatGptApiKey: aiSettings.chatGptApiKey,
        model: aiSettings.model || 'gpt-3.5-turbo',
        systemPrompt: 'Você é um assistente especializado em extrair informações de agendamentos de consultas.',
        maxTokens: 500,
        temperature: 0.3
      });

      if (!response.success || !response.response) {
        return {
          success: false,
          error: 'Falha ao processar contexto com IA'
        };
      }

      // Parse da resposta
      let parsedResponse: any;
      try {
        let cleanedResponse = response.response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
        }

        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta da IA:', parseError);
        return {
          success: false,
          error: 'Não foi possível extrair data/hora da conversa'
        };
      }

      if (!parsedResponse.dateTime || parsedResponse.confidence < 50) {
        return {
          success: false,
          error: 'Data/hora não encontrada ou confiança baixa'
        };
      }

      const dateTime = new Date(parsedResponse.dateTime);
      if (isNaN(dateTime.getTime())) {
        return {
          success: false,
          error: 'Data/hora inválida'
        };
      }

      console.log('✅ Data/hora extraída:', {
        dateTime: dateTime.toISOString(),
        patientName: parsedResponse.patientName,
        confidence: parsedResponse.confidence
      });

      return {
        success: true,
        dateTime,
        patientName: parsedResponse.patientName || undefined
      };

    } catch (error: any) {
      console.error('❌ Erro ao extrair data/hora:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Processa comprovante PIX e cria agendamento automaticamente
   */
  async processPixAndSchedule(
    franchiseId: string,
    conversationId: string,
    pixData: any,
    phoneNumber: string
  ): Promise<{
    success: boolean;
    eventId?: string;
    eventLink?: string;
    message?: string;
    error?: string;
  }> {
    try {
      console.log('🎯 Processando PIX e criando agendamento automático...');

      // Buscar contexto da conversa completo (últimas 50 mensagens)
      const conversationContext = await storage.getAgentContext(conversationId, null, 50);

      // Montar texto do contexto
      const contextText = conversationContext
        .sort((a, b) => a.messageOrder - b.messageOrder)
        .map(ctx => `${ctx.messageRole === 'user' ? 'Paciente' : 'Assistente'}: ${ctx.messageText}`)
        .join('\n');

      // Extrair data/hora e nome do paciente do contexto
      const extractedData = await this.extractDateTimeFromContext(contextText, pixData.transactionData);

      if (!extractedData.success || !extractedData.dateTime) {
        console.log('⚠️ Não foi possível extrair data/hora da conversa');
        return {
          success: false,
          error: 'Não foi possível identificar a data/hora do agendamento na conversa'
        };
      }

      // Nome do paciente: PRIORIZAR o nome da conversa, NÃO usar o nome do PIX
      const patientName = extractedData.patientName ||
                         `Paciente ${phoneNumber}`;

      console.log('👤 Nome do paciente identificado:', patientName);
      console.log('⚠️ Nome do PIX NÃO será usado:', pixData.transactionData?.nomePagador);

      // Buscar configurações do calendário para duração padrão
      const settings = await storage.getGoogleCalendarSettings(franchiseId);
      const durationMinutes = settings?.defaultEventDuration || 60;

      // Calcular data/hora de fim
      const endDateTime = new Date(extractedData.dateTime.getTime() + durationMinutes * 60 * 1000);

      // Buscar cliente para pegar email (se disponível)
      const clients = await storage.getFranchiseClients(franchiseId);
      const client = clients.find(c => c.phone === phoneNumber);

      // Criar evento no Google Calendar
      const result = await this.createEvent(franchiseId, {
        title: `Consulta - ${patientName}`,
        description: `Consulta agendada via WhatsApp\n\nPaciente: ${patientName}\nTelefone: ${phoneNumber}\n\nPagamento confirmado via PIX:\n- Valor: ${pixData.transactionData?.valor || 'N/A'}\n- Data: ${pixData.transactionData?.data || 'N/A'}\n- Hora: ${pixData.transactionData?.hora || 'N/A'}`,
        startDateTime: extractedData.dateTime,
        endDateTime: endDateTime,
        attendeeEmail: client?.email,
        attendeeName: patientName
      });

      if (result.success) {
        console.log('✅ Agendamento criado com sucesso!');
        return {
          success: true,
          eventId: result.eventId,
          eventLink: result.eventLink,
          // Mensagem SEM link do Google Meet
          message: `✅ Agendamento criado com sucesso!\n\n📅 Data: ${extractedData.dateTime.toLocaleDateString('pt-BR')}\n🕐 Horário: ${extractedData.dateTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n👤 Paciente: ${patientName}`
        };
      }

      return result;

    } catch (error: any) {
      console.error('❌ Erro ao processar PIX e criar agendamento:', error);
      return {
        success: false,
        error: error.message || 'Erro ao processar agendamento'
      };
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
