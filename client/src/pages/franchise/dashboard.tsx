import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/layout";
import StatsCard from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Calendar, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientDashboard() {
  const { user } = useAuth();
  
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/franchise/clients"],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  // Find current client
  const currentClient = clients?.find((c: any) => c.userId === user?.id);

  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats/client", currentClient?.id],
    enabled: !!currentClient?.id,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: "Rascunho", className: "bg-gray-100 text-gray-800" },
      sent: { label: "Enviada", className: "bg-blue-100 text-blue-800" },
      paid: { label: "Paga", className: "bg-green-100 text-green-800" },
      overdue: { label: "Vencida", className: "bg-red-100 text-red-800" },
      cancelled: { label: "Cancelada", className: "bg-gray-100 text-gray-800" },
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    
    return (
      <Badge variant="secondary" className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    );
  };

  if (statsLoading || invoicesLoading) {
    return (
      <Layout title="Meu Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Meu Dashboard">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Meu Dashboard</h2>
          <p className="text-gray-600">
            Visão geral das suas faturas e informações
          </p>
        </div>

        {/* Client Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatsCard
            title="Faturas Pendentes"
            value={stats?.pendingInvoices || 0}
            icon={AlertTriangle}
            iconBgColor="bg-red-100"
            iconColor="text-red-600"
          />
          
          <StatsCard
            title="Total em Aberto"
            value={formatCurrency(stats?.totalOpen || 0)}
            icon={Clock}
            iconBgColor="bg-yellow-100"
            iconColor="text-yellow-600"
          />
          
          <StatsCard
            title="Próximo Vencimento"
            value={stats?.nextDue ? new Date(stats.nextDue).toLocaleDateString("pt-BR") : "Nenhum"}
            icon={Calendar}
            iconBgColor="bg-blue-100"
            iconColor="text-blue-600"
          />
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Faturas Recentes</CardTitle>
              <Button variant="outline" size="sm">
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {invoices && invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Número</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.slice(0, 5).map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          {invoice.number}
                        </TableCell>
                        <TableCell>
                          {new Date(invoice.issueDate).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(parseFloat(invoice.amount))}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma fatura encontrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
