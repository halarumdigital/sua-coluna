import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Loader2, 
  Plus,
  Smartphone
} from "lucide-react";

interface WhatsAppInstance {
  id: string;
  instanceName: string;
  phoneNumber: string;
  status: string;
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
  const [formData, setFormData] = useState({
    instanceName: "",
    phoneNumber: "",
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
    onSuccess: () => {
      toast({
        title: "Instância Criada",
        description: "Instância do WhatsApp criada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      setFormData({ instanceName: "", phoneNumber: "" });
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
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                Instâncias Existentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {instances.map((instance) => (
                  <div
                    key={instance.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{instance.instanceName}</h3>
                      <p className="text-sm text-gray-600">{instance.phoneNumber}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        instance.status === 'connected' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                      </span>
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