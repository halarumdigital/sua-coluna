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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Bot, Thermometer, Hash, MessageSquare, Send, Loader2, Plus, Edit, Trash2, Play, Sparkles, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AISettings } from "@shared/schema";
import { createGlobalPromptSchema } from "@shared/schema";

export default function AdminAIPage() {
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

    // Global Prompts states
    const [promptDialogOpen, setPromptDialogOpen] = useState(false);
    const [testDialogOpen, setTestDialogOpen] = useState(false);
    const [editingPrompt, setEditingPrompt] = useState<any>(null);
    const [testingPrompt, setTestingPrompt] = useState<any>(null);
    const [promptTestMessage, setPromptTestMessage] = useState("");
    const [promptTestResponse, setPromptTestResponse] = useState("");
    const [promptTestLoading, setPromptTestLoading] = useState(false);

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

    // Fetch global prompts
    const { data: globalPrompts, isLoading: isLoadingPrompts } = useQuery({
        queryKey: ["/api/admin/global-prompts"],
    });

    // Update form data when settings are loaded
    React.useEffect(() => {
        if (aiSettings) {
            setFormData(aiSettings);
        }
    }, [aiSettings]);

    // Global Prompts form
    const promptForm = useForm({
        resolver: zodResolver(createGlobalPromptSchema),
        defaultValues: {
            name: "",
            description: "",
            prompt: "",
            temperature: 0.7,
            category: "",
            isDefault: false,
        },
    });

    // Reset form when editing prompt changes
    React.useEffect(() => {
        if (editingPrompt) {
            promptForm.reset({
                name: editingPrompt.name || "",
                description: editingPrompt.description || "",
                prompt: editingPrompt.prompt || "",
                temperature: Number(editingPrompt.temperature) || 0.7,
                category: editingPrompt.category || "",
                isDefault: editingPrompt.isDefault || false,
            });
        } else {
            promptForm.reset({
                name: "",
                description: "",
                prompt: "",
                temperature: 0.7,
                category: "",
                isDefault: false,
            });
        }
    }, [editingPrompt, promptForm]);

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
        },
        onError: (error: Error) => {
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    // Global Prompts mutations
    const createPromptMutation = useMutation({
        mutationFn: async (data: any) => {
            if (editingPrompt) {
                const response = await apiRequest("PUT", `/api/admin/global-prompts/${editingPrompt.id}`, data);
                return await response.json();
            } else {
                const response = await apiRequest("POST", "/api/admin/global-prompts", data);
                return await response.json();
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/global-prompts"] });
                toast({
                title: "Sucesso",
                description: editingPrompt ? "Prompt atualizado com sucesso" : "Prompt criado com sucesso",
            });
            setPromptDialogOpen(false);
            setEditingPrompt(null);
            promptForm.reset();
        },
        onError: (error) => {
                toast({
                title: "Erro",
                description: error.message,
                    variant: "destructive",
                });
        },
    });

    const deletePromptMutation = useMutation({
        mutationFn: async (id: string) => {
            const response = await apiRequest("DELETE", `/api/admin/global-prompts/${id}`);
            return await response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/global-prompts"] });
            toast({
                title: "Sucesso",
                description: "Prompt excluído com sucesso",
            });
        },
        onError: (error) => {
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

    // Global Prompts handlers
    const onPromptSubmit = (data: any) => {
        createPromptMutation.mutate(data);
    };

    const handleEditPrompt = (prompt: any) => {
        setEditingPrompt(prompt);
        setPromptDialogOpen(true);
    };

    const handleDeletePrompt = (id: string) => {
        if (confirm("Tem certeza que deseja excluir este prompt?")) {
            deletePromptMutation.mutate(id);
        }
    };

    const handleTestPrompt = async (prompt: any) => {
        if (!promptTestMessage.trim()) {
            toast({
                title: "Erro",
                description: "Digite uma mensagem para testar o prompt",
                variant: "destructive",
            });
            return;
        }

        setPromptTestLoading(true);
        setPromptTestResponse("");

        try {
            const response = await apiRequest("POST", `/api/admin/global-prompts/${prompt.id}/test`, {
                testMessage: promptTestMessage
            });
            
            const result = await response.json();

            if (result.success) {
                setPromptTestResponse(result.response || "");
                toast({
                    title: "Sucesso",
                    description: "Prompt testado com sucesso!",
                });
            } else {
                setPromptTestResponse(`Erro: ${result.error}`);
                toast({
                    title: "Erro no Teste",
                    description: result.error || "Falha ao testar prompt",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            setPromptTestResponse(`Erro: ${error.message}`);
            toast({
                title: "Erro",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setPromptTestLoading(false);
        }
    };

    const handleTestAgent = async () => {
        if (!testMessage.trim()) return;

        setIsTestingAgent(true);
        setTestResponse("");

        try {
            console.log("Sending test request with:", {
                message: testMessage.substring(0, 50) + "...",
                settings: formData
            });

            const response = await fetch("/api/admin/ai-chat", {
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

            console.log("Response status:", response.status);

            const data = await response.json();
            console.log("Response data:", data);

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

    if (isLoading) {
        return (
            <Layout title="Inteligência Artificial">
                <div className="space-y-6">
                    <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
                    <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Inteligência Artificial">
            <div className="space-y-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Bot className="w-6 h-6" />
                        Inteligência Artificial
                    </h2>
                    <p className="text-gray-600">
                        Configure as opções de IA e gerencie prompts globais para todas as franquias
                    </p>
                </div>

                <Tabs defaultValue="settings" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="settings" className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Configurações
                        </TabsTrigger>
                        <TabsTrigger value="prompts" className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Prompts Globais
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="settings" className="space-y-6 mt-6">

                <form onSubmit={handleSubmit} className="space-y-6">

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
                                        Teste o comportamento do agente com as configurações atuais
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
                    </TabsContent>

                    <TabsContent value="prompts" className="space-y-6 mt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Prompts Globais</h3>
                                <p className="text-gray-600">
                                    Crie prompts que serão aplicados a todas as franquias
                                </p>
                            </div>
                            <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => {
                                        setEditingPrompt(null);
                                        setPromptDialogOpen(true);
                                    }}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Novo Prompt
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>
                                            {editingPrompt ? "Editar Prompt Global" : "Novo Prompt Global"}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <Form {...promptForm}>
                                        <form onSubmit={promptForm.handleSubmit(onPromptSubmit)} className="space-y-4">
                                            <FormField
                                                control={promptForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Nome do Prompt *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Ex: Atendimento Vendas" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={promptForm.control}
                                                name="category"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Categoria</FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} value={field.value}>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione uma categoria" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="vendas">Vendas</SelectItem>
                                                                    <SelectItem value="suporte">Suporte</SelectItem>
                                                                    <SelectItem value="geral">Geral</SelectItem>
                                                                    <SelectItem value="financeiro">Financeiro</SelectItem>
                                                                    <SelectItem value="marketing">Marketing</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={promptForm.control}
                                                name="description"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Descrição</FormLabel>
                                                        <FormControl>
                                                            <Textarea 
                                                                placeholder="Descrição do que o prompt faz..."
                                                                rows={2}
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={promptForm.control}
                                                name="prompt"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Conteúdo do Prompt *</FormLabel>
                                                        <FormControl>
                                                            <Textarea 
                                                                placeholder="Você é um assistente especializado em..."
                                                                rows={6}
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={promptForm.control}
                                                name="temperature"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Temperatura ({field.value})</FormLabel>
                                                        <FormControl>
                                                            <Slider
                                                                min={0}
                                                                max={2}
                                                                step={0.1}
                                                                value={[field.value]}
                                                                onValueChange={(value) => field.onChange(value[0])}
                                                                className="w-full"
                                                            />
                                                        </FormControl>
                                                        <div className="flex justify-between text-xs text-gray-500">
                                                            <span>Mais Focado (0)</span>
                                                            <span>Mais Criativo (2)</span>
                                                        </div>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="flex justify-end space-x-3 pt-4">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setPromptDialogOpen(false);
                                                        setEditingPrompt(null);
                                                    }}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button 
                                                    type="submit"
                                                    disabled={createPromptMutation.isPending}
                                                >
                                                    {createPromptMutation.isPending ? "Salvando..." : editingPrompt ? "Atualizar" : "Criar"}
                                                </Button>
                                            </div>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Global Prompts List */}
                        <div className="grid gap-4">
                            {isLoadingPrompts ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : globalPrompts?.length === 0 ? (
                                <Card>
                                    <CardContent className="p-12 text-center">
                                        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Nenhum prompt global encontrado
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            Crie seu primeiro prompt global para começar
                                        </p>
                                        <Button onClick={() => {
                                            setEditingPrompt(null);
                                            setPromptDialogOpen(true);
                                        }}>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Criar Primeiro Prompt
                                        </Button>
                                    </CardContent>
                                </Card>
                            ) : (
                                globalPrompts?.map((prompt: any) => (
                                    <Card key={prompt.id} className="relative">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                                                        {prompt.category && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {prompt.category}
                                                            </Badge>
                                                        )}
                                                        {prompt.isDefault && (
                                                            <Badge className="text-xs bg-blue-100 text-blue-800">
                                                                Padrão
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {prompt.description && (
                                                        <p className="text-sm text-gray-600">{prompt.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setTestingPrompt(prompt);
                                                            setTestDialogOpen(true);
                                                        }}
                                                    >
                                                        <Play className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleEditPrompt(prompt)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeletePrompt(prompt.id)}
                                                        disabled={deletePromptMutation.isPending}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                <p className="text-sm text-gray-700 line-clamp-3">{prompt.prompt}</p>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>Temperatura: {prompt.temperature}</span>
                                                <span>Criado em: {new Date(prompt.createdAt).toLocaleDateString('pt-BR')}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>

                        {/* Test Dialog */}
                        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Testar Prompt: {testingPrompt?.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="test-message">Mensagem de Teste</Label>
                                        <Textarea
                                            id="test-message"
                                            rows={3}
                                            placeholder="Digite uma mensagem para testar o prompt..."
                                            value={promptTestMessage}
                                            onChange={(e) => setPromptTestMessage(e.target.value)}
                                            disabled={promptTestLoading}
                                        />
                                    </div>
                                    
                                    {promptTestResponse && (
                                        <div>
                                            <Label>Resposta do Agente</Label>
                                            <div className="p-4 bg-gray-50 rounded-lg border">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Bot className="w-4 h-4 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                                                            {promptTestResponse}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-end space-x-3">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setTestDialogOpen(false);
                                                setTestingPrompt(null);
                                                setPromptTestMessage("");
                                                setPromptTestResponse("");
                                            }}
                                        >
                                            Fechar
                                        </Button>
                                        <Button
                                            onClick={() => handleTestPrompt(testingPrompt)}
                                            disabled={!promptTestMessage.trim() || promptTestLoading}
                                        >
                                            {promptTestLoading ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Play className="w-4 h-4 mr-2" />
                                            )}
                                            {promptTestLoading ? "Testando..." : "Testar"}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}