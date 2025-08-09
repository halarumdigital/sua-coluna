import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Save, Loader2, Crown, AlertCircle, CheckCircle } from "lucide-react";

export default function SuperRootWhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current WhatsApp settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/super-root/whatsapp-settings"],
    onSuccess: (data) => {
      console.log("Super Root WhatsApp settings loaded:", data);
    },
  });

  // Update WhatsApp settings mutation
  const updateWhatsAppSettingsMutation = useMutation({
    mutationFn: async (data: { evolutionApiUrl: string; globalToken: string }) => {
      const response = await fetch("/api/super-root/whatsapp-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Erro ao salvar configurações globais do WhatsApp");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações globais da API WhatsApp salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-root/whatsapp-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações globais do WhatsApp",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const evolutionApiUrl = formData.get("evolutionApiUrl") as string;
    const globalToken = formData.get("globalToken") as string;

    if (!evolutionApiUrl || !globalToken) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate URL format
    try {
      new URL(evolutionApiUrl);
    } catch {
      toast({
        title: "Erro",
        description: "URL da Evolution API inválida",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    updateWhatsAppSettingsMutation.mutate(
      { evolutionApiUrl, globalToken },
      {
        onSettled: () => {
          setIsSubmitting(false);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Layout title="Configurações WhatsApp">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Configurações WhatsApp">
      <div className="space-y-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Configurações Globais da API WhatsApp
            </h2>
            <p className="text-gray-600">
              Configure a API WhatsApp Evolution para todo o sistema
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-medium text-green-900">Configuração Global</h3>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Estas configurações da API WhatsApp serão utilizadas por todos os franqueadores e franquias do sistema.
            Certifique-se de que a Evolution API esteja funcionando corretamente antes de salvar.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Configurações da Evolution API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="evolutionApiUrl">URL da Evolution API</Label>
                  <Input
                    id="evolutionApiUrl"
                    name="evolutionApiUrl"
                    type="url"
                    placeholder="https://sua-evolution-api.com"
                    defaultValue={settings?.evolutionApiUrl || ""}
                    required
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    URL completa da sua instância da Evolution API (ex: https://api.evolution.com)
                  </p>
                </div>

                <div>
                  <Label htmlFor="globalToken">Token Global</Label>
                  <Input
                    id="globalToken"
                    name="globalToken"
                    type="password"
                    placeholder="Seu token global da Evolution API"
                    defaultValue={settings?.globalToken || ""}
                    required
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Token de autenticação global da Evolution API para criar e gerenciar instâncias
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Salvando..." : "Salvar Configurações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {settings && (
          <Card>
            <CardHeader>
              <CardTitle>Status da Configuração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700">URL da Evolution API:</span>
                    <p className="text-sm text-gray-600 break-all mt-1">
                      {settings.evolutionApiUrl || "Não configurado"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Token Global:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {settings.globalToken ? "••••••••••••••••" : "Não configurado"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-700">Status:</span>
                  {settings.isActive ? (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">Ativo</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600 font-medium">Inativo</span>
                    </div>
                  )}
                </div>

                {settings.createdAt && (
                  <div>
                    <span className="font-medium text-gray-700">Configurado em:</span>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(settings.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>Evolution API:</strong> É necessário ter uma instância da Evolution API rodando e acessível pela URL configurada.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>Token Global:</strong> O token deve ter permissões para criar, listar e gerenciar instâncias do WhatsApp.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>Segurança:</strong> Mantenha o token seguro e não compartilhe com usuários não autorizados.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  <strong>Impacto:</strong> Alterações nesta configuração afetam todos os franqueadores e franquias do sistema.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}