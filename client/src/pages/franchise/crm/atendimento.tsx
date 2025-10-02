import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  User,
  Clock,
  Calendar,
  Phone,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  CSS,
} from "@dnd-kit/utilities";

interface AtendimentoItem {
  id: string;
  clienteName: string;
  telefone: string;
  tipo: string;
  prioridade: "alta" | "media" | "baixa";
  dataAgendamento?: string;
  horaAgendamento?: string;
  observacoes: string;
  status: "novo" | "atendimento" | "agendado" | "finalizado";
  lastMessageDate?: string;
}


const DraggableAtendimentoCard = ({ atendimento, onEdit, onDelete, isDragging = false }: {
  atendimento: AtendimentoItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  isDragging?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: atendimento.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AtendimentoCard atendimento={atendimento} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
};

const AtendimentoCard = ({ atendimento, onEdit, onDelete }: {
  atendimento: AtendimentoItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const getPrioridadeBadge = (prioridade: string) => {
    const prioridadeMap = {
      alta: { label: "Alta", className: "bg-red-100 text-red-800 border-red-200" },
      media: { label: "Média", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
      baixa: { label: "Baixa", className: "bg-green-100 text-green-800 border-green-200" },
    };

    const prioridadeInfo = prioridadeMap[prioridade as keyof typeof prioridadeMap];

    return (
      <Badge variant="outline" className={prioridadeInfo.className}>
        {prioridadeInfo.label}
      </Badge>
    );
  };

  return (
    <Card className="mb-3 hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-900">{atendimento.clienteName}</h4>
              <p className="text-xs text-gray-500 flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {atendimento.telefone}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(atendimento.id)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(atendimento.id)}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-gray-700">{atendimento.tipo}</span>
          </div>

          {atendimento.lastMessageDate && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              Última mensagem: {new Date(atendimento.lastMessageDate).toLocaleDateString("pt-BR")} às {new Date(atendimento.lastMessageDate).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}

          {atendimento.dataAgendamento && (
            <div className="flex items-center text-xs text-gray-600">
              <Calendar className="w-3 h-3 mr-1" />
              Agendado: {new Date(atendimento.dataAgendamento).toLocaleDateString("pt-BR")} às {atendimento.horaAgendamento}
            </div>
          )}

          <p className="text-xs text-gray-600 line-clamp-2">{atendimento.observacoes}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const DroppableKanbanColumn = ({
  title,
  status,
  atendimentos,
  colorClass,
  onEdit,
  onDelete,
  activeId
}: {
  title: string;
  status: string;
  atendimentos: AtendimentoItem[];
  colorClass: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  activeId: string | null;
}) => {
  const filteredAtendimentos = atendimentos.filter(item => item.status === status);
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div className="flex-1 min-w-80">
      <Card className="h-full">
        <CardHeader className={`pb-3 ${colorClass}`}>
          <CardTitle className="text-white text-base flex items-center justify-between">
            {title}
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {filteredAtendimentos.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent
          ref={setNodeRef}
          className={`p-4 space-y-3 max-h-96 overflow-y-auto min-h-32 transition-colors ${
            isOver ? 'bg-gray-50' : ''
          }`}
        >
          <SortableContext items={filteredAtendimentos.map(item => item.id)} strategy={verticalListSortingStrategy}>
            {filteredAtendimentos.map((atendimento) => (
              <DraggableAtendimentoCard
                key={atendimento.id}
                atendimento={atendimento}
                onEdit={onEdit}
                onDelete={onDelete}
                isDragging={activeId === atendimento.id}
              />
            ))}
          </SortableContext>
          {filteredAtendimentos.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Nenhum atendimento</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default function AtendimentoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAtendimento, setEditingAtendimento] = useState<AtendimentoItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    clienteName: "",
    telefone: "",
    tipo: "",
    prioridade: "media" as "alta" | "media" | "baixa",
    dataAgendamento: "",
    horaAgendamento: "",
    observacoes: "",
    status: "novo" as "novo" | "atendimento" | "agendado" | "finalizado",
  });

  // Fetch kanban cards from API
  const { data: atendimentos = [], isLoading, refetch } = useQuery({
    queryKey: ["crm-kanban-cards"],
    queryFn: async () => {
      const response = await fetch("/api/franchise/crm/kanban", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao carregar cards do kanban");
      }

      const data = await response.json();

      // Transform the API data to match our interface
      return data.map((card: any): AtendimentoItem => ({
        id: card.id,
        clienteName: card.clientName,
        telefone: card.clientPhone,
        tipo: card.type,
        prioridade: card.priority as "alta" | "media" | "baixa",
        dataAgendamento: card.scheduledDate,
        horaAgendamento: card.scheduledTime,
        observacoes: card.notes || "",
        status: card.status as "novo" | "atendimento" | "agendado" | "finalizado",
        lastMessageDate: card.lastMessageDate,
      }));
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleEdit = (id: string) => {
    const atendimento = atendimentos.find(item => item.id === id);
    if (atendimento) {
      setEditingAtendimento(atendimento);
      setEditFormData({
        clienteName: atendimento.clienteName,
        telefone: atendimento.telefone,
        tipo: atendimento.tipo,
        prioridade: atendimento.prioridade,
        dataAgendamento: atendimento.dataAgendamento || "",
        horaAgendamento: atendimento.horaAgendamento || "",
        observacoes: atendimento.observacoes,
        status: atendimento.status,
      });
      setEditModalOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAtendimento) return;

    try {
      const response = await fetch(`/api/franchise/crm/kanban/${editingAtendimento.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          clientName: editFormData.clienteName,
          clientPhone: editFormData.telefone,
          type: editFormData.tipo,
          priority: editFormData.prioridade,
          scheduledDate: editFormData.dataAgendamento || null,
          scheduledTime: editFormData.horaAgendamento || null,
          notes: editFormData.observacoes,
          status: editFormData.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao atualizar atendimento");
      }

      // Refresh the data
      await refetch();
      setEditModalOpen(false);
      setEditingAtendimento(null);
    } catch (error) {
      console.error("Erro ao atualizar atendimento:", error);
      alert("Erro ao atualizar atendimento");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este atendimento?")) {
      return;
    }

    try {
      const response = await fetch(`/api/franchise/crm/kanban/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Falha ao excluir atendimento");
      }

      // Refresh the data
      refetch();
    } catch (error) {
      console.error("Erro ao excluir atendimento:", error);
      alert("Erro ao excluir atendimento");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeAtendimento = atendimentos.find(item => item.id === active.id);
    if (!activeAtendimento) {
      setActiveId(null);
      return;
    }

    // Determine the target status based on the drop zone
    const overContainer = over.id as string;
    let newStatus: AtendimentoItem['status'];

    // If dropped on another card, find which column it belongs to
    if (overContainer !== 'novo' && overContainer !== 'atendimento' && overContainer !== 'agendado' && overContainer !== 'finalizado') {
      const overAtendimento = atendimentos.find(item => item.id === overContainer);
      newStatus = overAtendimento?.status || activeAtendimento.status;
    } else {
      newStatus = overContainer as AtendimentoItem['status'];
    }

    // Update the status if it changed
    if (activeAtendimento.status !== newStatus) {
      try {
        const response = await fetch(`/api/franchise/crm/kanban/${activeAtendimento.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            status: newStatus,
          }),
        });

        if (!response.ok) {
          throw new Error("Falha ao atualizar status do atendimento");
        }

        // Refresh the data to get the updated state
        refetch();
      } catch (error) {
        console.error("Erro ao atualizar status:", error);
        alert("Erro ao atualizar status do atendimento");
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const filteredAtendimentos = atendimentos.filter(atendimento =>
    atendimento.clienteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    atendimento.telefone.includes(searchTerm) ||
    atendimento.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout title="CRM - Atendimento">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Atendimento</h1>
            <p className="text-gray-600">Gerencie o fluxo de atendimentos da sua clínica</p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por cliente, telefone ou tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">Carregando atendimentos...</div>
          </div>
        )}

        {/* Kanban Board */}
        {!isLoading && (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
          <div className="flex gap-6 overflow-x-auto pb-4">
            <DroppableKanbanColumn
              title="Novo"
              status="novo"
              atendimentos={filteredAtendimentos}
              colorClass="bg-blue-600"
              onEdit={handleEdit}
              onDelete={handleDelete}
              activeId={activeId}
            />
            <DroppableKanbanColumn
              title="Atendimento"
              status="atendimento"
              atendimentos={filteredAtendimentos}
              colorClass="bg-yellow-600"
              onEdit={handleEdit}
              onDelete={handleDelete}
              activeId={activeId}
            />
            <DroppableKanbanColumn
              title="Agendado"
              status="agendado"
              atendimentos={filteredAtendimentos}
              colorClass="bg-purple-600"
              onEdit={handleEdit}
              onDelete={handleDelete}
              activeId={activeId}
            />
            <DroppableKanbanColumn
              title="Finalizado"
              status="finalizado"
              atendimentos={filteredAtendimentos}
              colorClass="bg-green-600"
              onEdit={handleEdit}
              onDelete={handleDelete}
              activeId={activeId}
            />
          </div>

          <DragOverlay>
            {activeId ? (
              <AtendimentoCard
                atendimento={atendimentos.find(item => item.id === activeId)!}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        )}

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Atendimento</DialogTitle>
              <DialogDescription>
                Atualize as informações do atendimento
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clienteName">Nome do Cliente</Label>
                  <Input
                    id="clienteName"
                    value={editFormData.clienteName}
                    onChange={(e) => setEditFormData({ ...editFormData, clienteName: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={editFormData.telefone}
                    onChange={(e) => setEditFormData({ ...editFormData, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de Atendimento</Label>
                  <Input
                    id="tipo"
                    value={editFormData.tipo}
                    onChange={(e) => setEditFormData({ ...editFormData, tipo: e.target.value })}
                    placeholder="Ex: Consulta, Retorno"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select
                    value={editFormData.prioridade}
                    onValueChange={(value: "alta" | "media" | "baixa") =>
                      setEditFormData({ ...editFormData, prioridade: value })
                    }
                  >
                    <SelectTrigger id="prioridade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataAgendamento">Data do Agendamento</Label>
                  <Input
                    id="dataAgendamento"
                    type="date"
                    value={editFormData.dataAgendamento}
                    onChange={(e) => setEditFormData({ ...editFormData, dataAgendamento: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="horaAgendamento">Hora do Agendamento</Label>
                  <Input
                    id="horaAgendamento"
                    type="time"
                    value={editFormData.horaAgendamento}
                    onChange={(e) => setEditFormData({ ...editFormData, horaAgendamento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value: "novo" | "atendimento" | "agendado" | "finalizado") =>
                    setEditFormData({ ...editFormData, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="atendimento">Em Atendimento</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={editFormData.observacoes}
                  onChange={(e) => setEditFormData({ ...editFormData, observacoes: e.target.value })}
                  placeholder="Adicione observações sobre o atendimento..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}