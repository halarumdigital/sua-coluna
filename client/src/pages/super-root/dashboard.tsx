import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Store, Users, TrendingUp, Plus } from "lucide-react";
import { Link } from "wouter";

interface Plan {
  id: string;
  name: string;
  description: string;
  maxFranchises: number;
  maxPhoneNumbers: number;
  maxAgents: number;
  maxPrompts: number;
  monthlyPrice: number;
  features: string[];
  active: boolean;
}

interface Franchisor {
  id: string;
  companyName: string;
  email: string;
  status: string;
  planName: string;
  franchiseCount: number;
}

export default function SuperRootDashboard() {
  const { data: plans = [], isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["/api/super-root/plans"],
  });

  const { data: franchisors = [], isLoading: franchisorsLoading } = useQuery<Franchisor[]>({
    queryKey: ["/api/super-root/franchisors"],
  });

  if (plansLoading || franchisorsLoading) {
    return (
      <Layout title="Super Root Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const activePlans = plans.filter(p => p.active);
  const activeFranchisors = franchisors.filter(f => f.status === 'active');
  const totalFranchises = franchisors.reduce((sum, f) => sum + (f.franchiseCount || 0), 0);
  const totalRevenue = franchisors.reduce((sum, f) => {
    const plan = plans.find(p => p.name === f.planName);
    return sum + (plan?.monthlyPrice || 0);
  }, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Layout title="Super Root Dashboard">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Painel de Controle do Sistema
          </h2>
          <p className="text-gray-600">
            Visão geral completa do sistema de franquias
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Planos Ativos"
            value={activePlans.length}
            icon={Building2}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
            trend={{
              value: `${plans.length - activePlans.length} inativos`,
              isPositive: activePlans.length > 0,
              label: "total de planos",
            }}
          />
          
          <StatsCard
            title="Franqueadores"
            value={activeFranchisors.length}
            icon={Store}
            iconBgColor="bg-green-100"
            iconColor="text-green-600"
            trend={{
              value: `${franchisors.length - activeFranchisors.length} inativos`,
              isPositive: activeFranchisors.length > 0,
              label: "total de franqueadores",
            }}
          />
          
          <StatsCard
            title="Total de Franquias"
            value={totalFranchises}
            icon={Users}
            iconBgColor="bg-purple-100"
            iconColor="text-purple-600"
            trend={{
              value: "Distribuídas",
              isPositive: true,
              label: "entre franqueadores",
            }}
          />
          
          <StatsCard
            title="Receita Mensal"
            value={formatCurrency(totalRevenue)}
            icon={TrendingUp}
            iconBgColor="bg-orange-100"
            iconColor="text-orange-600"
            trend={{
              value: "Recorrente",
              isPositive: true,
              label: "receita mensal",
            }}
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Planos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Planos Disponíveis</CardTitle>
                <CardDescription>
                  Gerencie os planos oferecidos aos franqueadores
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/super-root/plans">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Plano
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plans.slice(0, 3).map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{plan.name}</h3>
                        <Badge variant={plan.active ? "default" : "secondary"}>
                          {plan.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(plan.monthlyPrice)}/mês
                      </p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>{plan.maxFranchises} franquias</div>
                      <div>{plan.maxAgents} agentes</div>
                    </div>
                  </div>
                ))}
                {plans.length > 3 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/super-root/plans">
                      Ver todos os planos ({plans.length})
                    </Link>
                  </Button>
                )}
                {plans.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum plano encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Franqueadores */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Franqueadores Recentes</CardTitle>
                <CardDescription>
                  Empresas que utilizam o sistema
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/super-root/franchisors">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Franqueador
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {franchisors.slice(0, 3).map((franchisor) => (
                  <div key={franchisor.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{franchisor.companyName}</h3>
                        <Badge variant={franchisor.status === 'active' ? "default" : "secondary"}>
                          {franchisor.status === 'active' ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{franchisor.email}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <div>Plano: {franchisor.planName}</div>
                      <div>{franchisor.franchiseCount || 0} franquias</div>
                    </div>
                  </div>
                ))}
                {franchisors.length > 3 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/super-root/franchisors">
                      Ver todos os franqueadores ({franchisors.length})
                    </Link>
                  </Button>
                )}
                {franchisors.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum franqueador encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às principais funcionalidades do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                <Link href="/super-root/plans">
                  <Building2 className="h-6 w-6" />
                  <span>Gerenciar Planos</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                <Link href="/super-root/franchisors">
                  <Store className="h-6 w-6" />
                  <span>Gerenciar Franqueadores</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2" asChild>
                <Link href="/super-root/reports">
                  <TrendingUp className="h-6 w-6" />
                  <span>Relatórios do Sistema</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}