import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  MessageCircle, 
  Smartphone, 
  RefreshCw, 
  User, 
  Bot, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminWhatsAppInstance {
  id: string;
  instanceName: string;
  instanceKey: string;
  phoneNumber: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnection?: string;
  isActive: boolean;
  createdAt: string;
}

interface WhatsAppMessage {
  id: string;
  messageId: string;
  conversationId: string;
  senderPhone: string;
  senderName?: string;
  content: string;
  messageType: 'text' | 'image' | 'audio' | 'video' | 'document';
  direction: 'incoming' | 'outgoing';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  isAiResponse: boolean;
  aiModel?: string;
}

interface WhatsAppConversation {
  id: string;
  chatId: string;
  phoneNumber: string;
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isGroup: boolean;
  status: string;
  messages?: WhatsAppMessage[];
}

export default function AdminMessages() {
  const { toast } = useToast();
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Buscar instâncias do admin
  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["admin-whatsapp-instances"],
    queryFn: async () => {
      const response = await fetch("/api/admin/whatsapp-instances", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar instâncias");
      }
      
      return response.json() as Promise<AdminWhatsAppInstance[]>;
    },
  });

  // Adicionar interface para os dados da Evolution API
  interface EvolutionApiChat {
    id: string;
    name?: string;
    isGroup: boolean;
    unreadCount?: number;
    lastMessage?: {
      message?: string;
      messageTimestamp?: number;
    };
  }

  // Buscar conversas da instância selecionada
  const { data: conversations, isLoading: conversationsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ["admin-whatsapp-conversations", selectedInstanceId],
    queryFn: async () => {
      if (!selectedInstanceId) return [];
      
      // Buscar a instância selecionada para obter o instanceKey
      const selectedInstance = instances?.find(instance => instance.id === selectedInstanceId);
      if (!selectedInstance) {
        throw new Error("Instância não encontrada");
      }
      
      // Usar a nova rota que busca da Evolution API
      const response = await fetch(`/api/admin/whatsapp-instances/${selectedInstance.instanceKey}/chats`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar conversas");
      }
      
      const result = await response.json();
      console.log('Evolution API Response:', result); // Para debug
      
      // Mapear os dados da Evolution API para o formato esperado
      const chats = result.chats || result || [];
      return chats.map((chat: EvolutionApiChat) => ({
        id: chat.id,
        chatId: chat.id,
        phoneNumber: chat.id.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        contactName: chat.name || chat.id.replace('@s.whatsapp.net', '').replace('@g.us', ''),
        lastMessage: chat.lastMessage?.message || 'Sem mensagens',
        lastMessageAt: chat.lastMessage?.messageTimestamp ? 
          new Date(chat.lastMessage.messageTimestamp * 1000).toISOString() : 
          new Date().toISOString(),
        unreadCount: chat.unreadCount || 0,
        isGroup: chat.isGroup || false,
        status: 'active'
      }));
    },
    enabled: !!selectedInstanceId && !!instances,
  });

  // Buscar mensagens da conversa selecionada
  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["admin-whatsapp-messages", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      
      const response = await fetch(`/api/admin/whatsapp-conversations/${selectedConversationId}/messages`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Falha ao carregar mensagens");
      }
      
      return response.json() as Promise<WhatsAppMessage[]>;
    },
    enabled: !!selectedConversationId,
  });

  const connectedInstances = instances?.filter(instance => 
    instance.status === 'connected' && instance.isActive
  ) || [];

  const selectedInstance = instances?.find(instance => instance.id === selectedInstanceId);
  const selectedConversation = conversations?.find(conv => conv.id === selectedConversationId);

  const handleRefreshConversations = () => {
    if (selectedInstanceId) {
      refetchConversations();
      toast({ title: "Conversas atualizadas", description: "Lista de conversas foi atualizada com sucesso." });
    }
  };

  const handleRefreshMessages = () => {
    if (selectedConversationId) {
      refetchMessages();
      toast({ title: "Mensagens atualizadas", description: "Mensagens foram atualizadas com sucesso." });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      connected: { label: "Conectado", variant: "default" as const, icon: CheckCircle },
      disconnected: { label: "Desconectado", variant: "secondary" as const, icon: AlertCircle },
      connecting: { label: "Conectando", variant: "outline" as const, icon: Clock },
      error: { label: "Erro", variant: "destructive" as const, icon: AlertCircle },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { 
      addSuffix: true, 
      locale: ptBR 
    });
  };

  const getMessageIcon = (message: WhatsAppMessage) => {
    if (message.isAiResponse) {
      return <Bot className="h-4 w-4 text-blue-500" />;
    }
    return message.direction === 'incoming' ? 
      <User className="h-4 w-4 text-gray-500" /> : 
      <User className="h-4 w-4 text-green-500" />;
  };

  if (instancesLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Mensagens do WhatsApp
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Visualize e gerencie as mensagens das suas instâncias de WhatsApp
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Seleção de Instância */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Selecionar Instância
              </CardTitle>
              <CardDescription>
                Escolha uma instância conectada para visualizar as mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedInstanceId} onValueChange={setSelectedInstanceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{instance.instanceName}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {instance.phoneNumber}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedInstance && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status:</span>
                    {getStatusBadge(selectedInstance.status)}
                  </div>
                  {selectedInstance.lastConnection && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Última conexão:</span>
                      <span className="text-sm text-gray-500">
                        {formatMessageTime(selectedInstance.lastConnection)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {connectedInstances.length === 0 && (
                <div className="text-center py-4">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Nenhuma instância conectada encontrada
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Conversas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Conversas
                  </CardTitle>
                  <CardDescription>
                    {selectedInstance ? 
                      `Conversas de ${selectedInstance.instanceName}` : 
                      "Selecione uma instância para ver as conversas"
                    }
                  </CardDescription>
                </div>
                {selectedInstanceId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshConversations}
                    disabled={conversationsLoading}
                  >
                    {conversationsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedInstanceId ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Selecione uma instância para visualizar as conversas
                  </p>
                </div>
              ) : conversationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id || conversation.chatId}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedConversationId === (conversation.id || conversation.chatId)
                            ? "bg-blue-50 border-blue-200"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelectedConversationId(conversation.id || conversation.chatId)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {(conversation.contactName || 'U').charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {conversation.contactName || 'Contato sem nome'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {conversation.phoneNumber || 'Número não disponível'}
                              </p>
                            </div>
                          </div>
                          {(conversation.unreadCount || 0) > 0 && (
                            <Badge variant="default" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 truncate">
                            {conversation.lastMessage || 'Sem mensagens'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {conversation.lastMessageAt ? formatMessageTime(conversation.lastMessageAt) : 'Data não disponível'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Nenhuma conversa encontrada
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mensagens */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Mensagens
                  </CardTitle>
                  <CardDescription>
                    {selectedConversation ? 
                      `Conversa com ${selectedConversation.contactName}` : 
                      "Selecione uma conversa para ver as mensagens"
                    }
                  </CardDescription>
                </div>
                {selectedConversationId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshMessages}
                    disabled={messagesLoading}
                  >
                    {messagesLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedConversationId ? (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Selecione uma conversa para visualizar as mensagens
                  </p>
                </div>
              ) : messagesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages && messages.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.direction === 'outgoing' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                            message.direction === 'outgoing'
                              ? message.isAiResponse
                                ? 'bg-blue-500 text-white'
                                : 'bg-green-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getMessageIcon(message)}
                            <span className="text-xs opacity-75">
                              {message.isAiResponse ? 'IA' : 
                               message.direction === 'outgoing' ? 'Você' : message.senderName || 'Cliente'}
                            </span>
                            <span className="text-xs opacity-75">
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm">{message.content}</p>
                          {message.isAiResponse && message.aiModel && (
                            <p className="text-xs opacity-75 mt-1">
                              Modelo: {message.aiModel}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Nenhuma mensagem encontrada
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}