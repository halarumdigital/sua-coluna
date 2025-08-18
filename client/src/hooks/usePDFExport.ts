import { useState } from 'react';
import { useToast } from './use-toast';

interface PDFExportOptions {
  element: HTMLElement;
  filename: string;
}

// Função para carregar bibliotecas dinamicamente
const loadPDFLibraries = async () => {
  try {
    // Usar Function constructor para evitar que o Rollup detecte as importações
    const importJsPDF = new Function('return import("jspdf")');
    const importHtml2Canvas = new Function('return import("html2canvas")');
    
    const [jsPDFModule, html2canvasModule] = await Promise.all([
      importJsPDF(),
      importHtml2Canvas()
    ]);
    
    return {
      jsPDF: jsPDFModule.default,
      html2canvas: html2canvasModule.default
    };
  } catch (error) {
    console.error('Erro ao carregar bibliotecas PDF:', error);
    return null;
  }
};

export const usePDFExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToPDF = async ({ element, filename }: PDFExportOptions) => {
    if (isExporting) return;
    
    setIsExporting(true);
    
    try {
      toast({
        title: "Exportando PDF",
        description: "Carregando bibliotecas...",
      });

      const libraries = await loadPDFLibraries();
      
      if (!libraries) {
        throw new Error('Bibliotecas de PDF não disponíveis');
      }

      const { jsPDF, html2canvas } = libraries;

      toast({
        title: "Exportando PDF",
        description: "Gerando arquivo PDF...",
      });

      // Capturar o conteúdo visual do elemento
      const canvas = await html2canvas(element, {
        scale: 2, // Melhor qualidade
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight,
      });

      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calcular dimensões para caber na página A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Margem superior
      
      // Adicionar a imagem ao PDF
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Se a imagem for muito grande, dividir em páginas
      if (imgHeight * ratio > pdfHeight - 20) {
        let remainingHeight = imgHeight * ratio - (pdfHeight - 20);
        let pages = Math.ceil(remainingHeight / (pdfHeight - 20));
        
        for (let i = 1; i <= pages; i++) {
          pdf.addPage();
          const startY = -((pdfHeight - 20) * i);
          pdf.addImage(imgData, 'PNG', imgX, startY, imgWidth * ratio, imgHeight * ratio);
        }
      }
      
      // Salvar o PDF
      pdf.save(filename);
      
      toast({
        title: "PDF Exportado",
        description: "Arquivo exportado com sucesso!",
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar arquivo como PDF",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportToPDF,
    isExporting
  };
};