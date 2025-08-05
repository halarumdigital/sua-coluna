import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  MessageCircle, 
  Phone, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Send,
  Archive,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  status: "active" | "archived" | "pending";
  unreadCount: number;
  avatar?: string;
}

export default function ClientConversationsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Fetch conversations data
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["client-conversations"],
    queryFn: async () => {
      const response = await fetch("/api/client/conversations", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar conversas");
      }
      
      return response.json();
    },
  });

  const filteredConversations = conversations.filter((conversation: Conversation) => {
    const matchesSearch = 
      conversation.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conversation.contactPhone.includes(searchTerm) ||
      conversation.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || conversation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleSendMessage = async (conversationId: string) => {
    toast({
      title: "Enviar Mensagem",
      description: `Enviando mensagem para conversa ${conversationId}`,
    });
  };

  const handleArchiveConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/client/conversations/${conversationId}/archive`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao arquivar conversa");
      }

      toast({
        title: "Conversa Arquivada",
        description: "Conversa arquivada com sucesso!",
      });

      // Refetch conversations
      window.location.reload();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao arquivar conversa",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case "archived":
        return <Badge className="bg-gray-100 text-gray-800">Arquivada</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "archived":
        return <Archive className="h-4 w-4 text-gray-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <MessageCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Conversas</h1>
            <p className="text-muted-foreground">
              Gerencie suas conversas do WhatsApp
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button>
              <MessageCircle className="mr-2 h-4 w-4" />
              Nova Conversa
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversations.length}</div>
              <p className="text-xs text-muted-foreground">
                Conversas ativas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {conversations.reduce((total: number, conv: Conversation) => total + conv.unreadCount, 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Mensagens não lidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arquivadas</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {conversations.filter((c: Conversation) => c.status === "archived").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Conversas arquivadas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou mensagem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Ativas</option>
                <option value="archived">Arquivadas</option>
                <option value="pending">Pendentes</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Carregando conversas...</span>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma conversa encontrada</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" 
                    ? "Tente ajustar os filtros de busca." 
                    : "Comece uma nova conversa para aparecer aqui."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredConversations.map((conversation: Conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conversation.id
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={conversation.avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(conversation.contactName)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Conversation Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {conversation.contactName}
                            </h3>
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-red-500 text-white">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(conversation.status)}
                            <span className="text-sm text-gray-500">
                              {new Date(conversation.lastMessageTime).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-1">
                          <Phone className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-500">
                            {conversation.contactPhone}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          {conversation.lastMessage}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(conversation.status)}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendMessage(conversation.id);
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        
                        {conversation.status !== "archived" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveConversation(conversation.id);
                            }}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
} 