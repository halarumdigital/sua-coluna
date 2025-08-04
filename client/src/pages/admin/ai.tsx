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
import { Bot, Key, Thermometer, Hash, Brain, MessageSquare, DollarSign, Activity, Calendar, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import type { AISettings } from "@shared/schema";

export default function AIPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState<AISettings>({
        chatGptApiKey: "",
        temperature: 0.7,
        maxTokens: 1000,
        model: "gpt-3.5-turbo",
        systemPrompt: "Você é um assistente útil e prestativo.",
    });

    // Fetch current AI settings
    const { data: aiSettings, isLoading } = useQuery({
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

    // Fetch available AI models
    const { data: aiModels, isLoading: modelsLoading } = useQuery({
        queryKey: ["/api/admin/ai-models"],
        queryFn: async () => {
            const response = await fetch("/api/admin/ai-models", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch AI models");
            }
            return response.json();
        },
    });

    // Fetch AI usage statistics
    const { data: usageStats, isLoading: usageLoading } = useQuery({
        queryKey: ["/api/admin/ai-usage"],
        queryFn: async () => {
            const response = await fetch("/api/admin/ai-usage", {
                credentials: "include",
            });
            if (!response.ok) {
                throw new Error("Failed to fetch AI usage");
            }
            return response.json();
        },
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
            const response = await fetch("/api/admin/ai-settings", {
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
            queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-usage"] });
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
            const response = await fetch("/api/admin/ai-test", {
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
                        Configure as opções do agente de IA para personalizar o comportamento do ChatGPT
                    </p>
                </div>

                {/* Usage Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Total de Tokens</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? "..." : (usageStats?.totalTokens || 0).toLocaleString()}
                                    </p>
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
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Custo Total</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? "..." : `$${(usageStats?.totalCost || 0).toFixed(4)}`}
                                    </p>
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
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Requests Hoje</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? "..." : (usageStats?.requestsToday || 0)}
                                    </p>
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
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Requests Este Mês</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {usageLoading ? "..." : (usageStats?.requestsThisMonth || 0)}
                                    </p>
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Available Models */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Brain className="w-5 h-5" />
                            Modelos Disponíveis
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {modelsLoading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {aiModels?.map((model: any) => (
                                    <div
                                        key={model.id}
                                        className={`p-4 border rounded-lg transition-colors cursor-pointer ${
                                            formData.model === model.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        onClick={() => handleInputChange("model", model.id)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{model.name}</h4>
                                                <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                                                {model.pricing && (
                                                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                                        <span>Input: ${model.pricing.input}/1K tokens</span>
                                                        <span>Output: ${model.pricing.output}/1K tokens</span>
                                                    </div>
                                                )}
                                            </div>
                                            {formData.model === model.id && (
                                                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 ml-2" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* API Key */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                Chave da API
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
                                        Insira sua chave da API do OpenAI para habilitar as funcionalidades de IA
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
                                Modelo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="model">Versão do Modelo</Label>
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
                                    Escolha a versão do modelo GPT a ser utilizada
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
                                    Controla a criatividade das respostas. Valores baixos são mais focados, valores altos são mais criativos.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Max Tokens */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Hash className="w-5 h-5" />
                                Tokens
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
                                    Define o tamanho máximo das respostas (1-4000 tokens)
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* System Prompt */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" />
                                Prompt do Sistema
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="systemPrompt">Prompt que será usado pelo agente</Label>
                                <Textarea
                                    id="systemPrompt"
                                    rows={6}
                                    placeholder="Você é um assistente útil e prestativo..."
                                    value={formData.systemPrompt}
                                    onChange={(e) => handleInputChange("systemPrompt", e.target.value)}
                                    required
                                />
                                <p className="text-sm text-gray-500">
                                    Define o comportamento e personalidade do agente de IA
                                </p>
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