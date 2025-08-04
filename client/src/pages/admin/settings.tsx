import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Palette, Type, Image, Shield, Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createRoleSchema } from "@shared/schema";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [previewColor, setPreviewColor] = useState<string>("");

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    onSuccess: (data) => {
      console.log("Settings loaded:", data);
      setPreviewColor(data?.primary_color || data?.systemColor || "#3b82f6");
    },
  });

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/admin/roles"],
  });

  // Role form
  const roleForm = useForm({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      displayName: "",
      description: "",
      permissions: [],
      active: true,
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        body: data,
      });
      if (!response.ok) {
        throw new Error("Erro ao salvar configurações");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive",
      });
    },
  });

  // Create/Update role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingRole ? `/api/admin/roles/${editingRole.id}` : "/api/admin/roles";
      const method = editingRole ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Erro ao salvar role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: editingRole ? "Role atualizada com sucesso!" : "Role criada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      setRoleDialogOpen(false);
      setEditingRole(null);
      roleForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar role",
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Erro ao deletar role");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Role deletada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao deletar role",
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

  const handleRoleSubmit = (data: any) => {
    createRoleMutation.mutate(data);
  };

  const handleEditRole = (role: any) => {
    setEditingRole(role);
    roleForm.reset({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      permissions: role.permissions || [],
      active: role.active,
    });
    setRoleDialogOpen(true);
  };

  const handleDeleteRole = (roleId: string) => {
    if (confirm("Tem certeza que deseja deletar esta role?")) {
      deleteRoleMutation.mutate(roleId);
    }
  };

  const availablePermissions = [
    "dashboard.view",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",
    "clients.view",
    "clients.create",
    "clients.edit",
    "clients.delete",
    "team.view",
    "team.create",
    "team.edit",
    "team.delete",
    "projects.view",
    "projects.create",
    "projects.edit",
    "projects.delete",
    "invoices.view",
    "invoices.create",
    "invoices.edit",
    "invoices.delete",
    "settings.view",
    "settings.edit",
    "reports.view",
  ];

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
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Configurações do Sistema
          </h2>
          <p className="text-gray-600">
            Personalize a aparência e configurações gerais do sistema
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
                        Arquivo: {settings.logo || settings.system_logo}
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
                      <Upload className="w-4 h-4 mr-2" />
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
                        Arquivo: {settings.favicon || settings.system_favicon}
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
                    Esta cor será aplicada em botões, links e elementos de destaque
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
                    placeholder="Sistema de Gerenciamento"
                    defaultValue={settings?.systemName || "Sistema de Gerenciamento"}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Este nome aparecerá no título das páginas e na sidebar
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="systemSubtitle">Subtítulo (opcional)</Label>
                  <Input
                    id="systemSubtitle"
                    name="systemSubtitle"
                    type="text"
                    placeholder="Gerenciamento"
                    defaultValue={settings?.systemSubtitle || "Gerenciamento"}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    Texto que aparece abaixo do nome na sidebar
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateSettingsMutation.isPending}
              className="min-w-32"
            >
              {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>

        {/* Roles Management Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Gerenciamento de Roles
              </h3>
              <p className="text-gray-600">
                Crie e gerencie roles personalizadas para controle de acesso
              </p>
            </div>
            <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingRole(null);
                  roleForm.reset();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingRole ? "Editar Role" : "Nova Role"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...roleForm}>
                  <form onSubmit={roleForm.handleSubmit(handleRoleSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={roleForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Role</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ex: manager" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={roleForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome de Exibição</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ex: Gerente" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={roleForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Descreva as responsabilidades desta role..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={roleForm.control}
                      name="permissions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Permissões</FormLabel>
                          <FormControl>
                            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-3">
                              {availablePermissions.map((permission) => (
                                <div key={permission} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={permission}
                                    checked={field.value.includes(permission)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        field.onChange([...field.value, permission]);
                                      } else {
                                        field.onChange(field.value.filter((p: string) => p !== permission));
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <label htmlFor={permission} className="text-sm">
                                    {permission}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={roleForm.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between">
                          <FormLabel>Role Ativa</FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRoleDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createRoleMutation.isPending}>
                        {createRoleMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Roles List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Roles do Sistema</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {roles?.map((role: any) => (
                    <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{role.displayName}</h4>
                          <Badge variant={role.active ? "default" : "secondary"}>
                            {role.active ? "Ativa" : "Inativa"}
                          </Badge>
                          {role.isSystem && (
                            <Badge variant="outline">Sistema</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {role.description || "Sem descrição"}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {role.permissions?.slice(0, 3).map((permission: string) => (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                          {role.permissions?.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{role.permissions.length - 3} mais
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRole(role)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteRole(role.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma role encontrada. Crie a primeira role personalizada.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}