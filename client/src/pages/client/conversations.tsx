import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Filter,
  Calendar,
  X,
  User,
  Bot,
  Download,
  RefreshCw
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

interface Message {
  id: string;
  content: string;
  timestamp: string;
  isFromUser: boolean;
  status: "sent" | "delivered" | "read" | "failed";
}

export default function ClientConversationsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversationData, setSelectedConversationData] = useState<Conversation | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync conversations from WhatsApp
  const handleSyncConversations = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/sync-whatsapp-chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Falha ao sincronizar conversas");
      }

      const result = await response.json();
      
      toast({
        title: "Sincronização concluída",
        description: `${result.newConversations} nova(s) conversa(s) sincronizada(s)`,
      });

      // Refresh the conversations list
      refetch();
    } catch (error) {
      console.error("Error syncing conversations:", error);
      toast({
        title: "Erro na sincronização",
        description: "Não foi possível sincronizar as conversas",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch conversations data diretamente da Evolution API
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ["client-conversations", debouncedSearchTerm, startDate, endDate],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm.trim()) {
        params.append("search", debouncedSearchTerm.trim());
      }
      
      if (startDate) {
        params.append("startDate", startDate);
      }
      
      if (endDate) {
        params.append("endDate", endDate);
      }
      
      const queryString = params.toString();
      const url = `/api/client/conversations-evolution${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar conversas");
      }
      
      return response.json();
    },
  });

  // Apply only status filter locally (search and date filtering is done server-side)
  const filteredConversations = conversations.filter((conversation: Conversation) => {
    const matchesStatus = statusFilter === "all" || conversation.status === statusFilter;
    return matchesStatus;
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
      refetch();
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

  const handleOpenConversation = (conversation: Conversation) => {
    setSelectedConversationData(conversation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedConversationData(null);
  };

  const handleExportToPDF = async (conversation: Conversation) => {
    try {
      // Buscar mensagens reais da conversa
      const response = await fetch(`/api/client/conversations/${conversation.id}/messages`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar mensagens para exportação");
      }
      
      const messages = await response.json();
      
      // Criar conteúdo do PDF
      const pdfContent = `
        Conversa com ${conversation.contactName}
        Telefone: ${conversation.contactPhone}
        Data: ${new Date().toLocaleDateString('pt-BR')}
        
        ${messages.map((msg: Message) => `
          ${msg.isFromUser ? 'Você' : conversation.contactName} (${new Date(msg.timestamp).toLocaleString('pt-BR')}):
          ${msg.content}
        `).join('\n\n')}
      `;
      
      // Criar blob e download
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversa-${conversation.contactName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Conversa Exportada",
        description: "Conversa exportada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao exportar conversa",
        variant: "destructive",
      });
    }
  };

  // Fetch messages for a conversation
  const { data: conversationMessages = [], isLoading: isLoadingMessages, error: messagesError } = useQuery({
    queryKey: ["conversation-messages", selectedConversationData?.id],
    queryFn: async () => {
      if (!selectedConversationData?.id) return [];
      
      console.log(`🔍 Buscando mensagens para conversa: ${selectedConversationData.id}`);
      
      const response = await fetch(`/api/client/conversations/${selectedConversationData.id}/messages`, {
        credentials: "include",
      });
      
      console.log(`📡 Status da resposta: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Erro na resposta: ${response.status} - ${errorText}`);
        throw new Error(`Falha ao carregar mensagens: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Mensagens recebidas:`, {
        type: typeof data,
        isArray: Array.isArray(data),
        length: Array.isArray(data) ? data.length : 'N/A'
      });
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`📨 Primeira mensagem:`, data[0]);
      }
      
      return data;
    },
    enabled: !!selectedConversationData?.id,
  });

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (conversationMessages.length > 0 && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages]);

  return (
    <Layout title="Conversas">
      <div className="space-y-6 w-full max-w-full overflow-hidden">
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
           </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle>Filtros de Busca</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search field */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, telefone ou mensagem..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {debouncedSearchTerm && (
                  <div className="text-sm text-muted-foreground flex items-center space-x-2">
                    <span>
                      {isLoading ? (
                        <>
                          <Loader2 className="inline h-3 w-3 animate-spin mr-1" />
                          Buscando...
                        </>
                      ) : (
                        `${filteredConversations.length} conversa${filteredConversations.length !== 1 ? 's' : ''} encontrada${filteredConversations.length !== 1 ? 's' : ''}`
                      )}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Date range filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Data início"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="pl-8"
                  />
                  <label className="text-xs text-muted-foreground mt-1 block">Data início</label>
                </div>
                
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    placeholder="Data fim"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="pl-8"
                  />
                  <label className="text-xs text-muted-foreground mt-1 block">Data fim</label>
                </div>
                
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="active">Ativas</option>
                    <option value="archived">Arquivadas</option>
                    <option value="pending">Pendentes</option>
                  </select>
                  <label className="text-xs text-muted-foreground mt-1 block">Status</label>
                </div>
              </div>
              
              {/* Clear filters button */}
              {(searchTerm || startDate || endDate || statusFilter !== "all") && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setStartDate("");
                      setEndDate("");
                      setStatusFilter("all");
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Conversations List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lista de Conversas</CardTitle>
              <Button 
                onClick={handleSyncConversations}
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
            </div>
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
              <div className="space-y-4 w-full">
                {filteredConversations.map((conversation: Conversation) => (
                  <div
                    key={conversation.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedConversation === conversation.id
                        ? "bg-blue-50 border-blue-200"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleOpenConversation(conversation)}
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

                                             {/* Status Badge */}
                       <div className="flex items-center space-x-2">
                         {getStatusBadge(conversation.status)}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="flex items-center space-x-3">
                   {selectedConversationData ? (
                     <div className="flex items-center space-x-3">
                       <Avatar className="h-8 w-8">
                         <AvatarImage src={selectedConversationData.avatar} />
                         <AvatarFallback className="bg-blue-100 text-blue-600">
                           {getInitials(selectedConversationData.contactName)}
                         </AvatarFallback>
                       </Avatar>
                       <div>
                         <div className="font-semibold">{selectedConversationData.contactName}</div>
                         <div className="text-sm text-muted-foreground">{selectedConversationData.contactPhone}</div>
                       </div>
                     </div>
                   ) : (
                     "Conversa"
                   )}
                 </DialogTitle>
                 {selectedConversationData && (
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => handleExportToPDF(selectedConversationData)}
                   >
                     <Download className="h-4 w-4 mr-2" />
                     Exportar
                   </Button>
                 )}
               </div>
             </DialogHeader>
            
            {selectedConversationData && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-6 bg-gray-50 rounded-lg h-[400px] max-h-[70vh]">
                    {isLoadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Carregando mensagens...</span>
                      </div>
                    ) : conversationMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">Nenhuma mensagem</h3>
                        <p className="text-muted-foreground">
                          Esta conversa ainda não possui mensagens.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 w-full">
                        {conversationMessages.map((message: Message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg p-4 ${
                                message.isFromUser
                                  ? 'bg-blue-500 text-white shadow-md'
                                  : 'bg-white border border-gray-200 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-1">
                                {message.isFromUser ? (
                                  <User className="h-3 w-3" />
                                ) : (
                                  <Bot className="h-3 w-3" />
                                )}
                                <span className="text-xs opacity-70">
                                  {new Date(message.timestamp).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed max-w-full overflow-hidden">
                                {message.content}
                              </p>
                            </div>
                          </div>
                        ))}
                        {/* Elemento para auto-scroll */}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </ScrollArea>

                 
               </div>
             )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
} 