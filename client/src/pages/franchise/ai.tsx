import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Bot, Plus, Edit, Trash2, Loader2 } from "lucide-react";

interface User {
  role: string;
  [key: string]: any;
}

export default function ClientAIPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const { user } = useAuth();

  // Early return se não deveria renderizar esta página
  if (location !== '/client/ai' || !user || (user as User).role === 'super_root' || ((user as User).role !== 'client' && (user as User).role !== 'franchise')) {
    return null;
  }

  // Estados para agentes personalizados
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [agentForm, setAgentForm] = useState({
    name: "",
    description: "",
    systemPrompt: "",
    temperature: 0.7,
    maxTokens: 1000,
    isActive: true
  });

  // Estados para gerenciamento de PDFs
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [pdfContents, setPdfContents] = useState<Array<{fileName: string, content: string}>>([]);

  // Determinar se deve executar a query
  const shouldFetchAgents = location === '/client/ai' && 
                           typeof window !== 'undefined' && 
                           user && (user as User).role !== 'super_root' &&
                           ((user as User).role === 'client' || (user as User).role === 'franchise');

  // Debug logs
  console.log('Debug ClientAIPage:', {
    location,
    userRole: user ? (user as User).role : 'undefined',
    shouldFetchAgents,
    windowDefined: typeof window !== 'undefined'
  });

  // Fetch custom agents
  const { data: agents, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ["/api/franchise/custom-agents"],
    queryFn: async () => {
      console.log('Query executando, shouldFetchAgents:', shouldFetchAgents);
      
      if (!shouldFetchAgents) {
        console.log('Query cancelada por shouldFetchAgents = false');
        return [];
      }
      
      console.log('Fazendo requisição para /api/franchise/custom-agents');
      const response = await fetch("/api/franchise/custom-agents", {
        credentials: "include",
      });
      
      console.log('Resposta recebida:', response.status, response.statusText);
      
      if (!response.ok) {
        // Se for 404, retornar array vazio (API não implementada ainda)
        if (response.status === 404) {
          console.warn('API /api/franchise/custom-agents não encontrada, retornando array vazio');
          return [];
        }
        // Se for 403, usuário não tem permissão (provavelmente super_root)
        if (response.status === 403) {
          console.warn('Usuário não tem permissão para acessar custom-agents');
          return [];
        }
        throw new Error(`Erro ao buscar agentes: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Dados recebidos:', data);
      return data;
    },
    // Retry menos vezes para APIs que podem não existir
    retry: 1,
    enabled: shouldFetchAgents,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });

  // Create/Update custom agent mutation
  const saveAgentMutation = useMutation({
    mutationFn: async (agentData: any) => {
      const url = editingAgent 
        ? `/api/franchise/custom-agents/${editingAgent.id}`
        : "/api/franchise/custom-agents";
      const method = editingAgent ? "PUT" : "POST";

      console.log('Sending request to:', url, 'with method:', method);
      console.log('Agent data:', agentData);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(agentData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        let errorMessage = "Erro ao salvar agente";
        
        // Verificar o content-type para decidir como ler a resposta
        const contentType = response.headers.get('content-type');
        
        try {
          if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            errorMessage = error.message || `Erro HTTP ${response.status}`;
          } else {
            const textError = await response.text();
            console.error('Response text:', textError);
            
            if (response.status === 404) {
              errorMessage = `API não encontrada. A rota ${url} não está implementada no backend.`;
            } else if (textError.includes('<html>')) {
              errorMessage = `Erro do servidor (${response.status}). Verifique os logs do backend.`;
            } else {
              errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
            }
          }
        } catch (readError) {
          console.error('Erro ao ler resposta:', readError);
          errorMessage = `Erro HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: editingAgent ? "Agente atualizado com sucesso!" : "Agente criado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/franchise/custom-agents"] });
      setIsCreatingAgent(false);
      setEditingAgent(null);
      setAgentForm({
        name: "",
        description: "",
        systemPrompt: "",
        temperature: 0.7,
        maxTokens: 1000,
        isActive: true
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete custom agent mutation
  const deleteAgentMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const response = await fetch(`/api/franchise/custom-agents/${agentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao deletar agente");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Agente deletado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/franchise/custom-agents"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Funções para gerenciar agentes personalizados
  const handleCreateAgent = () => {
    setIsCreatingAgent(true);
    setEditingAgent(null);
    setAgentForm({
      name: "",
      description: "",
      systemPrompt: "",
      temperature: 0.7,
      maxTokens: 1000,
      isActive: true
    });
    // Limpar PDFs ao criar novo agente
    clearPDFFiles();
  };

  const handleEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setIsCreatingAgent(true);
    setAgentForm({
      name: agent.name,
      description: agent.description,
      systemPrompt: agent.systemPrompt,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      isActive: agent.isActive
    });
    
    // Carregar PDFs existentes se houver
    if (agent.pdfFiles && agent.pdfFiles.length > 0) {
      // Simular arquivos para exibição (não podemos recriar File objects)
      setPdfFiles(agent.pdfFiles.map((fileName: string) => ({
        name: fileName,
        size: 0,
        type: 'application/pdf'
      } as File)));
      setPdfContents(agent.pdfContents || []);
    } else {
      clearPDFFiles();
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm("Tem certeza que deseja deletar este agente?")) {
      deleteAgentMutation.mutate(agentId);
    }
  };

  const handleSaveAgent = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Criar prompt aprimorado com PDFs se houver
    let enhancedPrompt = agentForm.systemPrompt.trim();
    
    if (pdfContents.length > 0) {
      enhancedPrompt += '\n\n=== DOCUMENTOS DE TREINAMENTO ===\n';
      enhancedPrompt += 'O agente deve usar as seguintes informações dos documentos PDF para responder às perguntas:\n\n';
      
      pdfContents.forEach((pdf, index) => {
        enhancedPrompt += `DOCUMENTO ${index + 1}: ${pdf.fileName}\n`;
        enhancedPrompt += `${pdf.content}\n\n`;
      });
      
      enhancedPrompt += '=== FIM DOS DOCUMENTOS ===\n';
      enhancedPrompt += 'Use sempre essas informações como referência para fornecer respostas precisas e contextualizadas.';
    }
    
    // Garantir que os dados estejam no formato correto conforme o schema
    const validatedData = {
      name: agentForm.name.trim(),
      description: agentForm.description?.trim() || "",
      systemPrompt: agentForm.systemPrompt.trim(),
      temperature: Number(agentForm.temperature),
      maxTokens: Number(agentForm.maxTokens),
      isActive: Boolean(agentForm.isActive),
      pdfFiles: pdfFiles.map(file => file.name), // Salvar nomes dos arquivos PDF
      pdfContents: pdfContents // Salvar conteúdo dos PDFs
    };
    
    // Validação básica antes de enviar
    if (!validatedData.name) {
      toast({
        title: "Erro",
        description: "Nome do agente é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    if (!validatedData.systemPrompt) {
      toast({
        title: "Erro",
        description: "Prompt do sistema é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    if (validatedData.temperature < 0 || validatedData.temperature > 2) {
      toast({
        title: "Erro",
        description: "Temperatura deve estar entre 0 e 2",
        variant: "destructive",
      });
      return;
    }
    
    if (validatedData.maxTokens < 1 || validatedData.maxTokens > 4000) {
      toast({
        title: "Erro",
        description: "Tokens máximos deve estar entre 1 e 4000",
        variant: "destructive",
      });
      return;
    }
    
    saveAgentMutation.mutate(validatedData);
  };

  const handleAgentFormChange = (field: string, value: any) => {
    setAgentForm(prev => {
      const newForm = { ...prev };
      
      // Garantir tipos corretos para campos específicos
      switch (field) {
        case 'temperature':
          newForm.temperature = Number(value);
          break;
        case 'maxTokens':
          newForm.maxTokens = Number(value);
          break;
        case 'isActive':
          newForm.isActive = Boolean(value);
          break;
        case 'name':
        case 'description':
        case 'systemPrompt':
          (newForm as any)[field] = value;
          break;
      }
      
      return newForm;
    });
  };

  // Funções para gerenciamento de PDFs
  const handlePDFUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validar arquivos
    const validFiles = files.filter(file => {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Erro",
          description: `Arquivo "${file.name}" não é um PDF válido`,
          variant: "destructive",
        });
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "Erro",
          description: `Arquivo "${file.name}" excede o limite de 10MB`,
          variant: "destructive",
        });
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length === 0) {
      return;
    }
    
    // Adicionar arquivos válidos
    setPdfFiles(prev => [...prev, ...validFiles]);
    
    // Processar PDFs automaticamente
    processPDFFiles(validFiles);
  };

  const removePDFFile = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
    setPdfContents(prev => prev.filter((_, i) => i !== index));
  };

  const clearPDFFiles = () => {
    setPdfFiles([]);
    setPdfContents([]);
    
    // Limpar input
    const input = document.getElementById('pdfFiles') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  };

  const processPDFFiles = async (files: File[]) => {
    try {
      // Preparar dados para enviar ao backend
      const pdfData = [];
      
      for (const file of files) {
        const base64Data = await extractPDFContent(file);
        pdfData.push({
          fileName: file.name,
          base64Data: base64Data
        });
      }
      
      // Enviar para o backend para processamento
      const response = await fetch('/api/franchise/process-pdfs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ pdfData })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao processar PDFs');
      }
      
      const result = await response.json();
      
      // Adicionar conteúdos processados
      setPdfContents(prev => [...prev, ...result.processedContents]);
      
      toast({
        title: "Sucesso",
        description: result.message,
        variant: "default",
      });
      
      console.log('✅ PDFs processados:', result.stats);
      
    } catch (error: any) {
      console.error('Erro ao processar PDFs:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar arquivos PDF.",
        variant: "destructive",
      });
    }
  };

  const extractPDFContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async function(e) {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error('Erro ao ler arquivo');
          }
          
          // Converter para base64 para enviar ao backend
          const base64 = btoa(
            new Uint8Array(arrayBuffer)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );
          
          resolve(base64);
          
        } catch (error) {
          console.error('Erro ao processar PDF:', error);
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error(`Erro ao ler arquivo ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  };

  if (agentsLoading) {
    return (
      <Layout title="Agentes de IA">
        <div className="space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agentes de IA">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Bot className="w-6 h-6" />
              Agentes Personalizados
            </h2>
            <p className="text-gray-600">
              Crie e gerencie agentes de IA com prompts específicos para suas necessidades
            </p>
          </div>
          <Button onClick={handleCreateAgent} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Agente
          </Button>
        </div>

        {/* Aviso se a API não estiver implementada */}
        {agentsError && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-orange-800">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-medium">Backend API Necessária</h3>
                  <p className="text-sm mt-1">
                    A rota <code className="bg-orange-100 px-1 rounded">/api/franchise/custom-agents</code> não foi encontrada. 
                    É necessário implementar as rotas da API no backend para que esta funcionalidade funcione.
                  </p>
                  <p className="text-xs mt-2 text-orange-600">
                    Status: {agentsError.message}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formulário de criação/edição */}
        {isCreatingAgent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                {editingAgent ? "Editar Agente" : "Criar Novo Agente"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAgent} className="space-y-4">
                <div>
                  <Label htmlFor="agentName">Nome do Agente</Label>
                  <Input
                    id="agentName"
                    value={agentForm.name}
                    onChange={(e) => handleAgentFormChange("name", e.target.value)}
                    placeholder="Ex: Assistente de Vendas"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="agentDescription">Descrição</Label>
                  <Input
                    id="agentDescription"
                    value={agentForm.description}
                    onChange={(e) => handleAgentFormChange("description", e.target.value)}
                    placeholder="Breve descrição do propósito do agente"
                  />
                </div>

                <div>
                  <Label htmlFor="agentPrompt">Prompt do Sistema</Label>
                  <Textarea
                    id="agentPrompt"
                    rows={6}
                    value={agentForm.systemPrompt}
                    onChange={(e) => handleAgentFormChange("systemPrompt", e.target.value)}
                    placeholder="Defina o comportamento e personalidade do agente..."
                    required
                  />
                </div>

                {/* Seção de Upload de PDFs para Treinamento */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-xs font-bold">PDF</span>
                    </div>
                    <Label className="text-base font-medium">Documentos PDF para Treinamento</Label>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Envie arquivos PDF para treinar o agente com informações específicas sobre sua função. 
                    O conteúdo será extraído e incorporado ao contexto do agente.
                  </p>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors bg-gray-50">
                    <div className="cursor-pointer" onClick={() => document.getElementById('pdfFiles')?.click()}>
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="text-blue-600 font-medium">Clique para selecionar</span> ou arraste arquivos PDF aqui
                      </p>
                      <p className="text-xs text-gray-500">Máximo 10MB por arquivo • Suporta múltiplos arquivos</p>
                      <input 
                        type="file" 
                        id="pdfFiles" 
                        multiple 
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => handlePDFUpload(e)}
                      />
                    </div>
                  </div>
                  
                  {/* Preview dos arquivos */}
                  {pdfFiles.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Arquivos selecionados:</h4>
                      <div className="space-y-2">
                        {pdfFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-red-600 text-xs font-bold">PDF</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-700">{file.name}</p>
                                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePDFFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={clearPDFFiles}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Limpar Todos
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="agentTemperature">Temperatura: {agentForm.temperature}</Label>
                    <Slider
                      id="agentTemperature"
                      min={0}
                      max={2}
                      step={0.1}
                      value={[agentForm.temperature]}
                      onValueChange={(value) => handleAgentFormChange("temperature", value[0])}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Mais Focado (0)</span>
                      <span>Mais Criativo (2)</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="agentMaxTokens">Tokens Máximos</Label>
                    <Input
                      id="agentMaxTokens"
                      type="number"
                      min="1"
                      max="4000"
                      value={agentForm.maxTokens}
                      onChange={(e) => handleAgentFormChange("maxTokens", parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="agentActive"
                      checked={agentForm.isActive}
                      onChange={(e) => handleAgentFormChange("isActive", e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="agentActive">Agente ativo</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreatingAgent(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveAgentMutation.isPending}
                    >
                      {saveAgentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Bot className="w-4 h-4 mr-2" />
                      )}
                      {editingAgent ? "Atualizar" : "Criar"} Agente
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de agentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(() => {
            console.log('Renderização - agentsLoading:', agentsLoading);
            console.log('Renderização - agents:', agents);
            console.log('Renderização - agentsError:', agentsError);
            return null;
          })()}
          {agentsLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : agents && agents.length > 0 ? (
            agents.map((agent: any) => (
              <Card key={agent.id} className="relative hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-purple-600" />
                      <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditAgent(agent)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {agent.description && (
                    <p className="text-sm text-gray-600 mb-3">{agent.description}</p>
                  )}
                  
                  <div className="space-y-2 text-xs text-gray-500 mb-4">
                    <div className="flex justify-between">
                      <span>Temperatura:</span>
                      <span className="font-medium">{agent.temperature}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Tokens:</span>
                      <span className="font-medium">{agent.maxTokens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${agent.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {agent.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500 line-clamp-3">
                      {agent.systemPrompt}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Nenhum agente personalizado
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Crie seu primeiro agente com prompt personalizado
                  </p>
                  <Button onClick={handleCreateAgent}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Agente
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}