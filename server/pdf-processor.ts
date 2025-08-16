// Implementação temporária para processamento de PDFs
// TODO: Implementar extração real de PDF usando pdf-parse após resolver problemas de dependência

export class PDFProcessor {
  /**
   * Extrai texto de um buffer PDF (implementação temporária)
   */
  static async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    try {
      // Implementação temporária - simula extração de texto
      // Em produção, isso seria substituído por pdf-parse real
      const simulatedText = `
[DOCUMENTO PDF PROCESSADO]
Arquivo PDF carregado com sucesso (${buffer.length} bytes).

Este é um exemplo de texto extraído de um PDF de treinamento.
O agente pode aprender padrões específicos como:

- Comprovantes de PIX
- Notas fiscais
- Boletos bancários
- Recibos e faturas

O conteúdo real seria extraído usando biblioteca de processamento PDF.
      `.trim();
      
      return simulatedText;
    } catch (error) {
      console.error('Erro ao extrair texto do PDF:', error);
      throw new Error('Erro ao processar arquivo PDF');
    }
  }

  /**
   * Processa múltiplos PDFs a partir de dados base64
   */
  static async processPDFContents(pdfData: Array<{fileName: string, base64Data: string}>): Promise<Array<{fileName: string, content: string}>> {
    const results: Array<{fileName: string, content: string}> = [];
    
    for (const pdf of pdfData) {
      try {
        // Converter base64 para buffer
        const buffer = Buffer.from(pdf.base64Data, 'base64');
        
        // Extrair texto
        const content = await this.extractTextFromBuffer(buffer);
        
        results.push({
          fileName: pdf.fileName,
          content: content
        });
        
        console.log(`✅ PDF processado: ${pdf.fileName} (${content.length} caracteres)`);
      } catch (error) {
        console.error(`❌ Erro ao processar PDF ${pdf.fileName}:`, error);
        
        // Adicionar entrada de erro
        results.push({
          fileName: pdf.fileName,
          content: `[ERRO] Não foi possível extrair texto do arquivo ${pdf.fileName}`
        });
      }
    }
    
    return results;
  }

  /**
   * Cria prompt aprimorado com conteúdo dos PDFs
   */
  static enhancePromptWithPDFs(basePrompt: string, pdfContents: Array<{fileName: string, content: string}>): string {
    if (!pdfContents || pdfContents.length === 0) {
      return basePrompt;
    }

    let enhancedPrompt = basePrompt.trim();
    
    enhancedPrompt += '\n\n=== DOCUMENTOS DE TREINAMENTO ===\n';
    enhancedPrompt += 'O agente foi treinado com os seguintes documentos PDF. Use essas informações como base de conhecimento para responder às perguntas:\n\n';
    
    pdfContents.forEach((pdf, index) => {
      enhancedPrompt += `DOCUMENTO ${index + 1}: ${pdf.fileName}\n`;
      enhancedPrompt += `CONTEÚDO:\n${pdf.content}\n\n`;
      enhancedPrompt += '---\n\n';
    });
    
    enhancedPrompt += '=== FIM DOS DOCUMENTOS ===\n\n';
    enhancedPrompt += 'INSTRUÇÕES ESPECIAIS:\n';
    enhancedPrompt += '- Use SEMPRE as informações dos documentos acima como referência principal\n';
    enhancedPrompt += '- Quando o usuário enviar comprovantes, recibos ou documentos similares, compare com os padrões aprendidos nos documentos de treinamento\n';
    enhancedPrompt += '- Se reconhecer padrões similares (como comprovantes PIX, boletos, notas fiscais), informe o tipo de documento identificado\n';
    enhancedPrompt += '- Extraia informações relevantes dos documentos enviados pelo usuário baseando-se no conhecimento adquirido\n';
    enhancedPrompt += '- Seja preciso e contextualizado em suas respostas usando os documentos como base de conhecimento\n\n';
    
    return enhancedPrompt;
  }

  /**
   * Valida se o arquivo é um PDF válido
   */
  static validatePDFBuffer(buffer: Buffer): boolean {
    // Verificar assinatura PDF (%PDF)
    const pdfSignature = buffer.slice(0, 4).toString();
    return pdfSignature === '%PDF';
  }

  /**
   * Obter estatísticas do conteúdo extraído
   */
  static getContentStats(content: string): {
    charCount: number;
    wordCount: number;
    lineCount: number;
  } {
    return {
      charCount: content.length,
      wordCount: content.split(/\s+/).filter(word => word.length > 0).length,
      lineCount: content.split('\n').length
    };
  }
}