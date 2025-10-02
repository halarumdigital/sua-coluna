import { openaiService } from "./openai";
import fs from "fs/promises";
import path from "path";

/**
 * Estrutura de dados de um comprovante PIX extraído
 */
export interface PixReceipt {
  isPixReceipt: boolean;
  confidence: number; // 0-100
  transactionData?: {
    valor: string;
    data: string;
    hora: string;
    chavePixDestinatario?: string;
    nomeDestinatario?: string;
    instituicaoDestinatario?: string;
    chavePixPagador?: string;
    nomePagador?: string;
    instituicaoPagador?: string;
    idTransacao?: string;
    endToEndId?: string;
    descricao?: string;
  };
  rawText?: string;
  error?: string;
}

/**
 * Serviço de OCR e reconhecimento de comprovantes PIX
 */
export class PixOCRService {
  /**
   * Carrega exemplos de comprovantes PIX salvos anteriormente para aprendizado
   */
  static async loadPixExamples(userId?: string): Promise<string> {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pix-receipts');
      let examplesText = '';
      let exampleCount = 0;

      // Se userId fornecido, buscar exemplos desse usuário
      const searchDir = userId ? path.join(uploadDir, userId) : uploadDir;

      try {
        const files = await fs.readdir(searchDir, { withFileTypes: true });

        for (const file of files) {
          if (file.name.endsWith('.json') && exampleCount < 5) { // Limitar a 5 exemplos
            const filePath = path.join(searchDir, file.name);
            const content = await fs.readFile(filePath, 'utf-8');
            const pixData = JSON.parse(content);

            if (pixData.isPixReceipt && pixData.transactionData) {
              exampleCount++;
              examplesText += `\nEXEMPLO ${exampleCount} DE COMPROVANTE PIX VÁLIDO:\n`;
              examplesText += JSON.stringify(pixData.transactionData, null, 2) + '\n';
            }
          }
        }
      } catch (error) {
        // Diretório não existe ou está vazio
        console.log('Nenhum exemplo de comprovante PIX encontrado');
      }

      if (exampleCount > 0) {
        return `\n\n=== PADRÕES DE COMPROVANTES PIX ANTERIORES (${exampleCount} exemplos) ===\n${examplesText}\n=== Use esses exemplos como referência para o padrão de extração ===\n`;
      }

      return '';
    } catch (error) {
      console.error('Erro ao carregar exemplos:', error);
      return '';
    }
  }

  /**
   * Analisa uma imagem e verifica se é um comprovante PIX
   */
  static async analyzeImage(base64Image: string, mimeType: string = 'image/jpeg', userId?: string): Promise<PixReceipt> {
    try {
      console.log('🔍 Analisando imagem para detecção de comprovante PIX...');

      // Carregar exemplos anteriores para aprendizado
      const examples = await this.loadPixExamples(userId);

      const prompt = `Analise esta imagem e determine se é um comprovante de PIX (transferência bancária instantânea brasileira).${examples}

INSTRUÇÕES:
1. Verifique se a imagem contém elementos típicos de um comprovante PIX:
   - Logo PIX ou menção ao PIX
   - Valor da transação (R$)
   - Data e hora da transação
   - Informações do destinatário/beneficiário
   - Informações do pagador/remetente
   - ID da transação ou End-to-End ID
   - Chave PIX (e-mail, telefone, CPF/CNPJ, chave aleatória)

2. Se for um comprovante PIX, extraia TODOS os dados possíveis:
   - Valor (formato: R$ X.XXX,XX)
   - Data (formato: DD/MM/AAAA)
   - Hora (formato: HH:MM ou HH:MM:SS)
   - Nome do destinatário/beneficiário
   - Instituição do destinatário
   - Chave PIX do destinatário
   - Nome do pagador/remetente
   - Instituição do pagador
   - Chave PIX do pagador
   - ID da transação
   - End-to-End ID
   - Descrição/mensagem (se houver)

3. Retorne APENAS um objeto JSON válido no seguinte formato:
{
  "isPixReceipt": true/false,
  "confidence": 0-100,
  "transactionData": {
    "valor": "string",
    "data": "string",
    "hora": "string",
    "nomeDestinatario": "string",
    "instituicaoDestinatario": "string",
    "chavePixDestinatario": "string",
    "nomePagador": "string",
    "instituicaoPagador": "string",
    "chavePixPagador": "string",
    "idTransacao": "string",
    "endToEndId": "string",
    "descricao": "string"
  },
  "rawText": "todo o texto visível na imagem"
}

IMPORTANTE:
- Retorne APENAS o JSON, sem explicações adicionais
- Se não for um comprovante PIX, retorne isPixReceipt: false
- Inclua no rawText todo o texto visível na imagem
- Confidence deve refletir a certeza de que é um comprovante PIX válido`;

      const response = await openaiService.analyzeImageWithPrompt(base64Image, mimeType, prompt);

      // Parse da resposta
      let parsedResponse: PixReceipt;
      try {
        // Remover possíveis markdown code blocks
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
        }

        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('❌ Erro ao parsear resposta da IA:', parseError);
        console.log('Resposta original:', response);

        // Fallback: tentar extrair JSON da resposta
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          return {
            isPixReceipt: false,
            confidence: 0,
            error: 'Não foi possível processar a resposta da IA'
          };
        }
      }

      console.log('✅ Análise concluída:', {
        isPixReceipt: parsedResponse.isPixReceipt,
        confidence: parsedResponse.confidence
      });

      return parsedResponse;
    } catch (error: any) {
      console.error('❌ Erro ao analisar imagem:', error);
      return {
        isPixReceipt: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Converte PDF para imagem e analisa
   */
  static async analyzePDF(base64Pdf: string): Promise<PixReceipt> {
    try {
      console.log('📄 Convertendo PDF para análise...');

      // Para PDFs, vamos usar uma abordagem diferente:
      // 1. Tentar extrair imagem do PDF
      // 2. Ou usar OCR direto no PDF

      const prompt = `Analise este documento PDF e determine se é um comprovante de PIX.

INSTRUÇÕES:
1. Procure por elementos típicos de comprovante PIX:
   - Logo ou menção "PIX"
   - Valor em Reais (R$)
   - Data e hora
   - Dados do destinatário e pagador
   - ID da transação

2. Extraia todos os dados disponíveis no formato JSON:
{
  "isPixReceipt": true/false,
  "confidence": 0-100,
  "transactionData": {
    "valor": "string",
    "data": "string",
    "hora": "string",
    "nomeDestinatario": "string",
    "instituicaoDestinatario": "string",
    "chavePixDestinatario": "string",
    "nomePagador": "string",
    "instituicaoPagador": "string",
    "chavePixPagador": "string",
    "idTransacao": "string",
    "endToEndId": "string",
    "descricao": "string"
  },
  "rawText": "todo o texto do documento"
}

Retorne APENAS o JSON, sem explicações.`;

      // Como o GPT-4o Vision não processa PDFs diretamente,
      // vamos informar que é necessário converter para imagem primeiro
      console.log('⚠️  PDFs devem ser convertidos para imagem no frontend antes do envio');

      return {
        isPixReceipt: false,
        confidence: 0,
        error: 'PDF deve ser convertido para imagem antes do processamento'
      };
    } catch (error: any) {
      console.error('❌ Erro ao analisar PDF:', error);
      return {
        isPixReceipt: false,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Valida os dados extraídos do comprovante PIX
   */
  static validatePixData(pixData: PixReceipt): {
    isValid: boolean;
    missingFields: string[];
    warnings: string[];
  } {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!pixData.isPixReceipt) {
      return {
        isValid: false,
        missingFields: ['Não é um comprovante PIX'],
        warnings: []
      };
    }

    // Campos obrigatórios mínimos
    if (!pixData.transactionData?.valor) {
      missingFields.push('Valor da transação');
    }

    if (!pixData.transactionData?.data) {
      missingFields.push('Data da transação');
    }

    if (!pixData.transactionData?.nomeDestinatario && !pixData.transactionData?.chavePixDestinatario) {
      missingFields.push('Informações do destinatário');
    }

    // Avisos para campos opcionais importantes
    if (!pixData.transactionData?.idTransacao && !pixData.transactionData?.endToEndId) {
      warnings.push('ID da transação não encontrado');
    }

    if (!pixData.transactionData?.nomePagador) {
      warnings.push('Nome do pagador não encontrado');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      warnings
    };
  }

  /**
   * Formata os dados do PIX para exibição
   */
  static formatPixDataForDisplay(pixData: PixReceipt): string {
    if (!pixData.isPixReceipt || !pixData.transactionData) {
      return 'Não é um comprovante PIX válido';
    }

    const data = pixData.transactionData;
    let formattedText = '🔷 COMPROVANTE PIX DETECTADO\n\n';

    if (data.valor) {
      formattedText += `💰 Valor: ${data.valor}\n`;
    }

    if (data.data) {
      formattedText += `📅 Data: ${data.data}`;
      if (data.hora) {
        formattedText += ` às ${data.hora}`;
      }
      formattedText += '\n';
    }

    formattedText += '\n👤 DESTINATÁRIO:\n';
    if (data.nomeDestinatario) {
      formattedText += `Nome: ${data.nomeDestinatario}\n`;
    }
    if (data.instituicaoDestinatario) {
      formattedText += `Instituição: ${data.instituicaoDestinatario}\n`;
    }
    if (data.chavePixDestinatario) {
      formattedText += `Chave PIX: ${data.chavePixDestinatario}\n`;
    }

    if (data.nomePagador || data.instituicaoPagador || data.chavePixPagador) {
      formattedText += '\n👤 PAGADOR:\n';
      if (data.nomePagador) {
        formattedText += `Nome: ${data.nomePagador}\n`;
      }
      if (data.instituicaoPagador) {
        formattedText += `Instituição: ${data.instituicaoPagador}\n`;
      }
      if (data.chavePixPagador) {
        formattedText += `Chave PIX: ${data.chavePixPagador}\n`;
      }
    }

    if (data.idTransacao) {
      formattedText += `\n🔖 ID Transação: ${data.idTransacao}\n`;
    }

    if (data.endToEndId) {
      formattedText += `🔖 End-to-End ID: ${data.endToEndId}\n`;
    }

    if (data.descricao) {
      formattedText += `\n📝 Descrição: ${data.descricao}\n`;
    }

    formattedText += `\n✅ Confiança: ${pixData.confidence}%`;

    return formattedText;
  }

  /**
   * Salva o comprovante PIX processado para auditoria
   */
  static async savePixReceipt(
    pixData: PixReceipt,
    userId: string,
    conversationId: string,
    imageBase64?: string
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pix-receipts', userId);
      await fs.mkdir(uploadDir, { recursive: true });

      const fileName = `pix_${conversationId}_${timestamp}.json`;
      const filePath = path.join(uploadDir, fileName);

      const receiptData = {
        ...pixData,
        userId,
        conversationId,
        processedAt: new Date().toISOString(),
        hasImage: !!imageBase64
      };

      await fs.writeFile(filePath, JSON.stringify(receiptData, null, 2));

      // Salvar imagem se fornecida
      if (imageBase64) {
        const imageFileName = `pix_${conversationId}_${timestamp}.jpg`;
        const imageFilePath = path.join(uploadDir, imageFileName);
        const buffer = Buffer.from(imageBase64, 'base64');
        await fs.writeFile(imageFilePath, buffer);
      }

      console.log(`✅ Comprovante PIX salvo: ${filePath}`);
      return filePath;
    } catch (error: any) {
      console.error('❌ Erro ao salvar comprovante PIX:', error);
      throw error;
    }
  }
}
