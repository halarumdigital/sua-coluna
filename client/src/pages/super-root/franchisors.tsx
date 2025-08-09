import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Building2, Users, Calendar, Globe, Phone, Mail, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  monthlyPrice: string;
}

interface Franchisor {
  id: string;
  userId: string;
  planId: string;
  companyName: string;
  legalName: string;
  cnpj: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  contactPhone: string;
  email: string;
  website?: string;
  status: string;
  planStartDate: string;
  planEndDate?: string;
  createdAt: string;
  updatedAt: string;
  // Dados do usuário
  firstName: string;
  lastName: string;
  userEmail: string;
  userPhone: string;
  // Dados do plano
  planName: string;
  planPrice: string;
  franchiseCount: number;
}

interface FranchisorFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  planId: string;
  companyName: string;
  legalName: string;
  cnpj: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  contactPhone: string;
  website: string;
  planStartDate: string;
  planEndDate: string;
}

const defaultFormData: FranchisorFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  planId: '',
  companyName: '',
  legalName: '',
  cnpj: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  contactPhone: '',
  website: '',
  planStartDate: '',
  planEndDate: '',
};

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function SuperRootFranchisors() {
  const [franchisors, setFranchisors] = useState<Franchisor[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFranchisor, setEditingFranchisor] = useState<Franchisor | null>(null);
  const [formData, setFormData] = useState<FranchisorFormData>(defaultFormData);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [franchisorsResponse, plansResponse] = await Promise.all([
        fetch('/api/super-root/franchisors'),
        fetch('/api/super-root/plans')
      ]);

      if (franchisorsResponse.ok) {
        const franchisorsData = await franchisorsResponse.json();
        setFranchisors(franchisorsData);
      } else {
        toast.error('Erro ao carregar franqueadores');
      }

      if (plansResponse.ok) {
        const plansData = await plansResponse.json();
        setPlans(plansData.filter((plan: Plan) => plan.active !== false));
      } else {
        toast.error('Erro ao carregar planos');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingFranchisor 
        ? `/api/super-root/franchisors/${editingFranchisor.id}`
        : '/api/super-root/franchisors';
      
      const method = editingFranchisor ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingFranchisor ? 'Franqueador atualizado com sucesso!' : 'Franqueador criado com sucesso!');
        setIsDialogOpen(false);
        setEditingFranchisor(null);
        setFormData(defaultFormData);
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar franqueador');
      }
    } catch (error) {
      console.error('Error saving franchisor:', error);
      toast.error('Erro ao salvar franqueador');
    }
  };

  const handleEdit = (franchisor: Franchisor) => {
    setEditingFranchisor(franchisor);
    setFormData({
      firstName: franchisor.firstName,
      lastName: franchisor.lastName,
      email: franchisor.userEmail,
      phone: franchisor.userPhone,
      password: '', // Não preenchemos a senha na edição
      planId: franchisor.planId,
      companyName: franchisor.companyName,
      legalName: franchisor.legalName,
      cnpj: franchisor.cnpj,
      street: franchisor.street,
      number: franchisor.number,
      complement: franchisor.complement || '',
      neighborhood: franchisor.neighborhood,
      city: franchisor.city,
      state: franchisor.state,
      zipCode: franchisor.zipCode,
      contactPhone: franchisor.contactPhone,
      website: franchisor.website || '',
      planStartDate: franchisor.planStartDate.split('T')[0],
      planEndDate: franchisor.planEndDate ? franchisor.planEndDate.split('T')[0] : '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (franchisorId: string) => {
    try {
      const response = await fetch(`/api/super-root/franchisors/${franchisorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Franqueador excluído com sucesso!');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir franqueador');
      }
    } catch (error) {
      console.error('Error deleting franchisor:', error);
      toast.error('Erro ao excluir franqueador');
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(price));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { label: 'Ativo', variant: 'default' as const },
      inactive: { label: 'Inativo', variant: 'secondary' as const },
      suspended: { label: 'Suspenso', variant: 'destructive' as const },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'secondary' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

  if (loading) {
    return (
      <Layout title="Gerenciamento de Franqueadores">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gerenciamento de Franqueadores">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Gerenciamento de Franqueadores
            </h2>
            <p className="text-gray-600">
              Gerencie os franqueadores do sistema
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingFranchisor(null);
                setFormData(defaultFormData);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Franqueador
              </Button>
            </DialogTrigger>
            
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingFranchisor ? 'Editar Franqueador' : 'Novo Franqueador'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados do Usuário */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Dados do Usuário</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="password">
                        {editingFranchisor ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha'}
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        required={!editingFranchisor}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Dados da Empresa */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Dados da Empresa</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Nome Fantasia</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="legalName">Razão Social</Label>
                      <Input
                        id="legalName"
                        value={formData.legalName}
                        onChange={(e) => setFormData(prev => ({ ...prev, legalName: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={formData.cnpj}
                        onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="contactPhone">Telefone de Contato</Label>
                      <Input
                        id="contactPhone"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <Label htmlFor="website">Website (opcional)</Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://exemplo.com"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Endereço</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        value={formData.complement}
                        onChange={(e) => setFormData(prev => ({ ...prev, complement: e.target.value }))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="neighborhood">Bairro</Label>
                      <Input
                        id="neighborhood"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="state">Estado</Label>
                      <Select value={formData.state} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {brazilianStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Plano */}
                <div>
                  <h3 className="text-lg font-medium mb-4">Plano</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="planId">Plano</Label>
                      <Select value={formData.planId} onValueChange={(value) => setFormData(prev => ({ ...prev, planId: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {plans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name} - {formatPrice(plan.monthlyPrice)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="planStartDate">Data de Início</Label>
                      <Input
                        id="planStartDate"
                        type="date"
                        value={formData.planStartDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, planStartDate: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="planEndDate">Data de Fim (opcional)</Label>
                      <Input
                        id="planEndDate"
                        type="date"
                        value={formData.planEndDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, planEndDate: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingFranchisor ? 'Atualizar' : 'Criar'} Franqueador
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {franchisors.map((franchisor) => (
            <Card key={franchisor.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {franchisor.companyName}
                      {getStatusBadge(franchisor.status)}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">{franchisor.legalName}</p>
                    <p className="text-xs text-gray-500">CNPJ: {franchisor.cnpj}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(franchisor)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o franqueador "{franchisor.companyName}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(franchisor.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span>{franchisor.firstName} {franchisor.lastName}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{franchisor.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{franchisor.contactPhone}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{franchisor.city}, {franchisor.state}</span>
                  </div>
                  
                  {franchisor.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <a href={franchisor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Website
                      </a>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Plano:</span>
                    <span className="font-medium">{franchisor.planName}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Preço:</span>
                    <span className="font-medium">{formatPrice(franchisor.planPrice)}/mês</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Franquias:</span>
                    <Badge variant="outline">{franchisor.franchiseCount}</Badge>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Início:</span>
                    <span>{formatDate(franchisor.planStartDate)}</span>
                  </div>
                  
                  {franchisor.planEndDate && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Fim:</span>
                      <span>{formatDate(franchisor.planEndDate)}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {franchisors.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum franqueador encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                Comece criando seu primeiro franqueador.
              </p>
              <Button onClick={() => {
                setEditingFranchisor(null);
                setFormData(defaultFormData);
                setIsDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Franqueador
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}