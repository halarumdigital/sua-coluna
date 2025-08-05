import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Save, Loader2 } from "lucide-react";

export default function AdminWhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current WhatsApp settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/whatsapp-settings"],
    onSuccess: (data) => {
      console.log("WhatsApp settings loaded:", data);
    },
  });

  // Update WhatsApp settings mutation
  const updateWhatsAppSettingsMutation = useMutation({
    mutationFn: async (data: { evolutionApiUrl: string; globalToken: string }) => {
      const response = await fetch("/api/admin/whatsapp-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Erro ao salvar configurações do WhatsApp");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações da API WhatsApp salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/whatsapp-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações do WhatsApp",
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
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Configurações da API WhatsApp
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure as credenciais da API WhatsApp Evolution
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Configurações da API WhatsApp
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
                    URL completa da sua instância da Evolution API
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
                    Token de autenticação global da Evolution API
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
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
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Informações Atuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">URL da Evolution API:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                    {settings.evolutionApiUrl}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Token Global:</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {settings.globalToken ? "••••••••••••••••" : "Não configurado"}
                  </p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    settings.isActive 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  }`}>
                    {settings.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
} 