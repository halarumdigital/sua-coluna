import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
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
  Copy
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
  isActive: boolean;
}

export default function ClientWhatsAppPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Fetch admin WhatsApp settings to get URL and token
  const { data: adminSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-whatsapp-settings"],
    queryFn: async () => {
      const response = await fetch("/api/client/whatsapp-settings", {
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
      const response = await fetch("/api/client/whatsapp-instances", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar instâncias");
      }
      
      return response.json() as Promise<WhatsAppInstance[]>;
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    refetchIntervalInBackground: true,
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

    // Configurar verificação mais frequente se conectando, normal se apenas monitorando
    const intervalTime = isConnecting ? 10000 : 300000; // 10s se conectando, 5min normal
    const interval = setInterval(async () => {
      await checkAndUpdateStatus(instance);
    }, intervalTime);

    // Armazenar o interval
    setStatusIntervals(prev => new Map(prev.set(instance.id, interval)));

    toast({
      title: "Monitoramento Iniciado",
      description: isConnecting 
        ? `Verificando conexão de "${instance.instanceName}" a cada 10 segundos`
        : `Verificando status de "${instance.instanceName}" a cada 5 minutos`,
    });
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
      
      // Se conectou com sucesso, mudar para monitoramento normal
      if (mappedStatus === 'connected') {
        setTimeout(() => {
          startStatusMonitoring(instance, false); // Mudar para verificação de 5 minutos
        }, 2000);
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
    const baseUrl = window.location.origin;
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Excluir Instância
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A instância será removida permanentemente.
            </DialogDescription>
          </DialogHeader>

          {instanceToDelete && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-900 mb-2">
                  {instanceToDelete.instanceName}
                </h3>
                <div className="text-sm text-red-700 space-y-1">
                  <p>📞 <strong>Telefone:</strong> {instanceToDelete.phoneNumber}</p>
                  <p>🔑 <strong>Instance Key:</strong> {instanceToDelete.instanceKey}</p>
                  <p>📊 <strong>Status:</strong> {instanceToDelete.status}</p>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  ⚠️ <strong>Atenção:</strong> Esta ação irá:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1 ml-4">
                  <li>• Remover a instância da Evolution API</li>
                  <li>• Excluir todos os dados do banco</li>
                  <li>• Parar qualquer monitoramento ativo</li>
                  <li>• Desconectar o WhatsApp vinculado</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteModal(false);
                setInstanceToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
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

      <div className="max-w-2xl mx-auto p-6">
        {/* Main Card */}
        <Card className="bg-white rounded-lg shadow-lg">
          <CardContent className="p-8">
            {/* Header */}
            <div className="flex items-center mb-6">
              <Smartphone className="mr-3 h-6 w-6 text-gray-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Instâncias do WhatsApp
                </h1>
                <p className="text-gray-600 text-sm">
                  Gerencie suas instâncias de WhatsApp para envio de mensagens automáticas.
                </p>
              </div>
            </div>

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
          </CardContent>
        </Card>

        {/* Instances List */}
        {instances && instances.length > 0 && (
          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Instâncias Configuradas
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] })}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Status
              </Button>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
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
      </div>
    </Layout>
  );
} 