import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";
import {
  Calendar,
  Users,
  Activity,
  TrendingUp,
  Clock,
  Stethoscope,
  Heart,
  BarChart3,
  CalendarDays,
  DollarSign
} from "lucide-react";

// Dados simulados para demonstração - em produção viriam da API
const consultasData = [
  { mes: 'Jan', consultas: 45, receita: 18500 },
  { mes: 'Fev', consultas: 52, receita: 21400 },
  { mes: 'Mar', consultas: 38, receita: 15600 },
  { mes: 'Abr', consultas: 61, receita: 25100 },
  { mes: 'Mai', consultas: 55, receita: 22600 },
  { mes: 'Jun', consultas: 67, receita: 27500 },
];

const tratamentosData = [
  { nome: 'Consulta Inicial', valor: 35, color: '#3B82F6' },
  { nome: 'Fisioterapia', valor: 28, color: '#10B981' },
  { nome: 'Acupuntura', valor: 18, color: '#F59E0B' },
  { nome: 'Pilates Clínico', valor: 12, color: '#EF4444' },
  { nome: 'Outros', valor: 7, color: '#8B5CF6' },
];

const tiposConsultaData = [
  { tipo: 'Consulta', quantidade: 25 },
  { tipo: 'Retorno', quantidade: 35 },
  { tipo: 'Emergência', quantidade: 8 },
  { tipo: 'Exame', quantidade: 15 },
];

const proximosAgendamentos = [
  {
    id: 1,
    paciente: "Maria Silva",
    tipo: "Consulta Inicial",
    horario: "09:00",
    data: "Hoje",
    urgencia: "normal"
  },
  {
    id: 2,
    paciente: "João Santos",
    tipo: "Retorno",
    horario: "10:30",
    data: "Hoje", 
    urgencia: "normal"
  },
  {
    id: 3,
    paciente: "Ana Costa",
    tipo: "Fisioterapia",
    horario: "14:00",
    data: "Amanhã",
    urgencia: "alta"
  },
  {
    id: 4,
    paciente: "Pedro Lima",
    tipo: "Acupuntura",
    horario: "16:00",
    data: "Amanhã",
    urgencia: "normal"
  }
];

const StatsCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = "blue" }: any) => {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600", 
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
    red: "from-red-500 to-red-600"
  };

  return (
    <Card className="relative overflow-hidden border-0 shadow-lg">
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-95`} />
      <CardContent className="relative p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-white/80 text-sm font-medium">{title}</p>
            <div className="space-y-1">
              <p className="text-3xl font-bold">{value}</p>
              {subtitle && <p className="text-white/90 text-sm">{subtitle}</p>}
            </div>
            {trend && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>{trendValue} vs mês anterior</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MedicalDashboard() {
  const { user } = useAuth();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getUrgenciaBadge = (urgencia: string) => {
    const urgenciaMap = {
      alta: { label: "Alta", className: "bg-red-100 text-red-800 border-red-200" },
      normal: { label: "Normal", className: "bg-green-100 text-green-800 border-green-200" },
      baixa: { label: "Baixa", className: "bg-blue-100 text-blue-800 border-blue-200" },
    };
    
    const urgenciaInfo = urgenciaMap[urgencia as keyof typeof urgenciaMap] || urgenciaMap.normal;
    
    return (
      <Badge variant="outline" className={urgenciaInfo.className}>
        {urgenciaInfo.label}
      </Badge>
    );
  };

  return (
    <Layout title="Dashboard Clínica">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Clínica da Coluna</h1>
            <p className="text-gray-600">
              Visão geral dos seus atendimentos e performance da clínica
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Última atualização</p>
            <p className="font-medium">{new Date().toLocaleDateString("pt-BR")}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Consultas Hoje"
            value="12"
            subtitle="8 realizadas, 4 agendadas"
            icon={Calendar}
            color="blue"
            trend={true}
            trendValue="+15%"
          />
          
          <StatsCard
            title="Pacientes Esta Semana"
            value="67"
            subtitle="58 atendidos"
            icon={Users}
            color="green"
            trend={true}
            trendValue="+8%"
          />
          
          <StatsCard
            title="Receita Mensal"
            value={formatCurrency(27500)}
            subtitle="Meta: R$ 30.000"
            icon={DollarSign}
            color="purple"
            trend={true}
            trendValue="+12%"
          />
          
          <StatsCard
            title="Taxa de Ocupação"
            value="85%"
            subtitle="Acima da média"
            icon={Activity}
            color="orange"
            trend={true}
            trendValue="+5%"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução de Consultas */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Evolução de Consultas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={consultasData}>
                  <defs>
                    <linearGradient id="consultasGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="consultas"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#consultasGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Receita Mensal */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Receita Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consultasData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="mes" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [formatCurrency(value), 'Receita']}
                  />
                  <Line
                    type="monotone"
                    dataKey="receita"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Second Row Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tipos de Tratamento */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-purple-600" />
                Tratamentos Mais Procurados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tratamentosData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="valor"
                  >
                    {tratamentosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Percentual']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Tipos de Consulta */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-orange-600" />
                Distribuição por Tipo de Consulta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tiposConsultaData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="tipo" stroke="#6B7280" />
                  <YAxis stroke="#6B7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="quantidade" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Próximos Agendamentos */}
        <Card className="shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Próximos Agendamentos
              </CardTitle>
              <Button variant="outline" size="sm">
                Ver agenda completa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proximosAgendamentos.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Heart className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{agendamento.paciente}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{agendamento.tipo}</span>
                        <span>•</span>
                        <span>{agendamento.data} às {agendamento.horario}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getUrgenciaBadge(agendamento.urgencia)}
                    <Button variant="ghost" size="sm">
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}