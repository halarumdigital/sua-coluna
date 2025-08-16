import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import DataTable from "@/components/tables/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ClientInvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["/api/invoices"],
  });

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numValue);
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

  const columns = [
    {
      key: "number",
      header: "Número",
      render: (value: string) => (
        <div className="font-medium text-gray-900">{value}</div>
      ),
    },
    {
      key: "issueDate",
      header: "Data Emissão",
      render: (value: string) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("pt-BR");
      },
    },
    {
      key: "dueDate",
      header: "Vencimento",
      render: (value: string) => {
        if (!value) return "-";
        return new Date(value).toLocaleDateString("pt-BR");
      },
    },
    {
      key: "amount",
      header: "Valor",
      render: (value: string) => formatCurrency(value),
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => getStatusBadge(value),
    },
  ];

  const handleDownloadPDF = (invoice: any) => {
    // TODO: Implement PDF download
    console.log("Download PDF for invoice:", invoice);
  };

  const filteredInvoices = invoices?.filter((invoice: any) => {
    if (statusFilter !== "all" && invoice.status !== statusFilter) {
      return false;
    }
    
    if (startDate && new Date(invoice.issueDate) < new Date(startDate)) {
      return false;
    }
    
    if (endDate && new Date(invoice.issueDate) > new Date(endDate)) {
      return false;
    }
    
    return true;
  }) || [];

  if (isLoading) {
    return (
      <Layout title="Minhas Faturas">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Minhas Faturas">
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Minhas Faturas</h2>
          <p className="text-gray-600">Gerencie e baixe suas faturas</p>
        </div>

        {/* Invoice Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="sent">Pendente</SelectItem>
                    <SelectItem value="paid">Paga</SelectItem>
                    <SelectItem value="overdue">Vencida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full">
                  <Search className="w-4 h-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <DataTable
          columns={columns}
          data={filteredInvoices}
          onView={(invoice) => console.log("View", invoice)}
          onEdit={(invoice) => handleDownloadPDF(invoice)}
        />
      </div>
    </Layout>
  );
}
