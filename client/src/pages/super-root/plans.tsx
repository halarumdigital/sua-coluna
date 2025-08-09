import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Edit, Trash2, Package, Users, Phone, Bot, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  maxFranchises: number;
  maxPhoneNumbers: number;
  maxAgents: number;
  maxPrompts: number;
  monthlyPrice: string;
  features: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PlanFormData {
  name: string;
  description: string;
  maxFranchises: number;
  maxPhoneNumbers: number;
  maxAgents: number;
  maxPrompts: number;
  monthlyPrice: string;
  features: string[];
  active: boolean;
}

const defaultPlanData: PlanFormData = {
  name: '',
  description: '',
  maxFranchises: 1,
  maxPhoneNumbers: 1,
  maxAgents: 1,
  maxPrompts: 5,
  monthlyPrice: '0.00',
  features: [],
  active: true,
};



export default function SuperRootPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlanData);




  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/super-root/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      } else {
        toast.error('Erro ao carregar planos');
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Erro ao carregar planos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingPlan 
        ? `/api/super-root/plans/${editingPlan.id}`
        : '/api/super-root/plans';
      
      const method = editingPlan ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingPlan ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!');
        setIsDialogOpen(false);
        setEditingPlan(null);
        setFormData(defaultPlanData);
        fetchPlans();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao salvar plano');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Erro ao salvar plano');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      maxFranchises: plan.maxFranchises,
      maxPhoneNumbers: plan.maxPhoneNumbers,
      maxAgents: plan.maxAgents,
      maxPrompts: plan.maxPrompts,
      monthlyPrice: plan.monthlyPrice,
      features: Array.isArray(plan.features) ? plan.features : [],
      active: plan.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    try {
      const response = await fetch(`/api/super-root/plans/${planId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Plano excluído com sucesso!');
        fetchPlans();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Erro ao excluir plano');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Erro ao excluir plano');
    }
  };



  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(price));
  };

  if (loading) {
    return (
      <Layout title="Gerenciamento de Planos">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gerenciamento de Planos">
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Gerenciamento de Planos
            </h2>
            <p className="text-gray-600">
              Configure os planos disponíveis para franqueadores
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingPlan(null);
              setFormData(defaultPlanData);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nome do Plano</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Plano Básico"
                    required
                  />
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do plano..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="monthlyPrice">Preço Mensal (R$)</Label>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.monthlyPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyPrice: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxFranchises">Máx. Franquias</Label>
                  <Input
                    id="maxFranchises"
                    type="number"
                    min="1"
                    value={formData.maxFranchises}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxFranchises: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxPhoneNumbers">Máx. Números por Franquia</Label>
                  <Input
                    id="maxPhoneNumbers"
                    type="number"
                    min="1"
                    value={formData.maxPhoneNumbers}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxPhoneNumbers: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxAgents">Máx. Agentes por Franquia</Label>
                  <Input
                    id="maxAgents"
                    type="number"
                    min="1"
                    value={formData.maxAgents}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxAgents: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="maxPrompts">Máx. Prompts por Franquia</Label>
                  <Input
                    id="maxPrompts"
                    type="number"
                    min="1"
                    value={formData.maxPrompts}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxPrompts: parseInt(e.target.value) }))}
                    required
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
                <Label htmlFor="active">Plano Ativo</Label>
              </div>
              
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPlan ? 'Atualizar' : 'Criar'} Plano
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${!plan.active ? 'opacity-60' : ''}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    {plan.name}
                    {!plan.active && <Badge variant="secondary">Inativo</Badge>}
                  </CardTitle>
                  {plan.description && (
                    <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(plan)}
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
                          Tem certeza que deseja excluir o plano "{plan.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(plan.id)}>
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {formatPrice(plan.monthlyPrice)}
                </div>
                <div className="text-sm text-gray-500">por mês</div>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Franquias
                  </span>
                  <Badge variant="outline">{plan.maxFranchises}</Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Números
                  </span>
                  <Badge variant="outline">{plan.maxPhoneNumbers}</Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Agentes
                  </span>
                  <Badge variant="outline">{plan.maxAgents}</Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Prompts
                  </span>
                  <Badge variant="outline">{plan.maxPrompts}</Badge>
                </div>
              </div>
              

            </CardContent>
          </Card>
        ))}
        </div>
        
        {plans.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhum plano encontrado
            </h3>
            <p className="text-gray-500 mb-4">
              Comece criando seu primeiro plano para franqueadores.
            </p>
            <Button onClick={() => {
              setEditingPlan(null);
              setFormData(defaultPlanData);
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
        )}
      </div>
    </Layout>
  );
}