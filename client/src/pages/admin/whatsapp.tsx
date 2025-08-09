import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Bot, RefreshCw, Smartphone } from "lucide-react";
import { DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Loader2, Plus, Phone, QrCode, Trash2, Power, PowerOff } from "lucide-react";

interface AdminWhatsAppInstance {
  id: string;
  instanceName: string;
  instanceKey: string;
  phoneNumber: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  qrCode?: string;
  lastConnection?: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminWhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [instanceToDelete, setInstanceToDelete] = useState<AdminWhatsAppInstance | null>(null);
  const [qrCodeData, setQrCodeData] = useState<{ id: string; qrCode: string; instanceName: string; instanceKey: string } | null>(null);
  const [connectingInstances, setConnectingInstances] = useState<Set<string>>(new Set());
  const [deletingInstances, setDeletingInstances] = useState<Set<string>>(new Set());
  const [configuringInstances, setConfiguringInstances] = useState<Set<string>>(new Set());
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

  // Fetch admin WhatsApp instances
  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp-instances"],
  });

  // Fetch current WhatsApp settings (only to check if API is configured)
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp-settings"],
  });



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
      connected: { color: "bg-green-100 text-green-800", label: "Conectado" },
      disconnected: { color: "bg-red-100 text-red-800", label: "Desconectado" },
      connecting: { color: "bg-yellow-100 text-yellow-800", label: "Conectando" },
      error: { color: "bg-red-100 text-red-800", label: "Erro" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.error;
    
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
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

        {/* WhatsApp Instances Section */}
        {isApiConfigured && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Instâncias WhatsApp
                </CardTitle>
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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