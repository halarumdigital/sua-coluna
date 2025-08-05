import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Save, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Send,
  Phone
} from "lucide-react";

interface WhatsAppSettings {
  id: string;
  evolutionApiUrl: string;
  globalToken: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ClientWhatsAppPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    evolutionApiUrl: "",
    globalToken: "",
    isActive: true,
  });

  // Fetch current WhatsApp settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["client-whatsapp-settings"],
    queryFn: async () => {
      const response = await fetch("/api/client/whatsapp-settings", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar configurações do WhatsApp");
      }
      
      return response.json();
    },
  });

  // Update form data when settings are loaded
  React.useEffect(() => {
    if (settings) {
      setFormData({
        evolutionApiUrl: settings.evolutionApiUrl || "",
        globalToken: settings.globalToken || "",
        isActive: settings.isActive ?? true,
      });
    }
  }, [settings]);

  // Save WhatsApp settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/client/whatsapp-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Falha ao salvar configurações");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações Salvas",
        description: "Configurações do WhatsApp salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["client-whatsapp-settings"] });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await saveSettingsMutation.mutateAsync(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const testConnection = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/client/whatsapp-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Conexão Testada",
          description: "Conexão com a API do WhatsApp estabelecida com sucesso!",
        });
      } else {
        throw new Error("Falha na conexão");
      }
    } catch (error) {
      toast({
        title: "Erro na Conexão",
        description: "Não foi possível conectar com a API do WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
            <p className="text-muted-foreground">
              Configure sua integração com a API do WhatsApp
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={settings?.isActive ? "default" : "secondary"}>
              {settings?.isActive ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="mr-2 h-5 w-5" />
              Status da Integração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              {settings?.isActive ? (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="mr-2 h-5 w-5" />
                  <span className="font-medium">Integração Ativa</span>
                </div>
              ) : (
                <div className="flex items-center text-yellow-600">
                  <AlertCircle className="mr-2 h-5 w-5" />
                  <span className="font-medium">Integração Inativa</span>
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                Última atualização: {settings?.updatedAt ? 
                  new Date(settings.updatedAt).toLocaleString('pt-BR') : 
                  'Nunca'
                }
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Configurações da API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Evolution API URL */}
              <div className="space-y-2">
                <Label htmlFor="evolutionApiUrl">URL da Evolution API</Label>
                <Input
                  id="evolutionApiUrl"
                  type="url"
                  placeholder="https://sua-evolution-api.com"
                  value={formData.evolutionApiUrl}
                  onChange={(e) => handleInputChange("evolutionApiUrl", e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  URL da sua instância da Evolution API
                </p>
              </div>

              {/* Global Token */}
              <div className="space-y-2">
                <Label htmlFor="globalToken">Token Global</Label>
                <Input
                  id="globalToken"
                  type="password"
                  placeholder="Seu token global da Evolution API"
                  value={formData.globalToken}
                  onChange={(e) => handleInputChange("globalToken", e.target.value)}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Token de autenticação da sua Evolution API
                </p>
              </div>

              {/* Active Switch */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange("isActive", checked)}
                />
                <Label htmlFor="isActive">Ativar integração</Label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isLoading}
                  className="flex items-center"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Configurações
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={testConnection}
                  disabled={isSubmitting || isLoading || !formData.evolutionApiUrl || !formData.globalToken}
                  className="flex items-center"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Testar Conexão
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Phone className="mr-2 h-5 w-5" />
              Informações Importantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Como configurar:</h4>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                  <li>Certifique-se de que sua Evolution API está rodando</li>
                  <li>Obtenha o token global da sua instância</li>
                  <li>Configure a URL correta da sua API</li>
                  <li>Teste a conexão antes de ativar</li>
                </ol>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-2">Atenção:</h4>
                <ul className="list-disc list-inside space-y-1 text-yellow-800">
                  <li>Mantenha seu token seguro e não o compartilhe</li>
                  <li>A URL deve ser acessível a partir do servidor</li>
                  <li>Teste sempre a conexão antes de usar em produção</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
} 