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
  X,
  User,
  Bot,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage: string;
  lastMessageTime: string;
  status: "active" | "archived" | "pending";
  unreadCount: number;
  avatar?: string;
  instanceKey: string;
  instanceName: string;
}

interface WhatsAppInstance {
  id: string;
  instanceKey: string;
  friendlyName: string;
  isActive: boolean;
  status: 'connected' | 'disconnected' | 'connecting';
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
  const [selectedInstanceKey, setSelectedInstanceKey] = useState<string>("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedConversationData, setSelectedConversationData] = useState<Conversation | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationModalRef = useRef<HTMLDivElement>(null);

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
      // Force refresh of conversations from Evolution API
      await refetch();
      
      toast({
        title: "Sincronização concluída",
        description: "Conversas atualizadas da Evolution API",
      });
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

  // Fetch WhatsApp instances
  const { data: instances = [], isLoading: instancesLoading, error: instancesError } = useQuery<WhatsAppInstance[]>({
    queryKey: ["client-whatsapp-instances"],
    queryFn: async () => {
      console.log('🔍 Carregando instâncias WhatsApp...');
      const response = await fetch("/api/client/whatsapp-instances", {
        credentials: "include",
      });
      
      if (!response.ok) {
        console.error('❌ Erro ao carregar instâncias:', response.status);
        throw new Error("Falha ao carregar instâncias");
      }
      
      const data = await response.json();
      console.log('✅ Instâncias carregadas:', data);
      return data;
    },
  });

  // Fetch conversations data diretamente da Evolution API
  const { data: conversations = [], isLoading, refetch } = useQuery({
    queryKey: ["client-conversations", debouncedSearchTerm, selectedInstanceKey],
    queryFn: async () => {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (debouncedSearchTerm.trim()) {
        params.append("search", debouncedSearchTerm.trim());
      }
      
      if (selectedInstanceKey) {
        params.append("instanceKey", selectedInstanceKey);
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

  // Conversations are already filtered server-side
  const filteredConversations = conversations;
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConversations = filteredConversations.slice(startIndex, endIndex);
  
  // Reset to first page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, selectedInstanceKey]);

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
      if (!conversationModalRef.current) {
        toast({
          title: "Erro",
          description: "Modal da conversa não encontrado",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Exportando PDF",
        description: "Gerando arquivo PDF...",
      });

      // Capturar o conteúdo visual do modal
      const canvas = await html2canvas(conversationModalRef.current, {
        scale: 2, // Melhor qualidade
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: conversationModalRef.current.scrollWidth,
        height: conversationModalRef.current.scrollHeight,
      });

      // Criar PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calcular dimensões para caber na página A4
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10; // Margem superior
      
      // Adicionar a imagem ao PDF
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Se a imagem for muito grande, dividir em páginas
      if (imgHeight * ratio > pdfHeight - 20) {
        let remainingHeight = imgHeight * ratio - (pdfHeight - 20);
        let pages = Math.ceil(remainingHeight / (pdfHeight - 20));
        
        for (let i = 1; i <= pages; i++) {
          pdf.addPage();
          const startY = -((pdfHeight - 20) * i);
          pdf.addImage(imgData, 'PNG', imgX, startY, imgWidth * ratio, imgHeight * ratio);
        }
      }
      
      // Salvar o PDF
      const fileName = `conversa-${conversation.contactName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "PDF Exportado",
        description: "Conversa exportada como PDF com sucesso!",
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: "Erro",
        description: "Erro ao exportar conversa como PDF",
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
                {conversations.length === 1 ? 'Conversa ativa' : 'Conversas ativas'}
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
                        `${filteredConversations.length} conversa${filteredConversations.length !== 1 ? 's' : ''} encontrada${filteredConversations.length !== 1 ? 's' : ''} • Página ${currentPage} de ${totalPages}`
                      )}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Instance filter */}
              <div>
                <select
                  value={selectedInstanceKey}
                  onChange={(e) => setSelectedInstanceKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={instancesLoading}
                >
                  <option value="">
                    {instancesLoading ? "Carregando instâncias..." : "Todas as Instâncias"}
                  </option>
                  {instances && instances.length > 0 ? (
                    instances.map((instance) => (
                      <option key={instance.id} value={instance.instanceKey}>
                        {instance.friendlyName || instance.instanceKey} ({instance.status})
                      </option>
                    ))
                  ) : (
                    !instancesLoading && (
                      <option disabled>Nenhuma instância encontrada</option>
                    )
                  )}
                </select>
                <label className="text-xs text-muted-foreground mt-1 block">
                  Instância WhatsApp {instancesError && <span className="text-red-500">(Erro ao carregar)</span>}
                </label>
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 mt-1">
                    Debug: {instances?.length || 0} instâncias carregadas
                  </div>
                )}
              </div>
              
              {/* Clear filters button */}
              {(searchTerm || selectedInstanceKey) && (
                <div className="flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedInstanceKey("");
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
                  {searchTerm || selectedInstanceKey 
                    ? "Tente ajustar os filtros de busca." 
                    : "Selecione uma instância WhatsApp para ver as conversas."
                  }
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4 w-full">
                  {paginatedConversations.map((conversation: Conversation) => (
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
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Exibindo {startIndex + 1}-{Math.min(endIndex, filteredConversations.length)} de {filteredConversations.length} conversas
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(page => {
                            // Show first, last, current, and adjacent pages
                            return page === 1 || 
                                   page === totalPages || 
                                   Math.abs(page - currentPage) <= 1;
                          })
                          .map((page, index, visiblePages) => {
                            const prevPage = index > 0 ? visiblePages[index - 1] : 0;
                            const showEllipsis = page - prevPage > 1;
                            
                            return (
                              <div key={page} className="flex items-center">
                                {showEllipsis && (
                                  <span className="px-2 text-sm text-muted-foreground">…</span>
                                )}
                                <Button
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  className="w-8 h-8 p-0"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </Button>
                              </div>
                            );
                          })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Conversation Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] flex flex-col" ref={conversationModalRef}>
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
                     Exportar PDF
                   </Button>
                 )}
               </div>
             </DialogHeader>
            
            {selectedConversationData && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-6 bg-gray-50 rounded-lg h-[500px]">
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
                            className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'} mb-4`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm relative ${
                                message.isFromUser
                                  ? 'bg-blue-500 text-white rounded-br-sm' 
                                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                              }`}
                            >
                              <div className="flex items-center space-x-2 mb-2">
                                {message.isFromUser ? (
                                  <User className="h-3 w-3 opacity-75" />
                                ) : (
                                  <MessageCircle className="h-3 w-3 opacity-75" />
                                )}
                                <span className={`text-xs ${ 
                                  message.isFromUser ? 'text-blue-100' : 'text-gray-500'
                                }`}>
                                  {new Date(message.timestamp * 1000).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                                {message.content}
                              </p>
                              {/* Cauda da mensagem estilo WhatsApp */}
                              <div className={`absolute bottom-0 w-3 h-3 ${
                                message.isFromUser 
                                  ? 'right-0 transform translate-x-1 bg-blue-500' 
                                  : 'left-0 transform -translate-x-1 bg-white border-l border-b border-gray-200'
                              }`} 
                              style={{
                                clipPath: message.isFromUser 
                                  ? 'polygon(0 0, 100% 0, 0 100%)' 
                                  : 'polygon(100% 0, 0 0, 100% 100%)'
                              }}
                              />
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