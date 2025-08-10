import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { Plus, Edit, Trash2, Phone, MessageSquare, Settings, QrCode } from 'lucide-react';

interface WhatsappInstance {
  id: string;
  instanceName: string;
  instanceKey: string;
  webhook?: string;
  status: 'disconnected' | 'connected' | 'connecting';
  phoneNumber?: string;
  isActive: boolean;
  createdAt: string;
  lastStatusCheck?: string;
}

interface PhoneNumber {
  id: string;
  phoneNumber: string;
  whatsappInstanceId?: string;
  isActive: boolean;
  isPrimary: boolean;
  whatsappInstance?: WhatsappInstance;
}

interface PromptMapping {
  id: string;
  phoneNumberId: string;
  phoneNumberType: string;
  promptId: string;
  promptType: 'global' | 'franchise';
  priority: number;
  isActive: boolean;
}

interface GlobalPrompt {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

export default function SuperRootWhatsapp() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<WhatsappInstance[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [promptMappings, setPromptMappings] = useState<PromptMapping[]>([]);
  const [globalPrompts, setGlobalPrompts] = useState<GlobalPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<Record<string, boolean>>({});
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState<string>('');

  // Estados para formulários
  const [newInstance, setNewInstance] = useState({
    instanceName: '',
    instanceKey: '',
    webhook: '',
    phoneNumber: ''
  });

  const [newPhoneNumber, setNewPhoneNumber] = useState({
    phoneNumber: '',
    whatsappInstanceId: '',
    isPrimary: false
  });

  const [newMapping, setNewMapping] = useState({
    phoneNumberId: '',
    phoneNumberType: '',
    promptId: '',
    promptType: 'global' as 'global' | 'franchise',
    priority: 1
  });

  // Buscar dados
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar instâncias reais da API
      const response = await fetch('/api/admin/whatsapp-instances');
      
      if (response.ok) {
        const realInstances = await response.json();
        
        // Converter para o formato esperado pela interface
        const formattedInstances: WhatsappInstance[] = realInstances.map((instance: any) => ({
          id: instance.id,
          instanceName: instance.instanceName,
          instanceKey: instance.instanceKey,
          webhook: instance.webhook,
          status: instance.status || 'disconnected',
          phoneNumber: instance.phoneNumber,
          isActive: instance.isActive,
          createdAt: instance.createdAt
        }));

        setInstances(formattedInstances);

        // Verificar status de cada instância automaticamente
        setTimeout(() => {
          formattedInstances.forEach(instance => {
            checkInstanceStatus(instance.instanceKey);
          });
        }, 1000);
      } else {
        // Fallback para dados mock se a API não estiver disponível
        const mockInstances: WhatsappInstance[] = [
          {
            id: '1',
            instanceName: 'Suporte Principal',
            instanceKey: 'support_main',
            webhook: 'https://webhook.site/abc123',
            status: 'connected',
            phoneNumber: '+5511999999999',
            isActive: true,
            createdAt: new Date().toISOString()
          },
          {
            id: '2',
            instanceName: 'Vendas',
            instanceKey: 'sales',
            status: 'disconnected',
            isActive: true,
            createdAt: new Date().toISOString()
          }
        ];
        setInstances(mockInstances);
      }

      const mockPhoneNumbers: PhoneNumber[] = [
        {
          id: '1',
          phoneNumber: '+5511999999999',
          whatsappInstanceId: '1',
          isActive: true,
          isPrimary: true
        },
        {
          id: '2',
          phoneNumber: '+5511888888888',
          whatsappInstanceId: '2',
          isActive: true,
          isPrimary: false
        }
      ];

      const mockGlobalPrompts: GlobalPrompt[] = [
        {
          id: '1',
          name: 'Atendimento Geral',
          description: 'Prompt para atendimento geral de clientes',
          category: 'Suporte'
        },
        {
          id: '2',
          name: 'Vendas',
          description: 'Prompt para vendas e prospecção',
          category: 'Vendas'
        }
      ];

      setPhoneNumbers(mockPhoneNumbers);
      setGlobalPrompts(mockGlobalPrompts);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInstance = async () => {
    if (!newInstance.instanceName || !newInstance.instanceKey) {
      toast({
        title: "Erro",
        description: "Nome e chave da instância são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Mock: criar nova instância
      const newInstanceData: WhatsappInstance = {
        id: Date.now().toString(),
        ...newInstance,
        status: 'disconnected',
        isActive: true,
        createdAt: new Date().toISOString()
      };

      setInstances([...instances, newInstanceData]);
      setNewInstance({ instanceName: '', instanceKey: '', webhook: '', phoneNumber: '' });
      
      toast({
        title: "Sucesso",
        description: "Instância criada com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar instância",
        variant: "destructive"
      });
    }
  };

  const handleCreatePhoneNumber = async () => {
    if (!newPhoneNumber.phoneNumber) {
      toast({
        title: "Erro",
        description: "Número de telefone é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      // Mock: criar novo número
      const newPhoneNumberData: PhoneNumber = {
        id: Date.now().toString(),
        ...newPhoneNumber,
        isActive: true
      };

      setPhoneNumbers([...phoneNumbers, newPhoneNumberData]);
      setNewPhoneNumber({ phoneNumber: '', whatsappInstanceId: '', isPrimary: false });
      
      toast({
        title: "Sucesso",
        description: "Número de telefone adicionado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar número de telefone",
        variant: "destructive"
      });
    }
  };

  const handleCreateMapping = async () => {
    if (!newMapping.phoneNumberId || !newMapping.promptId) {
      toast({
        title: "Erro",
        description: "Número de telefone e prompt são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    try {
      // Mock: criar novo mapeamento
      const newMappingData: PromptMapping = {
        id: Date.now().toString(),
        ...newMapping,
        isActive: true
      };

      setPromptMappings([...promptMappings, newMappingData]);
      setNewMapping({ phoneNumberId: '', phoneNumberType: '', promptId: '', promptType: 'global', priority: 1 });
      
      toast({
        title: "Sucesso",
        description: "Mapeamento criado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar mapeamento",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Conectado';
      case 'connecting': return 'Conectando';
      case 'disconnected': return 'Desconectado';
      default: return 'Desconhecido';
    }
  };

  const checkInstanceStatus = async (instanceKey: string) => {
    try {
      setLoadingStatus(prev => ({ ...prev, [instanceKey]: true }));
      const response = await fetch(`/api/admin/whatsapp-instances/${instanceKey}/status`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao verificar status');
      }

      const statusData = await response.json();
      
      // Atualizar o status da instância na lista local
      setInstances(prevInstances => 
        prevInstances.map(instance => 
          instance.instanceKey === instanceKey 
            ? { ...instance, status: statusData.status, lastStatusCheck: new Date().toISOString() }
            : instance
        )
      );

      toast({
        title: "Status Verificado",
        description: `Status da instância ${instanceKey}: ${getStatusText(statusData.status)}`
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar status da instância",
        variant: "destructive"
      });
    } finally {
      setLoadingStatus(prev => ({ ...prev, [instanceKey]: false }));
    }
  };

  return (
    <Layout title="WhatsApp Franqueador">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp Franqueador</h1>
            <p className="text-muted-foreground">
              Gerencie instâncias da Evolution API e configure números de telefone
            </p>
          </div>
        </div>

        <Tabs defaultValue="instances" className="space-y-6">
          <TabsList>
            <TabsTrigger value="instances">Instâncias</TabsTrigger>
            <TabsTrigger value="phone-numbers">Números de Telefone</TabsTrigger>
            <TabsTrigger value="prompt-mapping">Mapeamento de Prompts</TabsTrigger>
          </TabsList>

          {/* Aba de Instâncias */}
          <TabsContent value="instances" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Nova Instância
                </CardTitle>
                <CardDescription>
                  Crie uma nova instância da Evolution API
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="instanceName">Nome da Instância</Label>
                    <Input
                      id="instanceName"
                      value={newInstance.instanceName}
                      onChange={(e) => setNewInstance({...newInstance, instanceName: e.target.value})}
                      placeholder="Ex: Suporte Principal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="instanceKey">Chave da Instância</Label>
                    <Input
                      id="instanceKey"
                      value={newInstance.instanceKey}
                      onChange={(e) => setNewInstance({...newInstance, instanceKey: e.target.value})}
                      placeholder="Ex: support_main"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="webhook">Webhook (opcional)</Label>
                    <Input
                      id="webhook"
                      value={newInstance.webhook}
                      onChange={(e) => setNewInstance({...newInstance, webhook: e.target.value})}
                      placeholder="https://webhook.site/abc123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phoneNumber">Número de Telefone (opcional)</Label>
                    <Input
                      id="phoneNumber"
                      value={newInstance.phoneNumber}
                      onChange={(e) => setNewInstance({...newInstance, phoneNumber: e.target.value})}
                      placeholder="+5511999999999"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateInstance} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Instância
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Instâncias Existentes</CardTitle>
                    <CardDescription>
                      Gerencie suas instâncias da Evolution API
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      instances.forEach(instance => {
                        checkInstanceStatus(instance.instanceKey);
                      });
                    }}
                    disabled={loading || instances.length === 0}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Verificar Todos os Status
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {instances.map((instance) => (
                    <div key={instance.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-semibold">{instance.instanceName}</span>
                          <span className="text-sm text-muted-foreground">{instance.instanceKey}</span>
                          {instance.phoneNumber && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {instance.phoneNumber}
                            </span>
                          )}
                          {instance.lastStatusCheck && (
                            <span className="text-xs text-muted-foreground">
                              Última verificação: {new Date(instance.lastStatusCheck).toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)}`}></div>
                          <Badge className={`${getStatusColor(instance.status)} text-white`}>
                            {getStatusText(instance.status)}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => checkInstanceStatus(instance.instanceKey)}
                            disabled={loadingStatus[instance.instanceKey]}
                            title="Verificar Status"
                          >
                            {loadingStatus[instance.instanceKey] ? (
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                              <Settings className="h-4 w-4" />
                            )}
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Números de Telefone */}
          <TabsContent value="phone-numbers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Novo Número de Telefone
                </CardTitle>
                <CardDescription>
                  Adicione um novo número de telefone para o franqueador
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneNumber">Número de Telefone</Label>
                    <Input
                      id="phoneNumber"
                      value={newPhoneNumber.phoneNumber}
                      onChange={(e) => setNewPhoneNumber({...newPhoneNumber, phoneNumber: e.target.value})}
                      placeholder="+5511999999999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="whatsappInstance">Instância WhatsApp</Label>
                    <Select
                      value={newPhoneNumber.whatsappInstanceId}
                      onValueChange={(value) => setNewPhoneNumber({...newPhoneNumber, whatsappInstanceId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma instância" />
                      </SelectTrigger>
                      <SelectContent>
                        {instances.map((instance) => (
                          <SelectItem key={instance.id} value={instance.id}>
                            {instance.instanceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPrimary"
                    checked={newPhoneNumber.isPrimary}
                    onChange={(e) => setNewPhoneNumber({...newPhoneNumber, isPrimary: e.target.checked})}
                  />
                  <Label htmlFor="isPrimary">Número primário</Label>
                </div>
                <Button onClick={handleCreatePhoneNumber} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Número
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Números de Telefone</CardTitle>
                <CardDescription>
                  Gerencie os números de telefone do franqueador
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {phoneNumbers.map((phone) => (
                    <div key={phone.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="font-semibold flex items-center gap-2">
                            {phone.phoneNumber}
                            {phone.isPrimary && (
                              <Badge variant="secondary">Primário</Badge>
                            )}
                          </span>
                          {phone.whatsappInstance && (
                            <span className="text-sm text-muted-foreground">
                              Instância: {phone.whatsappInstance.instanceName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba de Mapeamento de Prompts */}
          <TabsContent value="prompt-mapping" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Novo Mapeamento de Prompt
                </CardTitle>
                <CardDescription>
                  Vincule um número de telefone a um prompt específico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phoneNumberId">Número de Telefone</Label>
                    <Select
                      value={newMapping.phoneNumberId}
                      onValueChange={(value) => setNewMapping({...newMapping, phoneNumberId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um número" />
                      </SelectTrigger>
                      <SelectContent>
                        {phoneNumbers.map((phone) => (
                          <SelectItem key={phone.id} value={phone.id}>
                            {phone.phoneNumber}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="promptType">Tipo de Prompt</Label>
                    <Select
                      value={newMapping.promptType}
                      onValueChange={(value: 'global' | 'franchise') => setNewMapping({...newMapping, promptType: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Prompt Global</SelectItem>
                        <SelectItem value="franchise">Prompt de Franquia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="promptId">Prompt</Label>
                    <Select
                      value={newMapping.promptId}
                      onValueChange={(value) => setNewMapping({...newMapping, promptId: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        {globalPrompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name} - {prompt.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      value={newMapping.priority}
                      onChange={(e) => setNewMapping({...newMapping, priority: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <Button onClick={handleCreateMapping} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Mapeamento
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mapeamentos Existentes</CardTitle>
                <CardDescription>
                  Visualize e gerencie os mapeamentos de prompts por número
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {phoneNumbers.map((phone) => (
                    <div key={phone.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Phone className="h-4 w-4" />
                        <span className="font-semibold">{phone.phoneNumber}</span>
                        {phone.isPrimary && (
                          <Badge variant="secondary">Primário</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {promptMappings
                          .filter(mapping => mapping.phoneNumberId === phone.id)
                          .map((mapping) => (
                            <div key={mapping.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  Prioridade {mapping.priority}
                                </Badge>
                                <span className="text-sm">
                                  {mapping.promptType === 'global' ? 'Prompt Global' : 'Prompt de Franquia'}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        
                        {promptMappings.filter(mapping => mapping.phoneNumberId === phone.id).length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Nenhum prompt configurado para este número
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}