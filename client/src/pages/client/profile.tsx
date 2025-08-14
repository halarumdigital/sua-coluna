import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
// SCHEMA REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
// import { editClientSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import React from "react";

export default function ClientProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar dados do perfil do cliente usando a nova rota específica
  const { data: clientData, isLoading, error } = useQuery({
    queryKey: ["client-profile"],
    queryFn: async () => {
      console.log("🔍 Fazendo requisição para /api/client/profile");
      const response = await apiRequest("GET", "/api/client/profile");
      const data = await response.json();
      console.log("📥 Dados recebidos:", data);
      return data;
    },
    enabled: !!user, // Só executa se o usuário estiver logado
  });

  console.log("👤 Usuário atual:", user);
  console.log("📊 Dados do cliente:", clientData);
  console.log("⏳ Carregando:", isLoading);
  console.log("❌ Erro:", error);

  const updateClientMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("PUT", "/api/client/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    // SCHEMA REMOVIDO - TABELA CLIENTS NÃO MAIS UTILIZADA
    // resolver: zodResolver(editClientSchema.partial()),
    defaultValues: {
      companyName: "",
      legalName: "",
      cpfCnpj: "",
      taxId: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      contactPhone: "",
      whatsapp: "",
      email: "",
      website: "",
      address: "",
    },
  });

  // Atualizar os valores do formulário quando os dados chegarem
  React.useEffect(() => {
    if (clientData) {
      console.log("🔄 Atualizando formulário com dados:", clientData);
      form.reset({
        companyName: clientData.companyName || "",
        legalName: clientData.legalName || "",
        cpfCnpj: clientData.cpfCnpj || "",
        taxId: clientData.taxId || "",
        street: clientData.street || "",
        number: clientData.number || "",
        complement: clientData.complement || "",
        neighborhood: clientData.neighborhood || "",
        city: clientData.city || "",
        state: clientData.state || "",
        zipCode: clientData.zipCode || "",
        contactPhone: clientData.contactPhone || "",
        whatsapp: clientData.whatsapp || "",
        email: clientData.email || "",
        website: clientData.website || "",
        address: clientData.address || "",
      });
    }
  }, [clientData, form]);

  const onSubmit = (data: any) => {
    updateClientMutation.mutate(data);
  };

  const getUserInitials = () => {
    if (user && typeof user === 'object' && 'firstName' in user && 'lastName' in user && user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user && typeof user === 'object' && 'email' in user && user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (isLoading) {
    return (
      <Layout title="Meu Perfil">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando dados do perfil...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Meu Perfil">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600">Erro ao carregar dados: {error.message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Meu Perfil">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="px-4 sm:px-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Meu Perfil</h2>
          <p className="text-sm sm:text-base text-gray-600">Gerencie suas informações pessoais e da empresa</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Profile Info Card */}
          <div className="xl:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Avatar className="w-16 h-16 sm:w-24 sm:h-24 mx-auto">
                  <AvatarImage
                    src={user && typeof user === 'object' && 'profileImageUrl' in user ? user.profileImageUrl || "" : ""}
                    alt="Profile"
                    className="object-cover"
                  />
                  <AvatarFallback className="text-lg sm:text-xl">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                    {user && typeof user === 'object' && 'firstName' in user && 'lastName' in user && user.firstName && user.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user && typeof user === 'object' && 'email' in user && user.email ? user.email.split("@")[0] : "Usuário"}
                  </h3>
                  <p className="text-sm text-gray-600">{user && typeof user === 'object' && 'email' in user ? user.email : ''}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs sm:text-sm font-medium text-blue-800">Cliente</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Form */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Informações da Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Dados básicos da empresa */}
                    <div className="space-y-4">
                      <h4 className="text-base font-medium text-gray-900">Dados Básicos</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome Fantasia</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="legalName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Razão Social</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="cpfCnpj"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPF/CNPJ</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="taxId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inscrição Estadual</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Endereço */}
                    <div className="space-y-4">
                      <h4 className="text-base font-medium text-gray-900">Endereço</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rua</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Número</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="complement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="neighborhood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cidade</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CEP</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Endereço completo (legacy) */}
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço Completo (Legado)</FormLabel>
                            <FormControl>
                              <Textarea {...field} className="min-h-[80px]" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Contatos */}
                    <div className="space-y-4">
                      <h4 className="text-base font-medium text-gray-900">Contatos</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone de Contato</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="whatsapp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>WhatsApp</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input {...field} type="email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="website"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Website</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4 border-t">
                      <Button 
                        type="submit" 
                        disabled={updateClientMutation.isPending}
                        className="w-full sm:w-auto"
                      >
                        {updateClientMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
