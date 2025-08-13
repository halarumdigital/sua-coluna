import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Bot, RefreshCw, Smartphone, Link, ToggleLeft, ToggleRight } from "lucide-react";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Loader2, Plus, Phone, QrCode, Trash2, Power, PowerOff } from "lucide-react";
import React from "react";

interface AdminWhatsAppInstance {
  id: string;
  instanceName: string;
  instanceKey: string;
  phoneNumber: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  qrCode?: string;
  lastConnection?: string;
  lastStatusCheck?: string;
  isActive: boolean;
  createdAt: string;
}

interface Agent {
  id: string;
  name: string;
  description?: string;
  type: 'global' | 'franchise';
  isActive: boolean;
  createdAt: string;
}

interface InstanceAgentBinding {
  id: string;
  instanceId: string;
  agentId: string;
  isActive: boolean;
  createdAt: string;
  instance?: AdminWhatsAppInstance;
  agent?: Agent;
}

export default function AdminWhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug log when component mounts
  React.useEffect(() => {
    console.log('🔍 AdminWhatsApp component mounted');
  }, []);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<AdminWhatsAppInstance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ id: string; qrCode: string; instanceName: string; instanceKey: string } | null>(null);
  const [connectingInstances, setConnectingInstances] = useState<Set<string>>(new Set());
  const [deletingInstances, setDeletingInstances] = useState<Set<string>>(new Set());
  const [configuringInstances, setConfiguringInstances] = useState<Set<string>>(new Set());
  const [checkingStatus, setCheckingStatus] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    instanceName: "",
    phoneNumber: "",
  });
  const [instanceToConfig, setInstanceToConfig] = useState<AdminWhatsAppInstance | null>(null);
  const [configData, setConfigData] = useState({
    rejectCall: true,
    msgCall: "I do not accept calls",
    groupsIgnore: true,
    alwaysOnline: true,
    readMessages: true,
    syncFullHistory: false,
    readStatus: true
  });

  // Estados para agentes e vinculações
  const [agents, setAgents] = useState<Agent[]>([]);
  const [instanceAgentBindings, setInstanceAgentBindings] = useState<InstanceAgentBinding[]>([]);

  // Debug log for agents state
  React.useEffect(() => {
    console.log('🤖 Agents state updated:', agents);
    console.log('🤖 Agents length:', agents.length);
    console.log('🤖 Agents data:', JSON.stringify(agents, null, 2));
  }, [agents]);

  const [newBinding, setNewBinding] = useState({
    instanceId: '',
    agentId: ''
  });

  // Fetch admin WhatsApp instances
  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp-instances"],
  });

  // Fetch current WhatsApp settings (only to check if API is configured)
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp-settings"],
  });

  // Fetch agents
  const { data: agentsData, isLoading: agentsLoading, error: agentsError } = useQuery({
    queryKey: ["/api/admin/whatsapp-agents"],
    queryFn: async () => {
      console.log('🔍 Making request to /api/admin/whatsapp-agents');
      const response = await fetch('/api/admin/whatsapp-agents', {
        credentials: 'include'
      });
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🤖 Agents data received:', data);
      console.log('🤖 Data is array?', Array.isArray(data));
      console.log('🤖 Data length:', data?.length);
      return data;
    },
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('✅ Query success, setting agents:', data);
      console.log('✅ Data type:', typeof data, 'Array?', Array.isArray(data));
      console.log('✅ About to call setAgents with:', data);
      setAgents(data || []);
      console.log('✅ setAgents called');
    },
    onError: (error) => {
      console.error('❌ Query error:', error);
    }
  });

  // Fetch instance-agent bindings
  const { data: bindingsData } = useQuery({
    queryKey: ["/api/admin/whatsapp-instance-agent-bindings"],
    onSuccess: (data) => {
      setInstanceAgentBindings(data || []);
    }
  });

  // Debug log for query data
  React.useEffect(() => {
    console.log('📊 Query data changed:', agentsData);
    console.log('📊 Query loading:', agentsLoading);
    console.log('📊 Query error:', agentsError);
    
    // Force update agents state when query data changes
    if (agentsData && Array.isArray(agentsData)) {
      console.log('🔄 Force updating agents state with:', agentsData);
      setAgents(agentsData);
    }
  }, [agentsData, agentsLoading, agentsError]);

  // Create WhatsApp instance mutation
  const createInstanceMutation = useMutation({
    mutationFn: async (data: { instanceName: string; phoneNumber: string }) => {
      const response = await fetch("/api/admin/whatsapp-instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Erro ao criar instância do WhatsApp");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Instância do WhatsApp criada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-instances"] });
      setShowInstanceModal(false);
      setFormData({ instanceName: "", phoneNumber: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar instância do WhatsApp",
        variant: "destructive",
      });
    },
  });

  // Connect WhatsApp instance mutation
  const connectInstanceMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(`/api/admin/whatsapp-instances/${instanceId}/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Erro ao conectar instância do WhatsApp");
      }
      return response.json();
    },
    onSuccess: (data, instanceId) => {
      if (data.qrCode) {
        const qrSrc: string = String(data.qrCode);
        const normalized = qrSrc.startsWith('data:image/') ? qrSrc : `data:image/png;base64,${qrSrc}`;
        setQrCodeData({
          id: instanceId as string,
          qrCode: normalized,
          instanceName: data.instanceName || "",
          instanceKey: data.instanceKey,
        });
        setShowQRModal(true);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-instances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao conectar instância do WhatsApp",
        variant: "destructive",
      });
    },
  });

  // Delete WhatsApp instance mutation
  const deleteInstanceMutation = useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(`/api/admin/whatsapp-instances/${instanceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erro ao excluir instância do WhatsApp");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Instância do WhatsApp excluída com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-instances"] });
      setShowDeleteModal(false);
      setInstanceToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir instância do WhatsApp",
        variant: "destructive",
      });
    },
  });

  // Configure AI webhook mutation (Admin)
  const configureAIWebhookMutation = useMutation({
    mutationFn: async ({ instanceKey, config }: { instanceKey: string; config: any }) => {
      const response = await fetch(`/api/admin/whatsapp-instances/${instanceKey}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao configurar webhook da IA");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "IA Configurada",
        description: "Webhook da IA configurado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-instances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao configurar webhook da IA",
        variant: "destructive",
      });
    },
  });

  const handleConfigureAI = async (instance?: AdminWhatsAppInstance) => {
    if (!instance) {
      toast({ title: "Erro", description: "Instância não encontrada", variant: "destructive" });
      return;
    }
    setConfiguringInstances(prev => new Set(prev.add(instance.id)));
    try {
      const aiWebhookConfig = {
        webhook: {
          enabled: true,
          // URL e headers serão definidos pelo servidor com base na URL do Sistema e token global
          byEvents: false,
          base64: true,
          events: [
            "MESSAGES_UPSERT",
          ],
        },
      };

      await configureAIWebhookMutation.mutateAsync({
        instanceKey: instance.instanceKey,
        config: aiWebhookConfig,
      });
    } finally {
      setConfiguringInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instance.id);
        return newSet;
      });
    }
  };

  const handleConfigureWhatsApp = (instance: AdminWhatsAppInstance) => {
    setInstanceToConfig(instance);
    setShowConfigModal(true);
  };

  // Configurar WhatsApp instance (Admin)
  const configureWhatsAppInstance = useMutation({
    mutationFn: async ({ instanceKey, settings }: { instanceKey: string; settings: any }) => {
      const response = await fetch(`/api/admin/whatsapp-instances/${instanceKey}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao configurar instância");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Configurações Salvas", description: "Configurações do WhatsApp aplicadas com sucesso!" });
      setShowConfigModal(false);
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message || "Erro ao aplicar configurações", variant: "destructive" });
    },
  });

  const handleSaveConfig = async () => {
    if (!instanceToConfig) return;
    setConfiguringInstances(prev => new Set(prev.add(instanceToConfig.id)));
    try {
      await configureWhatsAppInstance.mutateAsync({
        instanceKey: instanceToConfig.instanceKey,
        settings: configData
      });
    } finally {
      setConfiguringInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instanceToConfig.id);
        return newSet;
      });
    }
  };

  const handleCheckStatus = async (instance: AdminWhatsAppInstance) => {
    setCheckingStatus(prev => new Set(prev.add(instance.id)));
    try {
      const response = await fetch(`/api/admin/whatsapp-instances/${instance.instanceKey}/status`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao verificar status');
      }

      const statusData = await response.json();
      
      toast({
        title: "Status Verificado",
        description: `Status da instância ${instance.instanceName}: ${statusData.status === 'connected' ? 'Conectado' : statusData.status === 'connecting' ? 'Conectando' : 'Desconectado'}`
      });

      // Atualizar a lista de instâncias
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-instances"] });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar status da instância",
        variant: "destructive"
      });
    } finally {
      setCheckingStatus(prev => {
        const newSet = new Set(prev);
        newSet.delete(instance.id);
        return newSet;
      });
    }
  };



  // Funções para gerenciar vinculações
  const handleCreateBinding = async () => {
    if (!newBinding.instanceId || !newBinding.agentId) {
      toast({
        title: "Erro",
        description: "Instância e agente são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    // Verificar se já existe uma vinculação para esta instância
    const existingBinding = instanceAgentBindings.find(
      binding => binding.instanceId === newBinding.instanceId && binding.isActive
    );

    if (existingBinding) {
      toast({
        title: "Erro",
        description: "Esta instância já possui um agente vinculado. Desative a vinculação atual primeiro.",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/whatsapp-instance-agent-bindings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBinding),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar vinculação');
      }

      const result = await response.json();
      
      // A resposta da API já vem com os dados enriquecidos
      const newBindingData: InstanceAgentBinding = {
        ...result,
        instance: instances?.find((i: AdminWhatsAppInstance) => i.id === newBinding.instanceId),
        agent: agents.find(a => a.id === newBinding.agentId)
      };

      setInstanceAgentBindings([...instanceAgentBindings, newBindingData]);
      setNewBinding({ instanceId: '', agentId: '' });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-instance-agent-bindings"] });
      
      toast({
        title: "Sucesso",
        description: "Vinculação criada com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar vinculação",
        variant: "destructive"
      });
    }
  };

  const handleToggleBinding = async (bindingId: string) => {
    try {
      // Buscar a vinculação atual para obter o status
      const currentBinding = instanceAgentBindings.find(b => b.id === bindingId);
      if (!currentBinding) return;

      const response = await fetch(`/api/admin/whatsapp-instance-agent-bindings/${bindingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentBinding.isActive }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar vinculação');
      }

      const result = await response.json();

      setInstanceAgentBindings(prevBindings =>
        prevBindings.map(binding =>
          binding.id === bindingId
            ? { ...binding, isActive: !binding.isActive }
            : binding
        )
      );
      
      toast({
        title: "Sucesso",
        description: "Status da vinculação atualizado"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar vinculação",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBinding = async (bindingId: string) => {
    try {
      const response = await fetch(`/api/admin/whatsapp-instance-agent-bindings/${bindingId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao remover vinculação');
      }

      const result = await response.json();

      setInstanceAgentBindings(prevBindings =>
        prevBindings.filter(binding => binding.id !== bindingId)
      );
      
      toast({
        title: "Sucesso",
        description: "Vinculação removida com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao remover vinculação",
        variant: "destructive"
      });
    }
  };

  const handleCreateInstance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData.instanceName || !formData.phoneNumber) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    createInstanceMutation.mutate(formData);
  };

  const handleConnectInstance = (instance: AdminWhatsAppInstance) => {
    setConnectingInstances(prev => new Set(prev.add(instance.id)));
    connectInstanceMutation.mutate(instance.id, {
      onSettled: () => {
        setConnectingInstances(prev => {
          const newSet = new Set(prev);
          newSet.delete(instance.id);
          return newSet;
        });
      },
    });
  };

  const handleDeleteInstance = (instance: AdminWhatsAppInstance) => {
    setInstanceToDelete(instance);
    setShowDeleteModal(true);
  };

  const confirmDeleteInstance = () => {
    if (instanceToDelete) {
      setDeletingInstances(prev => new Set(prev.add(instanceToDelete.id)));
      deleteInstanceMutation.mutate(instanceToDelete.id, {
        onSettled: () => {
          setDeletingInstances(prev => {
            const newSet = new Set(prev);
            newSet.delete(instanceToDelete.id);
            return newSet;
          });
        },
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { color: "bg-green-100 text-green-800", label: "Conectado", dotColor: "bg-green-500" },
      disconnected: { color: "bg-red-100 text-red-800", label: "Desconectado", dotColor: "bg-red-500" },
      connecting: { color: "bg-yellow-100 text-yellow-800", label: "Conectando", dotColor: "bg-yellow-500" },
      error: { color: "bg-red-100 text-red-800", label: "Erro", dotColor: "bg-red-500" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.error;
    
    return (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${config.dotColor}`}></div>
        <Badge className={config.color}>
          {config.label}
        </Badge>
      </div>
    );
  };

  if (isLoading || instancesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  // Check if Evolution API is configured
  const isApiConfigured = settings && settings.isActive && settings.evolutionApiUrl && settings.globalToken;

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Gerenciar WhatsApp
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gerencie suas instâncias de WhatsApp
          </p>
        </div>

        {!isApiConfigured && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  API WhatsApp não configurada
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Para usar as funcionalidades do WhatsApp, a Evolution API precisa ser configurada pelo Super Root.
                </p>
                <p className="text-sm text-gray-500">
                  Entre em contato com o administrador do sistema para configurar a Evolution API.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Sections with Tabs */}
        {isApiConfigured && (
          <Tabs defaultValue="instances" className="space-y-6">
            <TabsList>
              <TabsTrigger value="instances">Instâncias</TabsTrigger>
              <TabsTrigger value="instance-agents">Instâncias & Agentes</TabsTrigger>
            </TabsList>

            {/* Aba de Instâncias */}
            <TabsContent value="instances">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      Instâncias WhatsApp
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (instances && instances.length > 0) {
                            instances.forEach((instance: AdminWhatsAppInstance) => {
                              handleCheckStatus(instance);
                            });
                          }
                        }}
                        disabled={instances?.length === 0 || checkingStatus.size > 0}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Verificar Todos
                      </Button>
                      <Dialog open={showInstanceModal} onOpenChange={setShowInstanceModal}>
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Nova Instância
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Nova Instância WhatsApp</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateInstance} className="space-y-4">
                          <div>
                            <Label htmlFor="instanceName">Nome da Instância</Label>
                            <Input
                              id="instanceName"
                              value={formData.instanceName}
                              onChange={(e) => setFormData(prev => ({ ...prev, instanceName: e.target.value }))}
                              placeholder="Ex: WhatsApp Principal"
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="phoneNumber">Número de Telefone</Label>
                            <Input
                              id="phoneNumber"
                              value={formData.phoneNumber}
                              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                              placeholder="Ex: +5511999999999"
                              required
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowInstanceModal(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              disabled={createInstanceMutation.isPending}
                            >
                              {createInstanceMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Plus className="h-4 w-4 mr-2" />
                              )}
                              Criar Instância
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {instancesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Carregando instâncias...</span>
                    </div>
                  ) : instances && instances.length > 0 ? (
                    <div className="space-y-4">
                      {instances.map((instance: AdminWhatsAppInstance) => (
                        <div
                          key={instance.id}
                          className="border rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-medium">{instance.instanceName}</h3>
                              {getStatusBadge(instance.status)}
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p><span className="font-medium">Telefone:</span> {instance.phoneNumber}</p>
                              <p><span className="font-medium">Chave:</span> {instance.instanceKey}</p>
                              {instance.lastConnection && (
                                <p><span className="font-medium">Última conexão:</span> {new Date(instance.lastConnection).toLocaleString()}</p>
                              )}
                              {instance.lastStatusCheck && (
                                <p><span className="font-medium">Última verificação:</span> {new Date(instance.lastStatusCheck).toLocaleString('pt-BR')}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckStatus(instance)}
                              disabled={checkingStatus.has(instance.id)}
                              title="Verificar Status"
                            >
                              {checkingStatus.has(instance.id) ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <RefreshCw className="h-4 w-4 mr-1" />
                              )}
                              Status
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfigureAI(instance)}
                            >
                              {configuringInstances.has(instance.id) ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Bot className="h-4 w-4 mr-1" />
                              )}
                              Configurar IA
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfigureWhatsApp(instance)}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Configurar WhatsApp
                            </Button>
                            {instance.status === 'disconnected' && (
                              <Button
                                size="sm"
                                onClick={() => handleConnectInstance(instance)}
                                disabled={connectingInstances.has(instance.id)}
                                className="flex items-center gap-2"
                              >
                                {connectingInstances.has(instance.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4" />
                                )}
                                {connectingInstances.has(instance.id) ? "Conectando..." : "Conectar"}
                              </Button>
                            )}
                            
                            {instance.status === 'connected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled
                              >
                                <PowerOff className="h-4 w-4 mr-2" />
                                Conectado
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteInstance(instance)}
                              disabled={deletingInstances.has(instance.id)}
                            >
                              {deletingInstances.has(instance.id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma instância WhatsApp criada ainda.</p>
                      <p className="text-sm">Clique em "Nova Instância" para começar.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Aba de Instâncias & Agentes */}
            <TabsContent value="instance-agents">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link className="h-5 w-5" />
                      Nova Vinculação Instância & Agente
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Vincule uma instância conectada a um agente específico para automatizar o atendimento
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="instanceSelect">Instância WhatsApp</Label>
                        <select
                          id="instanceSelect"
                          value={newBinding.instanceId}
                          onChange={(e) => setNewBinding({...newBinding, instanceId: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Selecione uma instância</option>
                          {instances?.filter((instance: AdminWhatsAppInstance) => instance.isActive)
                            .map((instance: AdminWhatsAppInstance) => {
                              const hasActiveBinding = instanceAgentBindings.some(
                                binding => binding.instanceId === instance.id && binding.isActive
                              );
                              return (
                                <option 
                                  key={instance.id} 
                                  value={instance.id}
                                  disabled={hasActiveBinding}
                                >
                                  {instance.instanceName} {hasActiveBinding ? '(já vinculada)' : ''}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="agentSelect">Agente</Label>
                        <select
                          id="agentSelect"
                          value={newBinding.agentId}
                          onChange={(e) => setNewBinding({...newBinding, agentId: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded-md"
                          disabled={false} // Remove loading disable for now
                        >
                          <option value="">
                            {agentsLoading ? 'Carregando agentes...' : 
                             agentsError ? 'Erro ao carregar agentes' :
                             agents.length === 0 ? 'Nenhum agente disponível' :
                             'Selecione um agente'}
                          </option>
                          {(() => {
                            console.log('🔍 All agents:', agents);
                            console.log('🔍 Agents length:', agents.length);
                            const activeAgents = agents.filter(agent => {
                              console.log('🔍 Checking agent:', agent.name, 'isActive:', agent.isActive, 'type:', typeof agent.isActive);
                              return agent.isActive;
                            });
                            console.log('🔍 Active agents:', activeAgents);
                            console.log('🔍 Active agents length:', activeAgents.length);
                            
                            return activeAgents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name} - {agent.type === 'global' ? 'Global' : 'Franquia'}
                              </option>
                            ));
                          })()}
                        </select>
                        {agentsError && (
                          <p className="text-red-500 text-sm mt-1">
                            Erro: {agentsError.message}
                          </p>
                        )}
                        <p className="text-gray-500 text-sm mt-1">
                          Debug: {agents.length} agentes carregados
                        </p>
                        <button 
                          type="button"
                          onClick={() => {
                            console.log('🔄 Force refresh agents');
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-agents"] });
                          }}
                          className="text-blue-500 text-sm underline mt-1"
                        >
                          🔄 Recarregar Agentes (Debug)
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <Bot className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium mb-1">Como funciona a vinculação:</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>Cada instância pode ter apenas um agente ativo por vez</li>
                            <li>O agente processará automaticamente as mensagens recebidas na instância</li>
                            <li>Você pode ativar/desativar vinculações sem removê-las</li>
                            <li>Agentes globais podem ser usados em múltiplas franquias</li>
                            <li>Agentes de franquia são específicos para cada franqueado</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleCreateBinding} className="w-full">
                      <Link className="h-4 w-4 mr-2" />
                      Criar Vinculação
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Vinculações Ativas</CardTitle>
                    <p className="text-sm text-gray-600">
                      Gerencie as vinculações entre instâncias e agentes
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {instanceAgentBindings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhuma vinculação configurada</p>
                          <p className="text-sm">Crie uma vinculação para começar a automatizar o atendimento</p>
                        </div>
                      ) : (
                        instanceAgentBindings.map((binding) => (
                          <div key={binding.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${
                                    binding.instance?.status === 'connected' ? 'bg-green-500' : 
                                    binding.instance?.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold">
                                      {binding.instance?.instanceName || 'Instância não encontrada'}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {binding.instance?.instanceKey}
                                    </span>
                                    {binding.instance?.phoneNumber && (
                                      <span className="text-xs text-gray-500 flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {binding.instance.phoneNumber}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                  <Link className="h-4 w-4 text-gray-400" />
                                  <div className="flex flex-col">
                                    <span className="font-medium flex items-center gap-2">
                                      <Bot className="h-3 w-3" />
                                      {binding.agent?.name || 'Agente não encontrado'}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                      {binding.agent?.type === 'global' ? 'Agente Global' : 'Agente de Franquia'}
                                    </span>
                                    {binding.agent?.description && (
                                      <span className="text-xs text-gray-500">
                                        {binding.agent.description}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant={binding.isActive ? "default" : "secondary"}>
                                  {binding.isActive ? 'Ativo' : 'Inativo'}
                                </Badge>
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleToggleBinding(binding.id)}
                                  title={binding.isActive ? 'Desativar vinculação' : 'Ativar vinculação'}
                                >
                                  {binding.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                                
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteBinding(binding.id)}
                                  title="Remover vinculação"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="mt-3 pt-3 border-t">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>
                                  Criado em: {new Date(binding.createdAt).toLocaleString('pt-BR')}
                                </span>
                                <span>
                                  Status da instância: {binding.instance?.status === 'connected' ? 'Conectado' : 
                                    binding.instance?.status === 'connecting' ? 'Conectando' : 'Desconectado'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Card de Resumo */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Resumo do Sistema
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {instances?.filter((i: AdminWhatsAppInstance) => i.isActive).length || 0}
                        </div>
                        <div className="text-sm text-blue-800">Instâncias Ativas</div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {instances?.filter((i: AdminWhatsAppInstance) => i.status === 'connected').length || 0}
                        </div>
                        <div className="text-sm text-green-800">Instâncias Conectadas</div>
                      </div>
                      
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {agents.filter(a => a.isActive).length}
                        </div>
                        <div className="text-sm text-purple-800">Agentes Disponíveis</div>
                      </div>
                      
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {instanceAgentBindings.filter(b => b.isActive).length}
                        </div>
                        <div className="text-sm text-orange-800">Vinculações Ativas</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Seção original sem abas para quando API não estiver configurada */}
        {isApiConfigured && false && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Instâncias WhatsApp
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (instances && instances.length > 0) {
                        instances.forEach((instance: AdminWhatsAppInstance) => {
                          handleCheckStatus(instance);
                        });
                      }
                    }}
                    disabled={instances?.length === 0 || checkingStatus.size > 0}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Verificar Todos
                  </Button>
                  <Dialog open={showInstanceModal} onOpenChange={setShowInstanceModal}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Nova Instância
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Instância WhatsApp</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateInstance} className="space-y-4">
                      <div>
                        <Label htmlFor="instanceName">Nome da Instância</Label>
                        <Input
                          id="instanceName"
                          value={formData.instanceName}
                          onChange={(e) => setFormData(prev => ({ ...prev, instanceName: e.target.value }))}
                          placeholder="Ex: WhatsApp Principal"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="phoneNumber">Número de Telefone</Label>
                        <Input
                          id="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="Ex: +5511999999999"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowInstanceModal(false)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createInstanceMutation.isPending}
                        >
                          {createInstanceMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Plus className="h-4 w-4 mr-2" />
                          )}
                          Criar Instância
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {instancesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Carregando instâncias...</span>
                </div>
              ) : instances && instances.length > 0 ? (
                <div className="space-y-4">
                  {instances.map((instance: AdminWhatsAppInstance) => (
                    <div
                      key={instance.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{instance.instanceName}</h3>
                          {getStatusBadge(instance.status)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Telefone:</span> {instance.phoneNumber}</p>
                          <p><span className="font-medium">Chave:</span> {instance.instanceKey}</p>
                          {instance.lastConnection && (
                            <p><span className="font-medium">Última conexão:</span> {new Date(instance.lastConnection).toLocaleString()}</p>
                          )}
                          {instance.lastStatusCheck && (
                            <p><span className="font-medium">Última verificação:</span> {new Date(instance.lastStatusCheck).toLocaleString('pt-BR')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckStatus(instance)}
                          disabled={checkingStatus.has(instance.id)}
                          title="Verificar Status"
                        >
                          {checkingStatus.has(instance.id) ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-1" />
                          )}
                          Status
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigureAI(instance)}
                        >
                          {configuringInstances.has(instance.id) ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Bot className="h-4 w-4 mr-1" />
                          )}
                          Configurar IA
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigureWhatsApp(instance)}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar WhatsApp
                        </Button>
                        {instance.status === 'disconnected' && (
                          <Button
                            size="sm"
                            onClick={() => handleConnectInstance(instance)}
                            disabled={connectingInstances.has(instance.id)}
                            className="flex items-center gap-2"
                          >
                            {connectingInstances.has(instance.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                            {connectingInstances.has(instance.id) ? "Conectando..." : "Conectar"}
                          </Button>
                        )}
                        
                        {instance.status === 'connected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled
                          >
                            <PowerOff className="h-4 w-4 mr-2" />
                            Conectado
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteInstance(instance)}
                          disabled={deletingInstances.has(instance.id)}
                        >
                          {deletingInstances.has(instance.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma instância WhatsApp criada ainda.</p>
                  <p className="text-sm">Clique em "Nova Instância" para começar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* QR Code Modal */}
        <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600" />
                Conectar WhatsApp
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code com seu WhatsApp para conectar a instância.
              </DialogDescription>
            </DialogHeader>
            {qrCodeData && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {qrCodeData.instanceName}
                  </h3>
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                      <img 
                        src={qrCodeData.qrCode}
                        alt="QR Code WhatsApp"
                        className="w-64 h-64 object-contain"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>📱 <strong>1.</strong> Abra o WhatsApp no seu telefone</p>
                    <p>⚙️ <strong>2.</strong> Vá em Configurações → Aparelhos conectados</p>
                    <p>📷 <strong>3.</strong> Toque em "Conectar um aparelho"</p>
                    <p>🔍 <strong>4.</strong> Escaneie este QR code</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowQRModal(false)}>Fechar</Button>
              <Button onClick={() => {
                if (qrCodeData) {
                  // Regenerar QR code (reutiliza connect endpoint com id)
                  connectInstanceMutation.mutate(qrCodeData.id);
                }
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar QR
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Instância</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a instância "{instanceToDelete?.instanceName}"? 
                Esta ação não pode ser desfeita e a instância será removida da Evolution API.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteInstance}
                className="bg-red-600 hover:bg-red-700"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* WhatsApp Config Modal */}
        <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                Configurar WhatsApp
              </DialogTitle>
              <DialogDescription>
                Configure as opções avançadas do WhatsApp para esta instância.
              </DialogDescription>
            </DialogHeader>

            {instanceToConfig && (
              <div className="space-y-6">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900">
                    {instanceToConfig.instanceName}
                  </h3>
                  <p className="text-sm text-blue-700">
                    Telefone: {instanceToConfig.phoneNumber}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Rejeitar Chamadas</Label>
                      <p className="text-sm text-gray-500">Rejeitar automaticamente chamadas recebidas</p>
                    </div>
                    <Switch checked={configData.rejectCall} onCheckedChange={(checked) => setConfigData(prev => ({ ...prev, rejectCall: checked }))} />
                  </div>

                  {configData.rejectCall && (
                    <div className="space-y-2">
                      <Label htmlFor="msgCall">Mensagem de Rejeição</Label>
                      <Input id="msgCall" value={configData.msgCall} onChange={(e) => setConfigData(prev => ({ ...prev, msgCall: e.target.value }))} placeholder="Mensagem quando chamadas forem rejeitadas" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Ignorar Grupos</Label>
                      <p className="text-sm text-gray-500">Não processar mensagens de grupos</p>
                    </div>
                    <Switch checked={configData.groupsIgnore} onCheckedChange={(checked) => setConfigData(prev => ({ ...prev, groupsIgnore: checked }))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Sempre Online</Label>
                      <p className="text-sm text-gray-500">Manter status sempre online</p>
                    </div>
                    <Switch checked={configData.alwaysOnline} onCheckedChange={(checked) => setConfigData(prev => ({ ...prev, alwaysOnline: checked }))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="spacey-0.5">
                      <Label className="text-base font-medium">Ler Mensagens</Label>
                      <p className="text-sm text-gray-500">Marcar mensagens como lidas automaticamente</p>
                    </div>
                    <Switch checked={configData.readMessages} onCheckedChange={(checked) => setConfigData(prev => ({ ...prev, readMessages: checked }))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Sincronizar Histórico</Label>
                      <p className="text-sm text-gray-500">Sincronizar histórico completo de mensagens</p>
                    </div>
                    <Switch checked={configData.syncFullHistory} onCheckedChange={(checked) => setConfigData(prev => ({ ...prev, syncFullHistory: checked }))} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-medium">Status de Leitura</Label>
                      <p className="text-sm text-gray-500">Enviar confirmação de leitura</p>
                    </div>
                    <Switch checked={configData.readStatus} onCheckedChange={(checked) => setConfigData(prev => ({ ...prev, readStatus: checked }))} />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancelar</Button>
                  <Button onClick={handleSaveConfig} disabled={configuringInstances.has(instanceToConfig.id)}>
                    {configuringInstances.has(instanceToConfig.id) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
                    Salvar Configurações
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
} 