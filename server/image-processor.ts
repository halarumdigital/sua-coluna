import { openaiService } from "./openai";
import fs from "fs/promises";
import path from "path";

/**
 * Processador de imagens para treinamento de agentes de IA
 * Utiliza a API de visão do OpenAI para extrair descrições das imagens
 */
export class ImageProcessor {
  /**
   * Processa múltiplas imagens e extrai descrições usando visão computacional
   */
  static async processImageContents(
    imageData: Array<{ fileName: string; base64Data: string }>
  ): Promise<Array<{ fileName: string; description: string }>> {
    const processedImages = [];

    for (const image of imageData) {
      try {
        console.log(`🖼️  Processando imagem: ${image.fileName}`);

        const description = await this.extractImageDescription(image.base64Data, image.fileName);

        processedImages.push({
          fileName: image.fileName,
          description,
        });

        console.log(`✅ Imagem processada: ${image.fileName}`);
      } catch (error: any) {
        console.error(`❌ Erro ao processar ${image.fileName}:`, error.message);
        throw new Error(`Erro ao processar imagem ${image.fileName}: ${error.message}`);
      }
    }

    return processedImages;
  }

  /**
   * Extrai descrição de uma imagem usando OpenAI Vision API
   */
  static async extractImageDescription(base64Image: string, fileName: string): Promise<string> {
    try {
      // Detectar tipo MIME da imagem baseado na extensão
      const ext = path.extname(fileName).toLowerCase();
      let mimeType = 'image/jpeg';

      if (ext === '.png') {
        mimeType = 'image/png';
      } else if (ext === '.jpg' || ext === '.jpeg') {
        mimeType = 'image/jpeg';
      }

      // Usar OpenAI Vision API para descrever a imagem
      const description = await openaiService.analyzeImage(base64Image, mimeType);

      return description;
    } catch (error: any) {
      console.error('Erro ao extrair descrição da imagem:', error);
      throw new Error(`Falha ao processar imagem: ${error.message}`);
    }
  }

  /**
   * Aprimora o prompt do sistema com descrições de imagens
   */
  static enhancePromptWithImages(
    systemPrompt: string,
    imageDescriptions: Array<{ fileName: string; description: string }>
  ): string {
    if (imageDescriptions.length === 0) {
      return systemPrompt;
    }

    let enhancedPrompt = systemPrompt.trim();

    enhancedPrompt += '\n\n=== DOCUMENTOS DE TREINAMENTO - IMAGENS ===\n';
    enhancedPrompt += 'O agente foi treinado com as seguintes imagens e suas descrições:\n\n';

    imageDescriptions.forEach((img, index) => {
      enhancedPrompt += `IMAGEM ${index + 1}: ${img.fileName}\n`;
      enhancedPrompt += `DESCRIÇÃO: ${img.description}\n\n`;
    });

    enhancedPrompt += '=== FIM DOS DOCUMENTOS DE IMAGEM ===\n';
    enhancedPrompt += 'Use as informações dessas imagens como contexto adicional para fornecer respostas mais precisas e visuais.';

    return enhancedPrompt;
  }

  /**
   * Salva arquivo de imagem no sistema de arquivos local
   */
  static async saveImageFile(
    base64Data: string,
    fileName: string,
    userId: string
  ): Promise<string> {
    try {
      // Criar diretório para armazenar imagens do agente
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'agents', userId, 'images');
      await fs.mkdir(uploadDir, { recursive: true });

      // Gerar nome de arquivo único
      const timestamp = Date.now();
      const ext = path.extname(fileName);
      const baseName = path.basename(fileName, ext);
      const uniqueFileName = `${baseName}_${timestamp}${ext}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      // Converter base64 para buffer e salvar
      const buffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(filePath, buffer);

      console.log(`✅ Imagem salva em: ${filePath}`);

      // Retornar caminho relativo para acesso via URL
      return `/uploads/agents/${userId}/images/${uniqueFileName}`;
    } catch (error: any) {
      console.error('Erro ao salvar imagem:', error);
      throw new Error(`Falha ao salvar imagem: ${error.message}`);
    }
  }

  /**
   * Salva múltiplas imagens no sistema de arquivos
   */
  static async saveImageFiles(
    imageData: Array<{ fileName: string; base64Data: string }>,
    userId: string
  ): Promise<string[]> {
    const savedPaths = [];

    for (const image of imageData) {
      const savedPath = await this.saveImageFile(image.base64Data, image.fileName, userId);
      savedPaths.push(savedPath);
    }

    return savedPaths;
  }

  /**
   * Remove arquivo de imagem do sistema de arquivos
   */
  static async deleteImageFile(fileName: string, userId: string): Promise<void> {
    try {
      const filePath = path.join(
        process.cwd(),
        'public',
        'uploads',
        'agents',
        userId,
        'images',
        fileName
      );

      await fs.unlink(filePath);
      console.log(`✅ Imagem removida: ${filePath}`);
    } catch (error: any) {
      console.error('Erro ao remover imagem:', error);
      // Não lançar erro se arquivo não existir
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
