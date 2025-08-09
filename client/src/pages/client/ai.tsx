import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Bot, Brain, Thermometer, Hash, MessageSquare, Send, Loader2, Settings, CheckCircle } from "lucide-react";

interface AISettings {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export default function ClientAIPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<AISettings>({
    systemPrompt: "",
    maxTokens: undefined,
    temperature: undefined,
  });

  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [isTestingAgent, setIsTestingAgent] = useState(false);

  // Fetch current AI settings from admin
  const { data: adminSettings, isLoading } = useQuery({
    queryKey: ["/api/admin/ai-settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/ai-settings", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch AI settings");
      }
      return response.json();
    },
  });

  // Fetch client's custom AI settings
  const { data: clientSettings } = useQuery({
    queryKey: ["/api/client/ai-settings"],
    queryFn: async () => {
      const response = await fetch("/api/client/ai-settings", {
        credentials: "include",
      });
      if (!response.ok) {
        // If no custom settings exist, return empty object
        return {};
      }
      return response.json();
    },
  });

  // Update form data when settings are loaded
  React.useEffect(() => {
    if (clientSettings) {
      setFormData({
        systemPrompt: clientSettings.systemPrompt || "",
        maxTokens: clientSettings.maxTokens || undefined,
        temperature: clientSettings.temperature || undefined,
      });
    }
  }, [clientSettings]);

  // Save client AI settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: AISettings) => {
      const response = await fetch("/api/client/ai-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao salvar configurações");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações de IA salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/client/ai-settings"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettingsMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof AISettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTestAgent = async () => {
    if (!testMessage.trim()) return;

    setIsTestingAgent(true);
    setTestResponse("");

    try {
      const response = await fetch("/api/client/ai-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: testMessage,
          settings: formData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Erro ao testar agente");
      }

      if (!data.success) {
        throw new Error(data.error || "Falha ao processar resposta do agente");
      }

      if (!data.response) {
        throw new Error("Nenhuma resposta foi gerada pelo agente");
      }

      setTestResponse(data.response);

      toast({
        title: "Teste Realizado",
        description: "Agente testado com sucesso!",
      });

    } catch (error: any) {
      console.error("Test error:", error);
      
      let errorMessage = "Erro desconhecido ao testar agente";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setTestResponse(`Erro: ${errorMessage}`);

      toast({
        title: "Erro no Teste",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTestingAgent(false);
    }
  };

  // Get effective settings (client settings override admin settings)
  const getEffectiveSettings = () => {
    if (!adminSettings) return {};
    
    return {
      systemPrompt: formData.systemPrompt || adminSettings.systemPrompt,
      maxTokens: formData.maxTokens || adminSettings.maxTokens,
      temperature: formData.temperature !== undefined ? formData.temperature : adminSettings.temperature,
    };
  };

  const effectiveSettings = getEffectiveSettings();

  if (isLoading) {
    return (
      <Layout title="Configurações de IA">
        <div className="space-y-6">
          <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Configurações de IA">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Bot className="w-6 h-6" />
            Configurações de Inteligência Artificial
          </h2>
          <p className="text-gray-600">
            Personalize as configurações do agente de IA. Deixe os campos vazios para usar as configurações padrão do administrador.
          </p>
        </div>

        {/* Removido o card de Configurações Atuais */}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* System Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Prompt do Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="systemPrompt">
                  Prompt personalizado do agente
                  {adminSettings?.systemPrompt && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Deixe vazio para usar: "{adminSettings.systemPrompt}")
                    </span>
                  )}
                </Label>
                <Textarea
                  id="systemPrompt"
                  rows={4}
                  placeholder="Digite um prompt personalizado para o agente..."
                  value={formData.systemPrompt || ""}
                  onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Define o comportamento e personalidade do agente de IA. Deixe vazio para usar a configuração do administrador.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Max Tokens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Quantidade Máxima de Tokens
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">
                  Tokens máximos
                  {adminSettings?.maxTokens && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Deixe vazio para usar: {adminSettings.maxTokens})
                    </span>
                  )}
                </Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  max="4000"
                  placeholder="Ex: 1000"
                  value={formData.maxTokens || ""}
                  onChange={(e) => handleInputChange("maxTokens", e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <p className="text-sm text-gray-500">
                  Define o tamanho máximo das respostas (1-4000 tokens). Deixe vazio para usar a configuração do administrador.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Temperature */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="w-5 h-5" />
                Temperatura do Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">
                    Temperatura
                    {adminSettings?.temperature !== undefined && (
                      <span className="text-sm text-gray-500 ml-2">
                        (Deixe vazio para usar: {adminSettings.temperature})
                      </span>
                    )}
                  </Label>
                  <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                    {formData.temperature !== undefined ? formData.temperature : "Padrão"}
                  </span>
                </div>
                <Slider
                  id="temperature"
                  min={0}
                  max={2}
                  step={0.1}
                  value={formData.temperature !== undefined ? [formData.temperature] : [0.7]}
                  onValueChange={(value) => handleInputChange("temperature", value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Mais Focado (0)</span>
                  <span>Mais Criativo (2)</span>
                </div>
                <p className="text-sm text-gray-500">
                  Controla a criatividade das respostas. Valores baixos são mais focados, valores altos são mais criativos. Deixe vazio para usar a configuração do administrador.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Agent Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Testar Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testMessage">Mensagem de Teste</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="testMessage"
                      rows={3}
                      placeholder="Digite uma mensagem para testar o agente..."
                      value={testMessage}
                      onChange={(e) => setTestMessage(e.target.value)}
                      disabled={isTestingAgent}
                    />
                    <Button
                      type="button"
                      onClick={handleTestAgent}
                      disabled={!testMessage.trim() || isTestingAgent}
                      className="min-w-24"
                    >
                      {isTestingAgent ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Teste o comportamento do agente com suas configurações personalizadas
                  </p>
                </div>

                {testResponse && (
                  <div className="space-y-2">
                    <Label>Resposta do Agente</Label>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {testResponse}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTestMessage("");
                          setTestResponse("");
                        }}
                      >
                        Limpar Teste
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saveSettingsMutation.isPending}
              className="min-w-32"
            >
              {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
} 