import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import DataTable from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFranchiseSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Store, MapPin, User, Phone, Mail, Building } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function FranchisesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: franchises, isLoading } = useQuery({
    queryKey: ["/api/admin/franchises"],
  });

  const createFranchiseMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/admin/franchises", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/franchises"] });
      toast({
        title: "Sucesso",
        description: "Franquia criada com sucesso",
      });
      setDialogOpen(false);
      form.reset();
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
    resolver: zodResolver(createFranchiseSchema),
    defaultValues: {
      // Dados do usuário
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",

      // Dados da franquia
      franchiseName: "",
      franchiseCode: "",

      // Endereço
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",

      // Contatos
      contactPhone: "",

      // Responsável
      managerName: "",
      managerPhone: "",
      managerEmail: "",
    },
  });

  const onSubmit = (data: any) => {
    createFranchiseMutation.mutate(data);
  };

  const filteredFranchises = franchises?.filter((franchise: any) =>
    franchise.franchiseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    franchise.franchiseCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    franchise.managerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    franchise.city?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const columns = [
    {
      key: "franchiseName",
      header: "Franquia",
      render: (value: string, row: any) => (
        <div className="flex items-center space-x-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>
              <Store className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">Código: {row.franchiseCode}</div>
          </div>
        </div>
      ),
    },
    {
      key: "managerName",
      header: "Responsável",
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: "city",
      header: "Localização",
      render: (value: string, row: any) => (
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span>{value}, {row.state}</span>
        </div>
      ),
    },
    {
      key: "contactPhone",
      header: "Telefone",
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-gray-400" />
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => (
        <Badge 
          variant={value === "active" ? "default" : "secondary"}
          className={value === "active" ? "bg-green-100 text-green-800" : ""}
        >
          {value === "active" ? "Ativa" : "Inativa"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Criado em",
      render: (value: string) => new Date(value).toLocaleDateString("pt-BR"),
    },
  ];

  if (isLoading) {
    return (
      <Layout title="Franquias">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Franquias">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Gerenciar Franquias
            </h2>
            <p className="text-gray-600">
              Gerencie todas as franquias da sua rede
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Franquia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Nova Franquia</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Dados do Responsável */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <User className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold">Dados do Responsável</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do responsável" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sobrenome *</FormLabel>
                              <FormControl>
                                <Input placeholder="Sobrenome do responsável" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@exemplo.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone *</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Senha *</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Senha de acesso" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dados da Franquia */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <Store className="w-5 h-5 text-green-500" />
                        <h3 className="text-lg font-semibold">Dados da Franquia</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="franchiseName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome da Franquia *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome da franquia" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="franchiseCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Código da Franquia *</FormLabel>
                              <FormControl>
                                <Input placeholder="Código único da franquia" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone de Contato *</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Endereço */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <MapPin className="w-5 h-5 text-orange-500" />
                        <h3 className="text-lg font-semibold">Endereço</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <FormField
                            control={form.control}
                            name="street"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rua *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome da rua" {...field} />
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
                              <FormLabel>Número *</FormLabel>
                              <FormControl>
                                <Input placeholder="123" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="complement"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Complemento</FormLabel>
                              <FormControl>
                                <Input placeholder="Apto, Sala, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="neighborhood"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bairro *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do bairro" {...field} />
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
                              <FormLabel>CEP *</FormLabel>
                              <FormControl>
                                <Input placeholder="00000-000" {...field} />
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
                              <FormLabel>Cidade *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome da cidade" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Estado *</FormLabel>
                              <FormControl>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione o estado" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AC">Acre</SelectItem>
                                    <SelectItem value="AL">Alagoas</SelectItem>
                                    <SelectItem value="AP">Amapá</SelectItem>
                                    <SelectItem value="AM">Amazonas</SelectItem>
                                    <SelectItem value="BA">Bahia</SelectItem>
                                    <SelectItem value="CE">Ceará</SelectItem>
                                    <SelectItem value="DF">Distrito Federal</SelectItem>
                                    <SelectItem value="ES">Espírito Santo</SelectItem>
                                    <SelectItem value="GO">Goiás</SelectItem>
                                    <SelectItem value="MA">Maranhão</SelectItem>
                                    <SelectItem value="MT">Mato Grosso</SelectItem>
                                    <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                                    <SelectItem value="MG">Minas Gerais</SelectItem>
                                    <SelectItem value="PA">Pará</SelectItem>
                                    <SelectItem value="PB">Paraíba</SelectItem>
                                    <SelectItem value="PR">Paraná</SelectItem>
                                    <SelectItem value="PE">Pernambuco</SelectItem>
                                    <SelectItem value="PI">Piauí</SelectItem>
                                    <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                                    <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                                    <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                                    <SelectItem value="RO">Rondônia</SelectItem>
                                    <SelectItem value="RR">Roraima</SelectItem>
                                    <SelectItem value="SC">Santa Catarina</SelectItem>
                                    <SelectItem value="SP">São Paulo</SelectItem>
                                    <SelectItem value="SE">Sergipe</SelectItem>
                                    <SelectItem value="TO">Tocantins</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Gerente da Franquia */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <Building className="w-5 h-5 text-purple-500" />
                        <h3 className="text-lg font-semibold">Gerente da Franquia</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="managerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome do Gerente *</FormLabel>
                              <FormControl>
                                <Input placeholder="Nome do gerente" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="managerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Telefone do Gerente</FormLabel>
                              <FormControl>
                                <Input placeholder="(11) 99999-9999" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="managerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email do Gerente</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="gerente@exemplo.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end space-x-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createFranchiseMutation.isPending}
                    >
                      {createFranchiseMutation.isPending ? "Criando..." : "Criar Franquia"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar franquias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <DataTable data={filteredFranchises} columns={columns} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}