import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  Settings,
  Check,
  X,
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock,
  MapPin,
  User,
  CreditCard,
  FileImage
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GoogleCalendarSettings {
  id?: string;
  isEnabled: boolean;
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  calendarId: string;
  defaultEventDuration: number;
  eventTitle: string;
  eventDescription: string;
  eventLocation: string;
  isConnected: boolean;
  lastSync?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function CalendarPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [formData, setFormData] = useState<GoogleCalendarSettings>({
    isEnabled: false,
    clientId: "",
    clientSecret: "",
    calendarId: "primary",
    defaultEventDuration: 60,
    eventTitle: "Consulta Agendada",
    eventDescription: "Consulta agendada via WhatsApp",
    eventLocation: "",
    isConnected: false,
  });

  // Fetch calendar settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/franchise/calendar-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/franchise/calendar-settings");
      const data = await response.json();
      if (data) {
        setFormData(data);
      }
      return data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: GoogleCalendarSettings) => {
      const response = await apiRequest("PUT", "/api/franchise/calendar-settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise/calendar-settings"] });
      toast({
        title: "Configurações salvas",
        description: "Suas configurações do Google Calendar foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/franchise/calendar-test", formData);
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, isConnected: data.success }));
      toast({
        title: data.success ? "Conexão bem-sucedida" : "Falha na conexão",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro de conexão",
        description: error.message || "Erro ao testar conexão",
        variant: "destructive",
      });
    },
  });

  // OAuth connection mutation
  const oauthConnectionMutation = useMutation({
    mutationFn: async (oauthData?: any) => {
      const dataToSend = oauthData || formData;
      const response = await apiRequest("POST", "/api/franchise/calendar-oauth", dataToSend);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.authUrl) {
        // Open OAuth URL in new window
        const authWindow = window.open(data.authUrl, 'google-oauth', 'width=500,height=600');
        
        // Listen for the OAuth completion
        const checkClosed = setInterval(() => {
          if (authWindow?.closed) {
            clearInterval(checkClosed);
            // Refresh settings to see if connection was successful
            queryClient.invalidateQueries({ queryKey: ["/api/franchise/calendar-settings"] });
            toast({
              title: "Verifique a conexão",
              description: "Atualizando status da integração...",
            });
          }
        }, 1000);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erro na conexão OAuth",
        description: error.message || "Erro ao iniciar conexão com Google",
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/franchise/calendar-disconnect");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/franchise/calendar-settings"] });
      toast({
        title: "Desconectado",
        description: "Google Calendar foi desconectado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao desconectar",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof GoogleCalendarSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleTestConnection = () => {
    setIsTestingConnection(true);
    testConnectionMutation.mutate();
    setTimeout(() => setIsTestingConnection(false), 2000);
  };

  const handleOAuthConnect = () => {
    // Use current settings if formData is empty
    const currentData = {
      clientId: formData.clientId || settings?.clientId,
      clientSecret: formData.clientSecret || settings?.clientSecret,
      calendarId: formData.calendarId || settings?.calendarId || 'primary'
    };
    
    if (!currentData.clientId || !currentData.clientSecret) {
      toast({
        title: "Credenciais necessárias",
        description: "Configure primeiro o Client ID e Client Secret",
        variant: "destructive",
      });
      return;
    }
    
    // Update formData with current settings before making OAuth call
    setFormData(prev => ({
      ...prev,
      ...currentData
    }));
    
    oauthConnectionMutation.mutate(currentData);
  };

  const handleDisconnect = () => {
    if (window.confirm("Tem certeza que deseja desconectar do Google Calendar?")) {
      disconnectMutation.mutate();
    }
  };

  const getConnectionStatus = () => {
    if (formData.isConnected) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <Check className="w-3 h-3" />
          Conectado
        </Badge>
      );
    }
    return (
      <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
        <X className="w-3 h-3" />
        Não conectado
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Layout title="Google Calendar">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Carregando configurações...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Google Calendar">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="w-8 h-8" />
              Google Calendar
            </h1>
            <p className="text-muted-foreground">
              Integre seu Google Calendar para agendamentos automáticos via WhatsApp com confirmação por PIX
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getConnectionStatus()}
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Status da Integração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-blue-900">Integração</div>
                  <div className="text-sm text-blue-600">
                    {formData.isEnabled ? "Ativada" : "Desativada"}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="p-2 bg-green-100 rounded-full">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-green-900">Status</div>
                  <div className="text-sm text-green-600">
                    {formData.isConnected ? "Conectado" : "Não conectado"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Última Sincronização</div>
                  <div className="text-sm text-gray-600">
                    {formData.lastSync ? new Date(formData.lastSync).toLocaleString('pt-BR') : "Nunca"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OAuth Connection Section */}
        <Card className="border-2 border-dashed border-gray-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="w-5 h-5" />
              Conectar com Google Calendar
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Para criar eventos automaticamente, conecte sua conta do Google Calendar
            </div>
          </CardHeader>
          <CardContent>
            {settings?.isConnected ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900">Google Calendar Conectado</h4>
                    <p className="text-sm text-green-700">
                      Eventos serão criados automaticamente após confirmação do PIX
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleOAuthConnect}>
                    Reconectar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDisconnect}
                  >
                    Desconectar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="p-3 bg-blue-100 rounded-full w-12 h-12 mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Conecte sua conta Google
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Autorize o acesso ao seu Google Calendar para permitir a criação automática de eventos
                </p>
                <Button 
                  size="lg"
                  className="bg-[#4285f4] hover:bg-[#3367d6] text-white"
                  disabled={!settings?.clientId || !settings?.clientSecret}
                  onClick={handleOAuthConnect}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Conectar com Google
                </Button>
                {(!settings?.clientId || !settings?.clientSecret) && (
                  <p className="text-xs text-orange-600 mt-2">
                    Configure primeiro as credenciais da API Google abaixo
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Google API Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações da API Google</CardTitle>
              <div className="text-sm text-muted-foreground">
                Configure suas credenciais do Google Calendar API.{" "}
                <a 
                  href="https://console.cloud.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Obter credenciais
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="clientId">Client ID *</Label>
                <Input
                  id="clientId"
                  type="text"
                  placeholder="Seu Google Client ID"
                  value={formData.clientId}
                  onChange={(e) => handleInputChange("clientId", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="clientSecret">Client Secret *</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  placeholder="Seu Google Client Secret"
                  value={formData.clientSecret}
                  onChange={(e) => handleInputChange("clientSecret", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="calendarId">Calendar ID</Label>
                <Input
                  id="calendarId"
                  type="text"
                  placeholder="primary (padrão) ou ID do calendário específico"
                  value={formData.calendarId}
                  onChange={(e) => handleInputChange("calendarId", e.target.value)}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Use "primary" para o calendário principal ou o ID específico do calendário
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  onClick={handleTestConnection}
                  disabled={!formData.clientId || !formData.clientSecret || isTestingConnection}
                  variant="outline"
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Event Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Evento</CardTitle>
              <div className="text-sm text-muted-foreground">
                Defina como os eventos serão criados no seu calendário.
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="eventTitle">Título do Evento</Label>
                <Input
                  id="eventTitle"
                  type="text"
                  placeholder="Consulta Agendada"
                  value={formData.eventTitle}
                  onChange={(e) => handleInputChange("eventTitle", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="eventDescription">Descrição Padrão</Label>
                <Textarea
                  id="eventDescription"
                  placeholder="Consulta agendada via WhatsApp"
                  value={formData.eventDescription}
                  onChange={(e) => handleInputChange("eventDescription", e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="eventLocation">Localização Padrão</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    id="eventLocation"
                    type="text"
                    placeholder="Endereço da clínica"
                    value={formData.eventLocation}
                    onChange={(e) => handleInputChange("eventLocation", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="duration">Duração Padrão (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  max="480"
                  step="15"
                  value={formData.defaultEventDuration}
                  onChange={(e) => handleInputChange("defaultEventDuration", parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-1">
                  <Label htmlFor="enabled">Ativar Integração</Label>
                  <div className="text-sm text-muted-foreground">
                    Permite o agendamento automático via WhatsApp após confirmação do PIX
                  </div>
                </div>
                <Switch
                  id="enabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => handleInputChange("isEnabled", checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Como Funciona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Processo para o Cliente
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Cliente conversa com o agente via WhatsApp</li>
                  <li>• Agente explica como funciona o agendamento</li>
                  <li>• Cliente manifesta interesse em agendar</li>
                  <li>• Agente informa sobre PIX de sinal de R$ 50,00</li>
                  <li>• Cliente envia comprovante do PIX</li>
                  <li>• Agente analisa e confirma o comprovante</li>
                  <li>• Agendamento é realizado e confirmado</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Processo de Pagamento
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• PIX de sinal obrigatório: R$ 50,00</li>
                  <li>• Cliente envia comprovante via WhatsApp</li>
                  <li>• Agente analisa automaticamente o comprovante</li>
                  <li>• Evento só é criado após confirmação do pagamento</li>
                  <li>• Dados do pagamento ficam no evento</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-1 bg-amber-100 rounded-full">
                  <FileImage className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h5 className="font-medium text-amber-900 mb-1">Análise de Comprovantes</h5>
                  <p className="text-sm text-amber-800">
                    O agente é capaz de analisar comprovantes de PIX enviados como imagens, 
                    extraindo informações como valor, data, hora e confirmando se o pagamento está correto 
                    antes de realizar o agendamento.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            size="lg"
          >
            {updateSettingsMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>
    </Layout>
  );
}