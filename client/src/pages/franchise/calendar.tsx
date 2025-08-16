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
  User
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
              Integre seu Google Calendar para agendamentos automáticos via WhatsApp
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
                    Permite o agendamento automático via WhatsApp
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
                  Para o Cliente
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Cliente conversa com o agente via WhatsApp</li>
                  <li>• Agente coleta: nome, data, horário, tipo de consulta</li>
                  <li>• Agendamento é confirmado automaticamente</li>
                  <li>• Cliente recebe confirmação no WhatsApp</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Para Você
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Evento aparece automaticamente no Google Calendar</li>
                  <li>• Inclui dados do cliente e tipo de consulta</li>
                  <li>• Notificações automáticas do Google</li>
                  <li>• Integração com outros aplicativos Google</li>
                </ul>
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