import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useToast } from '../../hooks/use-toast';
import { Settings, Save, TestTube } from 'lucide-react';

interface WhatsAppSettings {
  evolutionApiUrl: string;
  globalToken: string;
  systemUrl: string;
  isActive: boolean;
}

export default function SuperRootWhatsapp() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WhatsAppSettings>({
    evolutionApiUrl: '',
    globalToken: '',
    systemUrl: '',
    isActive: false
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Buscar configurações existentes
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/super-root/whatsapp-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data || {
          evolutionApiUrl: '',
          globalToken: '',
          systemUrl: '',
          isActive: false
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings.evolutionApiUrl || !settings.globalToken || !settings.systemUrl) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/super-root/whatsapp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Configurações do WhatsApp salvas com sucesso!"
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao salvar configurações');
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações do WhatsApp",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.evolutionApiUrl || !settings.globalToken) {
      toast({
        title: "Erro",
        description: "URL da Evolution API e Token Global são obrigatórios para testar",
        variant: "destructive"
      });
      return;
    }

    setTesting(true);
    try {
      const response = await fetch('/api/super-root/whatsapp-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evolutionApiUrl: settings.evolutionApiUrl,
          globalToken: settings.globalToken
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Conexão Bem-sucedida",
          description: `A conexão com a Evolution API foi estabelecida com sucesso! ${result.instanceCount ? `(${result.instanceCount} instâncias encontradas)` : ''}`
        });
      } else {
        toast({
          title: "Erro na Conexão",
          description: result.error || "Não foi possível conectar com a Evolution API",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao testar conexão com a Evolution API",
        variant: "destructive"
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Layout title="WhatsApp Franqueador">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="WhatsApp Franqueador">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Configurações WhatsApp</h1>
            <p className="text-muted-foreground">
              Configure a Evolution API para integração com WhatsApp
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações da Evolution API
            </CardTitle>
            <CardDescription>
              Configure os parâmetros de conexão com a Evolution API para habilitar as funcionalidades do WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="evolutionApiUrl">URL da Evolution API</Label>
                <Input
                  id="evolutionApiUrl"
                  type="url"
                  value={settings.evolutionApiUrl}
                  onChange={(e) => setSettings({...settings, evolutionApiUrl: e.target.value})}
                  placeholder="https://api.evolution.com"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  URL base da sua instância da Evolution API
                </p>
              </div>

              <div>
                <Label htmlFor="globalToken">Token Global</Label>
                <Input
                  id="globalToken"
                  type="password"
                  value={settings.globalToken}
                  onChange={(e) => setSettings({...settings, globalToken: e.target.value})}
                  placeholder="seu-token-global-aqui"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Token de autenticação global da Evolution API
                </p>
              </div>

              <div>
                <Label htmlFor="systemUrl">URL do Sistema</Label>
                <Input
                  id="systemUrl"
                  type="url"
                  value={settings.systemUrl}
                  onChange={(e) => setSettings({...settings, systemUrl: e.target.value})}
                  placeholder="https://seu-sistema.com"
                  className="mt-1"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  URL do seu sistema que será usada nos webhooks
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={settings.isActive}
                  onCheckedChange={(checked) => setSettings({...settings, isActive: checked})}
                />
                <Label htmlFor="isActive">Ativar integração WhatsApp</Label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-900 mb-2">Informações Importantes:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• A URL da Evolution API deve estar acessível e funcionando</li>
                <li>• O Token Global deve ter permissões para criar e gerenciar instâncias</li>
                <li>• A URL do Sistema será usada para configurar webhooks automaticamente</li>
                <li>• Certifique-se de que a URL do Sistema seja acessível pela Evolution API</li>
              </ul>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testing || !settings.evolutionApiUrl || !settings.globalToken}
              >
                {testing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Testar Conexão
                  </>
                )}
              </Button>

              <Button
                onClick={handleSaveSettings}
                disabled={saving}
                className="flex-1"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Configurações
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {settings.isActive && settings.evolutionApiUrl && settings.globalToken && settings.systemUrl && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-green-600">✅ WhatsApp Configurado</CardTitle>
              <CardDescription>
                A integração com WhatsApp está ativa e configurada. Os franqueadores podem agora criar e gerenciar suas instâncias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Evolution API:</span>
                  <p className="text-muted-foreground truncate">{settings.evolutionApiUrl}</p>
                </div>
                <div>
                  <span className="font-medium">Token:</span>
                  <p className="text-muted-foreground">••••••••••••••••</p>
                </div>
                <div>
                  <span className="font-medium">Sistema:</span>
                  <p className="text-muted-foreground truncate">{settings.systemUrl}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}