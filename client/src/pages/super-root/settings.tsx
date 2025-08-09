import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Palette, Type, Image, Crown, Settings as SettingsIcon } from "lucide-react";

export default function SuperRootSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/super-root/settings"],
    onSuccess: (data) => {
      console.log("Super Root Settings loaded:", data);
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/super-root/settings", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Erro ao salvar configurações do sistema");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações do sistema salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/super-root/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/settings"] });
      // Force reload to apply new settings
      setTimeout(() => window.location.reload(), 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações do sistema",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (logoFile) {
      formData.append("logo", logoFile);
    }
    if (faviconFile) {
      formData.append("favicon", faviconFile);
    }

    updateSettingsMutation.mutate(formData);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          title: "Erro",
          description: "O arquivo deve ter no máximo 2MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Erro",
          description: "Apenas arquivos de imagem são permitidos",
          variant: "destructive",
        });
        return;
      }
      setLogoFile(file);
    }
  };

  const handleFaviconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) { // 1MB limit
        toast({
          title: "Erro",
          description: "O favicon deve ter no máximo 1MB",
          variant: "destructive",
        });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Erro",
          description: "Apenas arquivos de imagem são permitidos",
          variant: "destructive",
        });
        return;
      }
      setFaviconFile(file);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Configurações do Sistema">
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Configurações do Sistema">
      <div className="space-y-8">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Configurações Globais do Sistema
            </h2>
            <p className="text-gray-600">
              Configure a aparência e identidade visual de todo o sistema
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-5 w-5 text-blue-600" />
            <h3 className="font-medium text-blue-900">Configurações de Super Root</h3>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Estas configurações afetam todo o sistema, incluindo todos os franqueadores e franquias.
            As alterações serão aplicadas imediatamente para todos os usuários.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="w-5 h-5" />
                  <span>Logo do Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logo">Enviar Logo</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Escolher
                    </Button>
                  </div>
                  {logoFile && (
                    <p className="text-sm text-green-600">
                      Arquivo selecionado: {logoFile.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB
                  </p>
                </div>

                {(settings?.logo || settings?.system_logo) && (
                  <div className="space-y-2">
                    <Label>Logo Atual</Label>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <img
                        src={settings.logo || settings.system_logo}
                        alt="Logo atual"
                        className="max-h-16 object-contain"
                        onError={(e) => {
                          console.log("Erro ao carregar logo:", settings.logo || settings.system_logo);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Este logo aparece na sidebar de todos os usuários
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Favicon Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="w-5 h-5" />
                  <span>Favicon</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="favicon">Enviar Favicon</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="favicon"
                      type="file"
                      accept="image/*"
                      onChange={handleFaviconChange}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="sm">
                      <Upload className="w-4 w-4 mr-2" />
                      Escolher
                    </Button>
                  </div>
                  {faviconFile && (
                    <p className="text-sm text-green-600">
                      Arquivo selecionado: {faviconFile.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Formatos aceitos: ICO, PNG. Tamanho máximo: 1MB
                  </p>
                </div>

                {(settings?.favicon || settings?.system_favicon) && (
                  <div className="space-y-2">
                    <Label>Favicon Atual</Label>
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <img
                        src={settings.favicon || settings.system_favicon}
                        alt="Favicon atual"
                        className="w-8 h-8 object-contain"
                        onError={(e) => {
                          console.log("Erro ao carregar favicon:", settings.favicon || settings.system_favicon);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Ícone que aparece na aba do navegador
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Color */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="w-5 h-5" />
                  <span>Cor Global do Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemColor">Cor Principal</Label>
                  <div className="flex items-center space-x-4">
                    <Input
                      id="systemColor"
                      name="systemColor"
                      type="color"
                      defaultValue={settings?.primary_color || settings?.systemColor || "#3b82f6"}
                      className="w-20 h-12 p-1 border rounded"
                      onChange={(e) => {
                        const hexInput = document.querySelector('input[name="systemColorHex"]') as HTMLInputElement;
                        if (hexInput) hexInput.value = e.target.value;
                      }}
                    />
                    <Input
                      name="systemColorHex"
                      type="text"
                      placeholder="#3b82f6"
                      defaultValue={settings?.primary_color || settings?.systemColor || "#3b82f6"}
                      className="flex-1"
                      onChange={(e) => {
                        const colorInput = document.querySelector('input[name="systemColor"]') as HTMLInputElement;
                        if (colorInput && /^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          colorInput.value = e.target.value;
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Esta cor será aplicada em botões, links e elementos de destaque em todo o sistema
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Pré-visualização</Label>
                  <div className="flex space-x-2">
                    <div 
                      className="w-8 h-8 rounded border"
                      style={{ backgroundColor: settings?.systemColor || "#3b82f6" }}
                    />
                    <Button 
                      type="button" 
                      size="sm"
                      style={{ backgroundColor: settings?.systemColor || "#3b82f6" }}
                    >
                      Exemplo
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Name */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="w-5 h-5" />
                  <span>Nome do Sistema</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="systemName">Nome do Sistema</Label>
                  <Input
                    id="systemName"
                    name="systemName"
                    type="text"
                    placeholder="Sistema de Franquias"
                    defaultValue={settings?.systemName || "Sistema de Franquias"}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Este nome aparecerá no título das páginas e na sidebar para todos os usuários
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemSubtitle">Subtítulo (opcional)</Label>
                  <Input
                    id="systemSubtitle"
                    name="systemSubtitle"
                    type="text"
                    placeholder="Gestão de Franquias"
                    defaultValue={settings?.systemSubtitle || "Gestão de Franquias"}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Texto que aparece abaixo do nome na sidebar
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemDescription">Descrição do Sistema</Label>
                  <Input
                    id="systemDescription"
                    name="systemDescription"
                    type="text"
                    placeholder="Sistema completo para gestão de franquias"
                    defaultValue={settings?.systemDescription || "Sistema completo para gestão de franquias"}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Descrição que aparece na página de login e documentos
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
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
              disabled={updateSettingsMutation.isPending}
              className="min-w-32"
            >
              {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">Versão do Sistema</Label>
                <p className="font-medium">1.0.0</p>
              </div>
              <div>
                <Label className="text-gray-600">Última Atualização</Label>
                <p className="font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <Label className="text-gray-600">Ambiente</Label>
                <p className="font-medium">Produção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}