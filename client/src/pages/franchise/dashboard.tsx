import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
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

// Dados simulados removidos - agora vem da API do Google Calendar

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

  // Fetch franchise profile data for company name
  const { data: profileData } = useQuery({
    queryKey: ["franchise-profile"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/franchise/profile");
        return response.json();
      } catch (error) {
        console.warn("Error fetching franchise profile:", error);
        return null;
      }
    },
  });

  // Fetch calendar events
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/franchise/calendar-events"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/franchise/calendar-events");
        return response.json();
      } catch (error) {
        console.warn("Error fetching calendar events:", error);
        return []; // Return empty array on error
      }
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Format calendar events for display
  const formatCalendarEvents = (events: any[]) => {
    const now = new Date();
    const today = now.toDateString();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();

    return events.map(event => {
      const eventDate = new Date(event.start);
      const eventDateString = eventDate.toDateString();
      
      let displayDate = eventDate.toLocaleDateString("pt-BR");
      if (eventDateString === today) {
        displayDate = "Hoje";
      } else if (eventDateString === tomorrow) {
        displayDate = "Amanhã";
      }
      
      // Extract patient name from event summary or description
      let pacienteName = "Paciente";
      if (event.summary) {
        // Try to extract name from common patterns
        const summaryLower = event.summary.toLowerCase();
        if (summaryLower.includes("consulta")) {
          const words = event.summary.split(" ");
          const consultaIndex = words.findIndex(word => word.toLowerCase().includes("consulta"));
          if (consultaIndex > 0) {
            pacienteName = words.slice(0, consultaIndex).join(" ");
          }
        } else {
          pacienteName = event.summary;
        }
      }
      
      // Try to determine event type
      let tipo = "Consulta";
      if (event.summary) {
        const summaryLower = event.summary.toLowerCase();
        if (summaryLower.includes("fisio")) tipo = "Fisioterapia";
        else if (summaryLower.includes("acupuntura")) tipo = "Acupuntura";
        else if (summaryLower.includes("retorno")) tipo = "Retorno";
        else if (summaryLower.includes("inicial")) tipo = "Consulta Inicial";
        else if (summaryLower.includes("pilates")) tipo = "Pilates Clínico";
      }
      
      return {
        id: event.id,
        paciente: pacienteName,
        tipo: tipo,
        horario: eventDate.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' }),
        data: displayDate,
        urgencia: "normal", // Default urgency
        fullEvent: event
      };
    }).slice(0, 4); // Limit to 4 events
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {profileData?.companyName || "Clínica da Coluna"}
            </h1>
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
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-600">Carregando agendamentos...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {formatCalendarEvents(calendarEvents).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 bg-gray-100 rounded-full w-12 h-12 mx-auto mb-3">
                      <Calendar className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-600">Nenhum agendamento encontrado</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Configure sua integração com Google Calendar para ver seus agendamentos aqui
                    </p>
                  </div>
                ) : (
                  formatCalendarEvents(calendarEvents).map((agendamento) => (
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
                          {agendamento.fullEvent.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                              <span>📍</span>
                              <span>{agendamento.fullEvent.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getUrgenciaBadge(agendamento.urgencia)}
                        <Button variant="ghost" size="sm">
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}