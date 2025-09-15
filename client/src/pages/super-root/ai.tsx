import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Bot, Key, Thermometer, Hash, Brain, MessageSquare, DollarSign, Activity, Calendar, CheckCircle, RefreshCw, Send, Loader2, Crown } from "lucide-react";
import type { AISettings } from "@shared/schema";

export default function SuperRootAI() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<AISettings>({
        chatGptApiKey: "",
        temperature: 0.7,
        maxTokens: 1000,
        model: "gpt-3.5-turbo",
        systemPrompt: "Você é um assistente útil e prestativo.",
    });

    const [testMessage, setTestMessage] = useState("");
    const [testResponse, setTestResponse] = useState("");
    const [isTestingAgent, setIsTestingAgent] = useState(false);

    // Fetch current AI settings
    const { data: aiSettings, isLoading } = useQuery({
        queryKey: ["/api/super-root/ai-settings"],
        queryFn: async () => {
            const response = await fetch("/api/super-root/ai-settings", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch AI settings");
            }
            return response.json();
        },
    });

    // Fetch available AI models
    const { data: aiModels } = useQuery({
        queryKey: ["/api/super-root/ai-models"],
        queryFn: async () => {
            const response = await fetch("/api/super-root/ai-models", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch AI models");
            }
            return response.json();
        },
    });

    // Fetch AI usage statistics with auto-refresh
    const { data: usageStats, isLoading: usageLoading } = useQuery({
        queryKey: ["/api/super-root/ai-usage"],
        queryFn: async () => {
            const response = await fetch("/api/super-root/ai-usage", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch AI usage");
            }
            return response.json();
        },
        refetchInterval: 30000, // Auto-refresh every 30 seconds
    });

    // Update form data when settings are loaded
    React.useEffect(() => {
        if (aiSettings) {
            setFormData(aiSettings);
        }
    }, [aiSettings]);

    // Save AI settings mutation
    const saveSettingsMutation = useMutation({
        mutationFn: async (data: AISettings) => {
            const response = await fetch("/api/super-root/ai-settings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Erro ao salvar configurações globais de IA");
            }

            return response.json();
        },
        onSuccess: () => {
            toast({
                title: "Sucesso",
                description: "Configurações globais de IA salvas com sucesso!",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/super-root/ai-settings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/super-root/ai-usage"] });
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Test AI connection mutation
    const testConnectionMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/super-root/ai-test", {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error("Failed to test connection");
            }

            return response.json();
        },
        onSuccess: (data) => {
            if (data.success) {
                toast({
                    title: "Conexão Bem-sucedida",
                    description: `Conectado com sucesso ao modelo ${data.model}`,
                });
            } else {
                toast({
                    title: "Falha na Conexão",
                    description: data.error || "Não foi possível conectar à API",
                    variant: "destructive",
                });
            }
        },
        onError: (error: Error) => {
            toast({
                title: "Erro de Conexão",
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
        if (!testMessage.trim() || !formData.chatGptApiKey) return;

        setIsTestingAgent(true);
        setTestResponse("");

        try {
            const response = await fetch("/api/super-root/ai-chat", {
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

            // Refresh usage stats after successful test
            queryClient.invalidateQueries({ queryKey: ["/api/super-root/ai-usage"] });

        } catch (error: any) {
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
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                        <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                            Configurações Globais de IA
                        </h2>
                        <p className="text-gray-600">
                            Configure as opções de Inteligência Artificial para todo o sistema
                        </p>
                    </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                        <Bot className="h-5 w-5 text-purple-600" />
                        <h3 className="font-medium text-purple-900">Configuração Global de IA</h3>
                    </div>
                    <p className="text-sm text-purple-700 mt-1">
                        Estas configurações de IA serão utilizadas por todos os franqueadores e franquias do sistema.
                        Configure a API do OpenAI e personalize o comportamento do agente de IA.
                    </p>
                </div>

                {/* Usage Statistics - Real Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Total de Tokens</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            (usageStats?.totalTokens || 0).toLocaleString('pt-BR')
                                        )}
                                    </p>
                                    {!usageLoading && usageStats?.totalTokens > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Atualizado: {new Date().toLocaleTimeString('pt-BR')}
                                        </p>
                                    )}
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Hash className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Custo Total</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            `${(usageStats?.totalCost || 0).toFixed(4)}`
                                        )}
                                    </p>
                                    {!usageLoading && usageStats?.totalCost > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            ≈ R$ {((usageStats?.totalCost || 0) * 5.5).toFixed(2)}
                                        </p>
                                    )}
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Requests Hoje</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            usageStats?.requestsToday || 0
                                        )}
                                    </p>
                                    {!usageLoading && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date().toLocaleDateString('pt-BR', {
                                                weekday: 'long',
                                                day: 'numeric',
                                                month: 'short'
                                            })}
                                        </p>
                                    )}
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-purple-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600">Requests Este Mês</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? (
                                            <span className="animate-pulse">...</span>
                                        ) : (
                                            usageStats?.requestsThisMonth || 0
                                        )}
                                    </p>
                                    {!usageLoading && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {new Date().toLocaleDateString('pt-BR', {
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    )}
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Last Usage Info */}
                {!usageLoading && usageStats?.lastUsed && (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-gray-600">Último uso da API:</span>
                                    <span className="font-medium text-gray-900">
                                        {new Date(usageStats.lastUsed).toLocaleString('pt-BR')}
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/super-root/ai-usage"] })}
                                    className="text-xs"
                                >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Atualizar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}


                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* API Key */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                Chave da API OpenAI
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="apiKey">Chave do ChatGPT</Label>
                                <Input
                                    id="apiKey"
                                    type="password"
                                    placeholder="sk-..."
                                    value={formData.chatGptApiKey}
                                    onChange={(e) => handleInputChange("chatGptApiKey", e.target.value)}
                                    required
                                />
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-500">
                                        Chave da API do OpenAI para habilitar IA em todo o sistema
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => testConnectionMutation.mutate()}
                                        disabled={!formData.chatGptApiKey || testConnectionMutation.isPending}
                                        className="ml-2"
                                    >
                                        {testConnectionMutation.isPending ? (
                                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                        )}
                                        Testar Conexão
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Model Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5" />
                                Modelo de IA
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="model">Versão do Modelo</Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/super-root/ai-models"] })}
                                        className="text-xs"
                                    >
                                        <RefreshCw className="w-3 h-3 mr-1" />
                                        Atualizar
                                    </Button>
                                </div>
                                <Select
                                    value={formData.model}
                                    onValueChange={(value) => handleInputChange("model", value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o modelo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {aiModels?.map((model: any) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                {model.name}
                                            </SelectItem>
                                        )) || (
                                                <>
                                                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                                                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                                                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                                </>
                                            )}
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-gray-500">
                                    Modelo GPT que será usado por todo o sistema
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Temperature */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Thermometer className="w-5 h-5" />
                                Temperatura
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="temperature">Temperatura do Agente</Label>
                                    <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">
                                        {formData.temperature}
                                    </span>
                                </div>
                                <Slider
                                    id="temperature"
                                    min={0}
                                    max={2}
                                    step={0.1}
                                    value={[formData.temperature]}
                                    onValueChange={(value) => handleInputChange("temperature", value[0])}
                                    className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Mais Focado (0)</span>
                                    <span>Mais Criativo (2)</span>
                                </div>
                                <p className="text-sm text-gray-500">
                                    Controla a criatividade das respostas em todo o sistema
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Max Tokens */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Hash className="w-5 h-5" />
                                Tokens Máximos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="maxTokens">Quantidade Máxima de Tokens</Label>
                                <Input
                                    id="maxTokens"
                                    type="number"
                                    min="1"
                                    max="4000"
                                    value={formData.maxTokens}
                                    onChange={(e) => handleInputChange("maxTokens", parseInt(e.target.value))}
                                    required
                                />
                                <p className="text-sm text-gray-500">
                                    Tamanho máximo das respostas para todo o sistema (1-4000 tokens)
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Prompt */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Prompt Global do Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="systemPrompt">Prompt padrão para todo o sistema</Label>
                                <Textarea
                                    id="systemPrompt"
                                    rows={6}
                                    placeholder="Você é um assistente útil e prestativo..."
                                    value={formData.systemPrompt}
                                    onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
                                    required
                                />
                                <p className="text-sm text-gray-500">
                                    Define o comportamento padrão da IA para todos os usuários do sistema
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Agent Test */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="w-5 h-5" />
                                Testar Configurações
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
                                            placeholder="Digite uma mensagem para testar as configurações de IA..."
                                            value={testMessage}
                                            onChange={(e) => setTestMessage(e.target.value)}
                                            disabled={isTestingAgent}
                                        />
                                        <Button
                                            type="button"
                                            onClick={handleTestAgent}
                                            disabled={!testMessage.trim() || !formData.chatGptApiKey || isTestingAgent}
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
                                        Teste as configurações globais de IA
                                    </p>
                                </div>

                                {testResponse && (
                                    <div className="space-y-2">
                                        <Label>Resposta da IA</Label>
                                        <div className="p-3 bg-gray-50 rounded-md border">
                                            <pre className="whitespace-pre-wrap text-sm">{testResponse}</pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={saveSettingsMutation.isPending}
                            className="min-w-32"
                        >
                            {saveSettingsMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                                <Bot className="w-4 h-4 mr-2" />
                            )}
                            {saveSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                        </Button>
                    </div>
                </form>

                {/* Information Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Informações Importantes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p>
                                    <strong>Configuração Global:</strong> Estas configurações serão aplicadas a todos os usuários do sistema.
                                </p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p>
                                    <strong>API Key:</strong> Mantenha sua chave da OpenAI segura e não compartilhe com usuários não autorizados.
                                </p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p>
                                    <strong>Custos:</strong> Monitor os custos de uso da API para controlar gastos.
                                </p>
                            </div>
                            <div className="flex items-start space-x-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                                <p>
                                    <strong>Impacto:</strong> Alterações nestas configurações afetam todos os franqueadores e franquias.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}