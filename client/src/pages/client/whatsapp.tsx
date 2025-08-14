import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Loader2, 
  Plus,
  Smartphone,
  Check,
  Unplug,
  Bot,
  Settings,
  Trash2,
  RefreshCw,
  ExternalLink,
  Copy,
  Link
} from "lucide-react";

interface WhatsAppInstance {
  id: string;
  instanceName: string;
  instanceKey: string;
  phoneNumber: string;
  status: string;
  webhook?: string;
  qrCode?: string;
  lastConnection?: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminWhatsAppSettings {
  evolutionApiUrl: string;
  globalToken: string;
  systemUrl?: string;
  isActive: boolean;
}

interface CustomAgent {
  id: string;
  name: string;
  description?: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  isActive: boolean;
  createdAt: string;
}

interface InstanceAgentBinding {
  id: string;
  instanceId: string;
  agentId: string;
  isActive: boolean;
  createdAt: string;
  instance?: WhatsAppInstance;
  agent?: CustomAgent;
}

export default function ClientWhatsAppPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<WhatsAppInstance | null>(null);
  const [instanceToConfig, setInstanceToConfig] = useState<WhatsAppInstance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ qrCode: string; instanceName: string; instanceKey: string } | null>(null);
  const [createdInstance, setCreatedInstance] = useState<WhatsAppInstance | null>(null);
  const [verifyingInstances, setVerifyingInstances] = useState<Set<string>>(new Set());
  const [connectingInstances, setConnectingInstances] = useState<Set<string>>(new Set());
  const [deletingInstances, setDeletingInstances] = useState<Set<string>>(new Set());
  const [configuringInstances, setConfiguringInstances] = useState<Set<string>>(new Set());
  const [statusIntervals, setStatusIntervals] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [formData, setFormData] = useState({
    instanceName: "",
    phoneNumber: "",
  });
  const [configData, setConfigData] = useState({
    rejectCall: true,
    msgCall: "I do not accept calls",
    groupsIgnore: true,
    alwaysOnline: true,
    readMessages: true,
    syncFullHistory: false,
    readStatus: true
  });

  // Estados para vincular agentes
  const [activeTab, setActiveTab] = useState("instances");
  const [showBindingModal, setShowBindingModal] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string>("");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [isCreatingBinding, setIsCreatingBinding] = useState(false);

  // Fetch admin WhatsApp settings to get URL and token
  const { data: adminSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-whatsapp-settings"],
    queryFn: async () => {
      const response = await fetch("/api/franchise/whatsapp-settings", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar configurações do administrador");
      }
      
      return response.json() as Promise<AdminWhatsAppSettings>;
    },
  });

  // Fetch existing instances
  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      // Usar sempre a rota de franquia
      const response = await fetch("/api/franchise/whatsapp-instances", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar instâncias");
      }
      
      return response.json() as Promise<WhatsAppInstance[]>;
    },
    enabled: !!user, // Só executar quando o usuário estiver carregado
  });

  // Fetch custom agents
  const { data: customAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ["custom-agents"],
    queryFn: async () => {
      const response = await fetch("/api/franchise/custom-agents", {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error("Falha ao carregar agentes personalizados");
      }
      
      return response.json() as Promise<CustomAgent[]>;
    },
  });

  // Fetch instance-agent bindings
  const { data: bindings, isLoading: bindingsLoading } = useQuery({
    queryKey: ["instance-agent-bindings"],
    queryFn: async () => {
      const response = await fetch("/api/franchise/instance-agent-bindings", {
        credentials: "include",
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error("Falha ao carregar vinculações");
      }
      
      return response.json() as Promise<InstanceAgentBinding[]>;
    },
  });

  // Create instance mutation
  const createInstanceMutation = useMutation({
    mutationFn: async (data: { instanceName: string; phoneNumber: string }) => {
      const response = await fetch("/api/client/whatsapp-instances", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao criar instância");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Instância Criada",
        description: "Instância do WhatsApp criada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      setFormData({ instanceName: "", phoneNumber: "" });
      
      // Definir a instância criada e abrir o modal
      setCreatedInstance(data.instance);
      setShowInstanceModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar instância",
        variant: "destructive",
      });
    },
  });

  // Create binding mutation
  const createBindingMutation = useMutation({
    mutationFn: async (data: { instanceId: string; agentId: string }) => {
      const response = await fetch("/api/client/instance-agent-bindings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao criar vinculação");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vinculação Criada",
        description: "Instância vinculada ao agente com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["instance-agent-bindings"] });
      setShowBindingModal(false);
      setSelectedInstance("");
      setSelectedAgent("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar vinculação",
        variant: "destructive",
      });
    },
  });

  // Delete binding mutation
  const deleteBindingMutation = useMutation({
    mutationFn: async (bindingId: string) => {
      const response = await fetch(`/api/client/instance-agent-bindings/${bindingId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao deletar vinculação");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Vinculação Removida",
        description: "Vinculação removida com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["instance-agent-bindings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover vinculação",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.instanceName.trim() || !formData.phoneNumber.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

           if (!adminSettings?.evolutionApiUrl || !adminSettings?.globalToken) {
         toast({
           title: "Erro",
           description: "Configurações da API não encontradas. Entre em contato com o administrador.",
           variant: "destructive",
         });
         return;
       }

       // Verificar se as configurações estão ativas
       if (!adminSettings?.isActive) {
         toast({
           title: "Erro",
           description: "Configurações da API WhatsApp estão inativas. Entre em contato com o administrador.",
           variant: "destructive",
         });
         return;
       }

    setIsCreating(true);
    try {
      await createInstanceMutation.mutateAsync(formData);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Funções auxiliares para o modal
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  // Função para verificar o status de uma instância específica via Evolution API
  const checkInstanceStatus = async (instanceKey: string): Promise<string | null> => {
    if (!adminSettings?.evolutionApiUrl || !adminSettings?.globalToken) {
      return null;
    }

    try {
      const response = await fetch(`${adminSettings.evolutionApiUrl}/instance/connectionState/${instanceKey}`, {
        method: 'GET',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Error checking status for ${instanceKey}:`, response.status);
        return null;
      }

      const data = await response.json();
      return data.instance?.state || null;
    } catch (error) {
      console.error(`Error checking status for ${instanceKey}:`, error);
      return null;
    }
  };

  // Função para atualizar o status da instância no banco de dados
  const updateInstanceStatus = async (instanceId: string, status: string) => {
    try {
      const response = await fetch(`/api/client/whatsapp-instances/${instanceId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        console.error('Failed to update instance status in database');
      }
    } catch (error) {
      console.error('Error updating instance status:', error);
    }
  };

  // Função para iniciar verificação automática
  const startStatusMonitoring = (instance: WhatsAppInstance, isConnecting = false) => {
    // Limpar interval existente se houver
    const existingInterval = statusIntervals.get(instance.id);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Verificar imediatamente
    checkAndUpdateStatus(instance);

    // Configurar verificação apenas se conectando
    if (isConnecting) {
      const interval = setInterval(async () => {
        await checkAndUpdateStatus(instance);
      }, 10000); // 10s se conectando

      // Armazenar o interval
      setStatusIntervals(prev => new Map(prev.set(instance.id, interval)));

      toast({
        title: "Monitoramento Iniciado",
        description: `Verificando conexão de "${instance.instanceName}" a cada 10 segundos`,
      });
    }
  };

  // Função para verificar e atualizar status
  const checkAndUpdateStatus = async (instance: WhatsAppInstance) => {
    const newStatus = await checkInstanceStatus(instance.instanceKey);
    
    if (newStatus && newStatus !== instance.status) {
      // Mapear status da Evolution API para nosso sistema
      let mappedStatus = newStatus;
      if (newStatus === 'open') {
        mappedStatus = 'connected';
      } else if (newStatus === 'close' || newStatus === 'closed') {
        mappedStatus = 'disconnected';
      }
      
      // Atualizar no banco de dados
      await updateInstanceStatus(instance.id, mappedStatus);
      
      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      
      // Mostrar notificação se o status mudou
      const statusEmoji = mappedStatus === 'connected' ? '🟢' : 
                         mappedStatus === 'connecting' ? '🟡' : '🔴';
      
      toast({
        title: "Status Atualizado",
        description: `${statusEmoji} ${instance.instanceName}: ${mappedStatus}`,
        variant: mappedStatus === 'connected' ? 'default' : 'destructive'
      });
      
      // Se conectou com sucesso, parar monitoramento automático
      if (mappedStatus === 'connected') {
        stopStatusMonitoring(instance.id);
      }
    }
  };

  // Função para parar monitoramento
  const stopStatusMonitoring = (instanceId: string) => {
    const interval = statusIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      setStatusIntervals(prev => {
        const newMap = new Map(prev);
        newMap.delete(instanceId);
        return newMap;
      });
      
      toast({
        title: "Monitoramento Parado",
        description: "Verificação automática de status interrompida",
      });
    }
  };

  // Handler para o botão verificar
  const handleVerifyInstance = (instance?: WhatsAppInstance) => {
    if (!instance) {
      toast({
        title: "Erro",
        description: "Instância não encontrada",
        variant: "destructive",
      });
      return;
    }

    setVerifyingInstances(prev => new Set(prev.add(instance.id)));
    
    // Iniciar monitoramento automático
    startStatusMonitoring(instance);
    
    setTimeout(() => {
      setVerifyingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instance.id);
        return newSet;
      });
    }, 2000);
  };

  // Limpar intervalos quando o componente for desmontado
  React.useEffect(() => {
    return () => {
      statusIntervals.forEach(interval => clearInterval(interval));
    };
  }, [statusIntervals]);

  // Função para conectar instância e obter QR code
  const connectInstance = async (instanceKey: string): Promise<string | null> => {
    if (!adminSettings?.evolutionApiUrl || !adminSettings?.globalToken) {
      return null;
    }

    try {
      const response = await fetch(`${adminSettings.evolutionApiUrl}/instance/connect/${instanceKey}`, {
        method: 'GET',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Error connecting instance ${instanceKey}:`, response.status);
        return null;
      }

      const data = await response.json();
      return data.base64 || data.qrcode || null; // QR code em base64
    } catch (error) {
      console.error(`Error connecting instance ${instanceKey}:`, error);
      return null;
    }
  };

  // Função para desconectar instância
  const disconnectInstance = async (instanceKey: string): Promise<boolean> => {
    if (!adminSettings?.evolutionApiUrl || !adminSettings?.globalToken) {
      return false;
    }

    try {
      const response = await fetch(`${adminSettings.evolutionApiUrl}/instance/logout/${instanceKey}`, {
        method: 'DELETE',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error(`Error disconnecting instance ${instanceKey}:`, error);
      return false;
    }
  };

  // Handler para conectar/desconectar instância
  const handleConnectionToggle = async (instance: WhatsAppInstance) => {
    if (instance.status === 'connected' || instance.status === 'open') {
      // Desconectar
      setConnectingInstances(prev => new Set(prev.add(instance.id)));
      
      const success = await disconnectInstance(instance.instanceKey);
      
      if (success) {
        // Atualizar status no banco
        await updateInstanceStatus(instance.id, 'disconnected');
        
        toast({
          title: "Desconectado",
          description: `${instance.instanceName} foi desconectado com sucesso`,
        });
        
        // Atualizar lista
        queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao desconectar a instância",
          variant: "destructive",
        });
      }
      
      setConnectingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instance.id);
        return newSet;
      });
    } else {
      // Conectar
      setConnectingInstances(prev => new Set(prev.add(instance.id)));
      
      const qrCode = await connectInstance(instance.instanceKey);
      
      if (qrCode) {
        // Mostrar QR code
        setQrCodeData({
          qrCode,
          instanceName: instance.instanceName,
          instanceKey: instance.instanceKey
        });
        setShowQRModal(true);
        
        // Atualizar status para connecting
        await updateInstanceStatus(instance.id, 'connecting');
        
        // Iniciar monitoramento frequente durante conexão
        startStatusMonitoring(instance, true);
        
        toast({
          title: "Conectando",
          description: `QR Code gerado para ${instance.instanceName}`,
        });
        
        // Atualizar lista
        queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao gerar QR Code",
          variant: "destructive",
        });
      }
      
      setConnectingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instance.id);
        return newSet;
      });
    }
  };

  // Função para determinar o texto do botão de conexão
  const getConnectionButtonText = (status: string) => {
    switch (status) {
      case 'connected':
      case 'open':
        return 'DESCONECTAR';
      case 'connecting':
        return 'Conectando...';
      default:
        return 'Conectar';
    }
  };

  // Função para determinar a cor do botão de conexão
  const getConnectionButtonStyle = (status: string) => {
    switch (status) {
      case 'connected':
      case 'open':
        return 'text-green-600 border-green-300 hover:bg-green-50';
      case 'connecting':
        return 'text-yellow-600 border-yellow-300 hover:bg-yellow-50';
      default:
        return 'text-red-600 border-red-300 hover:bg-red-50';
    }
  };

  // Função para deletar instância da Evolution API
  const deleteInstanceFromAPI = async (instanceKey: string): Promise<boolean> => {
    if (!adminSettings?.evolutionApiUrl || !adminSettings?.globalToken) {
      return false;
    }

    try {
      const response = await fetch(`${adminSettings.evolutionApiUrl}/instance/delete/${instanceKey}`, {
        method: 'DELETE',
        headers: {
          'apikey': adminSettings.globalToken,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error(`Error deleting instance ${instanceKey} from API:`, error);
      return false;
    }
  };

  // Função para deletar instância do banco de dados
  const deleteInstanceFromDatabase = async (instanceId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/client/whatsapp-instances/${instanceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting instance from database:', error);
      return false;
    }
  };

  // Funções para vincular agentes
  const handleCreateBinding = () => {
    if (!selectedInstance || !selectedAgent) {
      toast({
        title: "Erro",
        description: "Selecione uma instância e um agente",
        variant: "destructive",
      });
      return;
    }

    // Verificar se já existe uma vinculação para esta instância
    const existingBinding = bindings?.find(b => b.instanceId === selectedInstance);
    if (existingBinding) {
      toast({
        title: "Erro",
        description: "Esta instância já está vinculada a um agente",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingBinding(true);
    createBindingMutation.mutate({
      instanceId: selectedInstance,
      agentId: selectedAgent
    });
  };

  const handleDeleteBinding = (bindingId: string) => {
    deleteBindingMutation.mutate(bindingId);
  };

  const getInstanceName = (instanceId: string) => {
    const instance = instances?.find(i => i.id === instanceId);
    return instance ? instance.instanceName : 'Instância não encontrada';
  };

  const getAgentName = (agentId: string) => {
    const agent = customAgents?.find(a => a.id === agentId);
    return agent ? agent.name : 'Agente não encontrado';
  };

  // Handler para confirmar exclusão
  const handleDeleteInstance = (instance: WhatsAppInstance) => {
    setInstanceToDelete(instance);
    setShowDeleteModal(true);
  };

  // Handler para executar a exclusão
  const confirmDeleteInstance = async () => {
    if (!instanceToDelete) return;

    setDeletingInstances(prev => new Set(prev.add(instanceToDelete.id)));
    setShowDeleteModal(false);

    try {
      // Parar monitoramento se estiver ativo
      stopStatusMonitoring(instanceToDelete.id);

      // 1. Deletar da Evolution API
      const apiSuccess = await deleteInstanceFromAPI(instanceToDelete.instanceKey);
      
      if (!apiSuccess) {
        toast({
          title: "Aviso",
          description: "Falha ao deletar da Evolution API, mas continuando com exclusão local",
          variant: "destructive",
        });
      }

      // 2. Deletar do banco de dados
      const dbSuccess = await deleteInstanceFromDatabase(instanceToDelete.id);

      if (dbSuccess) {
        toast({
          title: "Instância Excluída",
          description: `${instanceToDelete.instanceName} foi excluída com sucesso`,
        });

        // Atualizar lista
        queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      } else {
        toast({
          title: "Erro",
          description: "Falha ao excluir instância do banco de dados",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro inesperado ao excluir instância",
        variant: "destructive",
      });
    } finally {
      setDeletingInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instanceToDelete.id);
        return newSet;
      });
      setInstanceToDelete(null);
    }
  };

  // Configure AI webhook mutation
  const configureAIWebhookMutation = useMutation({
    mutationFn: async (instanceKey: string) => {
      const response = await fetch(`/api/client/whatsapp-instances/${instanceKey}/webhook`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao configurar webhook da IA");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "IA Configurada",
        description: "Webhook da IA configurado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao configurar webhook da IA",
        variant: "destructive",
      });
    },
  });

  const handleConfigureAI = async (instance?: WhatsAppInstance) => {
    if (!instance) {
      toast({
        title: "Erro",
        description: "Instância não encontrada",
        variant: "destructive",
      });
      return;
    }

    setConfiguringInstances(prev => new Set(prev.add(instance.id)));
    
    try {
      await configureAIWebhookMutation.mutateAsync(instance.instanceKey);
    } finally {
      setConfiguringInstances(prev => {
        const newSet = new Set(prev);
        newSet.delete(instance.id);
        return newSet;
      });
    }
  };

  const handleConfigureWhatsApp = (instance: WhatsAppInstance) => {
    setInstanceToConfig(instance);
    setShowConfigModal(true);
  };

  // Configurar WhatsApp instance
  const configureWhatsAppInstance = useMutation({
    mutationFn: async ({ instanceKey, settings }: { instanceKey: string; settings: any }) => {
      const response = await fetch(`/api/client/whatsapp-instances/${instanceKey}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao configurar instância");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações Salvas",
        description: "Configurações do WhatsApp aplicadas com sucesso!",
      });
      setShowConfigModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aplicar configurações",
        variant: "destructive",
      });
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

  const getWebhookUrl = (instanceKey: string) => {
    // Use systemUrl from admin settings if available, otherwise fallback to current origin
    const baseUrl = adminSettings?.systemUrl || window.location.origin;
    return `${baseUrl}/api/client/whatsapp-webhook/${instanceKey}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (settingsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-2xl sm:max-w-lg">
          <DialogHeader className="space-y-3">
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              Excluir Instância
            </DialogTitle>
            <DialogDescription className="text-base text-gray-600">
              Esta ação não pode ser desfeita. A instância será removida permanentemente.
            </DialogDescription>
          </DialogHeader>

          {instanceToDelete && (
            <div className="space-y-6">
              {/* Detalhes da Instância */}
              <div className="p-5 bg-red-50 border border-red-200 rounded-xl">
                <h3 className="font-bold text-red-900 text-lg mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  {instanceToDelete.instanceName}
                </h3>
                <div className="grid gap-3 text-sm text-red-700">
                  <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <span className="text-pink-500">📞</span>
                    <div>
                      <span className="font-semibold">Telefone:</span>
                      <span className="ml-2 font-mono">{instanceToDelete.phoneNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <span className="text-yellow-500">🔑</span>
                    <div>
                      <span className="font-semibold">Instance Key:</span>
                      <span className="ml-2 font-mono text-xs break-all">{instanceToDelete.instanceKey}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/50 rounded-lg">
                    <span className="text-green-500">📊</span>
                    <div>
                      <span className="font-semibold">Status:</span>
                      <span className="ml-2 font-mono">{instanceToDelete.status}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Consequências da Ação */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <span className="text-yellow-600 text-lg">⚠️</span>
                  </div>
                  <h4 className="font-bold text-yellow-800 text-lg">Atenção: Esta ação irá:</h4>
                </div>
                <ul className="space-y-3 text-sm text-yellow-700">
                  <li className="flex items-start gap-3">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Remover a instância da Evolution API</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Excluir todos os dados do banco</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Parar qualquer monitoramento ativo</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-yellow-600 mt-1">•</span>
                    <span>Desconectar o WhatsApp vinculado</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-6">
            <Button 
              variant="outline" 
              className="w-full sm:w-auto order-2 sm:order-1"
              onClick={() => {
                setShowDeleteModal(false);
                setInstanceToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              className="w-full sm:w-auto order-1 sm:order-2"
              onClick={confirmDeleteInstance}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal do QR Code */}
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
                
                {/* QR Code */}
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
            <Button 
              variant="outline" 
              onClick={() => {
                setShowQRModal(false);
                setQrCodeData(null);
              }}
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                if (qrCodeData) {
                  // Regenerar QR code
                  connectInstance(qrCodeData.instanceKey).then(newQrCode => {
                    if (newQrCode) {
                      setQrCodeData({
                        qrCode: newQrCode,
                        instanceName: qrCodeData.instanceName,
                        instanceKey: qrCodeData.instanceKey
                      });
                      toast({
                        title: "QR Code Atualizado",
                        description: "Novo QR Code gerado",
                      });
                    }
                  });
                }
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar QR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração do WhatsApp */}
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
                {/* Rejeitar Chamadas */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Rejeitar Chamadas</Label>
                    <p className="text-sm text-gray-500">
                      Rejeitar automaticamente chamadas recebidas
                    </p>
                  </div>
                  <Switch
                    checked={configData.rejectCall}
                    onCheckedChange={(checked) => 
                      setConfigData(prev => ({ ...prev, rejectCall: checked }))
                    }
                  />
                </div>

                {/* Mensagem de Chamada */}
                {configData.rejectCall && (
                  <div className="space-y-2">
                    <Label htmlFor="msgCall">Mensagem de Rejeição</Label>
                    <Input
                      id="msgCall"
                      value={configData.msgCall}
                      onChange={(e) => 
                        setConfigData(prev => ({ ...prev, msgCall: e.target.value }))
                      }
                      placeholder="Mensagem quando chamadas forem rejeitadas"
                    />
                  </div>
                )}

                {/* Ignorar Grupos */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Ignorar Grupos</Label>
                    <p className="text-sm text-gray-500">
                      Não processar mensagens de grupos
                    </p>
                  </div>
                  <Switch
                    checked={configData.groupsIgnore}
                    onCheckedChange={(checked) => 
                      setConfigData(prev => ({ ...prev, groupsIgnore: checked }))
                    }
                  />
                </div>

                {/* Sempre Online */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Sempre Online</Label>
                    <p className="text-sm text-gray-500">
                      Manter status sempre online
                    </p>
                  </div>
                  <Switch
                    checked={configData.alwaysOnline}
                    onCheckedChange={(checked) => 
                      setConfigData(prev => ({ ...prev, alwaysOnline: checked }))
                    }
                  />
                </div>

                {/* Ler Mensagens */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Ler Mensagens</Label>
                    <p className="text-sm text-gray-500">
                      Marcar mensagens como lidas automaticamente
                    </p>
                  </div>
                  <Switch
                    checked={configData.readMessages}
                    onCheckedChange={(checked) => 
                      setConfigData(prev => ({ ...prev, readMessages: checked }))
                    }
                  />
                </div>

                {/* Histórico Completo */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Sincronizar Histórico</Label>
                    <p className="text-sm text-gray-500">
                      Sincronizar histórico completo de mensagens
                    </p>
                  </div>
                  <Switch
                    checked={configData.syncFullHistory}
                    onCheckedChange={(checked) => 
                      setConfigData(prev => ({ ...prev, syncFullHistory: checked }))
                    }
                  />
                </div>

                {/* Status de Leitura */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Status de Leitura</Label>
                    <p className="text-sm text-gray-500">
                      Enviar confirmação de leitura
                    </p>
                  </div>
                  <Switch
                    checked={configData.readStatus}
                    onCheckedChange={(checked) => 
                      setConfigData(prev => ({ ...prev, readStatus: checked }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowConfigModal(false);
                setInstanceToConfig(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveConfig}
              disabled={instanceToConfig ? configuringInstances.has(instanceToConfig.id) : false}
            >
              {instanceToConfig && configuringInstances.has(instanceToConfig.id) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              Aplicar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal da Instância Criada */}
      <Dialog open={showInstanceModal} onOpenChange={setShowInstanceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-green-600" />
              Instância Criada com Sucesso!
            </DialogTitle>
            <DialogDescription>
              Sua instância WhatsApp foi criada e está pronta para configuração.
            </DialogDescription>
          </DialogHeader>

          {createdInstance && (
            <div className="space-y-6">
              {/* Informações da Instância */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-green-900">{createdInstance.instanceName}</h3>
                    <p className="text-sm text-green-700">Telefone: {createdInstance.phoneNumber}</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {createdInstance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                  </Badge>
                </div>

                {/* Webhook URL */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Webhook URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={getWebhookUrl(createdInstance.instanceKey)}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getWebhookUrl(createdInstance.instanceKey))}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Use esta URL como webhook na Evolution API
                  </p>
                </div>

                {/* Status e Informações */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Status:</span>
                    <p className="text-gray-900">{createdInstance.status}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Criado em:</span>
                    <p className="text-gray-900">{formatDate(createdInstance.createdAt)}</p>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVerifyInstance(createdInstance)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={createdInstance ? verifyingInstances.has(createdInstance.id) : false}
                  >
                    {createdInstance && verifyingInstances.has(createdInstance.id) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Verificar Status
                  </Button>
                  {createdInstance && statusIntervals.has(createdInstance.id) && (
                    <Button
                      onClick={() => stopStatusMonitoring(createdInstance.id)}
                      variant="outline"
                      className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Parar Monitor
                    </Button>
                  )}
                  <Button
                    onClick={() => createdInstance && handleConnectionToggle(createdInstance)}
                    variant="outline"
                    className={`flex-1 ${createdInstance ? getConnectionButtonStyle(createdInstance.status) : 'border-red-300 text-red-600 hover:bg-red-50'}`}
                    disabled={createdInstance ? connectingInstances.has(createdInstance.id) : false}
                  >
                    {createdInstance && connectingInstances.has(createdInstance.id) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Unplug className="h-4 w-4 mr-2" />
                    )}
                    {createdInstance ? getConnectionButtonText(createdInstance.status) : 'Desconectar'}
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleConfigureAI(createdInstance)}
                    variant="outline"
                    className="flex-1"
                    disabled={createdInstance ? configuringInstances.has(createdInstance.id) : false}
                  >
                    {createdInstance && configuringInstances.has(createdInstance.id) ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4 mr-2" />
                    )}
                    Configurar IA
                  </Button>
                  <Button
                    onClick={() => createdInstance && handleConfigureWhatsApp(createdInstance)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configurar WhatsApp
                  </Button>
                </div>

                <Button
                  onClick={() => createdInstance && handleDeleteInstance(createdInstance)}
                  variant="destructive"
                  className="w-full"
                  disabled={createdInstance ? deletingInstances.has(createdInstance.id) : false}
                >
                  {createdInstance && deletingInstances.has(createdInstance.id) ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Excluir Instância
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowInstanceModal(false)}
            >
              Fechar
            </Button>
            <Button 
              onClick={() => {
                setShowInstanceModal(false);
                queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Lista
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Smartphone className="mr-3 h-6 w-6 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              WhatsApp
            </h1>
            <p className="text-gray-600 text-sm">
              Gerencie suas instâncias de WhatsApp e vincule agentes personalizados.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="instances" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              Instâncias
            </TabsTrigger>
            <TabsTrigger value="bindings" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Vincular Agentes
            </TabsTrigger>
          </TabsList>

          {/* Tab Content - Instâncias */}
          <TabsContent value="instances" className="mt-6">
            <Card className="bg-white rounded-lg shadow-lg">
              <CardContent className="p-8">

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instance Name */}
              <div className="space-y-2">
                <Label htmlFor="instanceName" className="text-sm font-medium text-gray-700">
                  Nome da Instância
                </Label>
                <Input
                  id="instanceName"
                  type="text"
                  placeholder="Ex: principal"
                  value={formData.instanceName}
                  onChange={(e) => handleInputChange("instanceName", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
                  Número de Telefone
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Ex: 5511999999999"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isCreating || !adminSettings?.evolutionApiUrl || !adminSettings?.globalToken || !adminSettings?.isActive}
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-md flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>+ Criar Instância</span>
                </Button>
              </div>
            </form>

            {/* Instances List */}
            {instances && instances.length > 0 && (
              <div className="mt-6">
                <div className="flex flex-row items-center justify-between mb-4">
                  <h3 className="flex items-center font-medium text-lg">
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Instâncias Configuradas
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] })}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Atualizar Status
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Lista de todas as instâncias WhatsApp configuradas para sua empresa.
                </p>
                <div className="space-y-4">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{instance.instanceName}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={(instance.status === 'connected' || instance.status === 'open') ? 'default' : 'secondary'}
                            className={(instance.status === 'connected' || instance.status === 'open')
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : instance.status === 'connecting'
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                            }
                          >
                            {(instance.status === 'connected' || instance.status === 'open') ? 'Conectado' : 
                             instance.status === 'connecting' ? 'Conectando...' : 'Desconectado'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Webhook: {getWebhookUrl(instance.instanceKey)}</p>
                          <p className="flex items-center gap-2">
                            Status: {instance.status} | Última atualização: {formatDate(instance.createdAt)}
                            {statusIntervals.has(instance.id) && (
                              <span className="inline-flex items-center gap-1 text-blue-600">
                                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                                <span className="text-xs">Auto</span>
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerifyInstance(instance)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-50"
                        disabled={verifyingInstances.has(instance.id)}
                      >
                        {verifyingInstances.has(instance.id) ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4 mr-1" />
                        )}
                        Verificar
                      </Button>
                      {statusIntervals.has(instance.id) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => stopStatusMonitoring(instance.id)}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Parar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnectionToggle(instance)}
                        className={getConnectionButtonStyle(instance.status)}
                        disabled={connectingInstances.has(instance.id)}
                      >
                        {connectingInstances.has(instance.id) ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Unplug className="h-4 w-4 mr-1" />
                        )}
                        {getConnectionButtonText(instance.status)}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConfigureAI(instance)}
                        disabled={configuringInstances.has(instance.id)}
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
                      <Button
                        variant="destructive"
                        size="sm"
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
              </div>
            )}

            {/* Error Message if no admin settings */}
            {!adminSettings?.evolutionApiUrl || !adminSettings?.globalToken || !adminSettings?.isActive ? (
              <Card className="mt-6 border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <MessageCircle className="mr-2 h-5 w-5 text-yellow-600" />
                    <div>
                      <h3 className="font-medium text-yellow-800">
                        Configurações não encontradas
                      </h3>
                      <p className="text-sm text-yellow-700">
                        {!adminSettings?.evolutionApiUrl || !adminSettings?.globalToken 
                          ? "As configurações da API WhatsApp não foram configuradas pelo administrador."
                          : "As configurações da API WhatsApp estão inativas. Entre em contato com o administrador."
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </CardContent>
        </Card>
          </TabsContent>

          {/* Tab Content - Vincular Agentes */}
          <TabsContent value="bindings" className="mt-6">
            <Card className="bg-white rounded-lg shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="w-5 h-5" />
                  Vincular Agentes a Instâncias
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Conecte suas instâncias do WhatsApp a agentes personalizados para automatizar respostas.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Botão para criar nova vinculação */}
                <div className="flex justify-end">
                  <Button
                    onClick={() => setShowBindingModal(true)}
                    disabled={!instances?.length || !customAgents?.length}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Nova Vinculação
                  </Button>
                </div>

                {/* Lista de vinculações existentes */}
                {bindingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Carregando vinculações...</span>
                  </div>
                ) : bindings && bindings.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Vinculações Ativas</h3>
                    {bindings.map((binding) => (
                      <div key={binding.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {getInstanceName(binding.instanceId)}
                              </p>
                              <p className="text-sm text-gray-500">Instância</p>
                            </div>
                            <div className="flex items-center">
                              <Link className="w-4 h-4 text-gray-400 mx-2" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {getAgentName(binding.agentId)}
                              </p>
                              <p className="text-sm text-gray-500">Agente</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <Badge variant={binding.isActive ? "default" : "secondary"}>
                              {binding.isActive ? "Ativo" : "Inativo"}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteBinding(binding.id)}
                          disabled={deleteBindingMutation.isPending}
                        >
                          {deleteBindingMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Nenhuma vinculação encontrada</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Crie uma vinculação para conectar suas instâncias aos agentes personalizados.
                    </p>
                    {(!instances?.length || !customAgents?.length) && (
                      <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                        {!instances?.length && "Você precisa criar pelo menos uma instância. "}
                        {!customAgents?.length && "Você precisa criar pelo menos um agente personalizado na aba IA."}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Modal para criar vinculação */}
        <Dialog open={showBindingModal} onOpenChange={setShowBindingModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="w-5 h-5" />
                Nova Vinculação
              </DialogTitle>
              <DialogDescription>
                Selecione uma instância e um agente para criar uma vinculação.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Seleção de Instância */}
              <div className="space-y-2">
                <Label htmlFor="instance-select">Instância do WhatsApp</Label>
                <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma instância" />
                  </SelectTrigger>
                  <SelectContent>
                    {instances?.filter(instance => {
                      // Filtrar instâncias que já não estão vinculadas
                      return !bindings?.some(binding => binding.instanceId === instance.id);
                    }).map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          <span>{instance.instanceName}</span>
                          <Badge variant="outline" className="ml-auto">
                            {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seleção de Agente */}
              <div className="space-y-2">
                <Label htmlFor="agent-select">Agente Personalizado</Label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um agente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customAgents?.filter(agent => agent.isActive).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4" />
                          <div>
                            <span className="font-medium">{agent.name}</span>
                            {agent.description && (
                              <p className="text-xs text-gray-500">{agent.description}</p>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowBindingModal(false);
                  setSelectedInstance("");
                  setSelectedAgent("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateBinding}
                disabled={!selectedInstance || !selectedAgent || createBindingMutation.isPending}
              >
                {createBindingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Link className="w-4 h-4 mr-2" />
                )}
                Criar Vinculação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}