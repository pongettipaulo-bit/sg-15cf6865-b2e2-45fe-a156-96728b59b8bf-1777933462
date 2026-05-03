import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EscalationItem = {
  id: number;
  nm_pessoa: string;
  contato: string;
  telegram_chat_id?: string;
  id_tipo_evento: number;
  ordem: number;
  turno?: string;
  nivel_hierarquico: number;
  ativo: boolean;
  tipo_evento?: { nm_tipo_evento: string };
};

type TipoEvento = {
  id: number;
  nm_tipo_evento: string;
};

export default function EscalationList() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EscalationItem | null>(null);
  const [formData, setFormData] = useState({
    nm_pessoa: "",
    contato: "",
    telegram_chat_id: "",
    id_tipo_evento: "",
    ordem: 1,
    turno: "",
    nivel_hierarquico: 1,
  });

  const { data: escalation, isLoading } = useQuery({
    queryKey: ["escalation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("*, tipo_evento:dim_tipo_evento(nm_tipo_evento)")
        .order("ordem");
      if (error) throw error;
      return data as EscalationItem[];
    },
  });

  const { data: tiposEvento } = useQuery({
    queryKey: ["tipos-evento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_evento")
        .select("id, nm_tipo_evento")
        .eq("ativo", true)
        .order("nm_tipo_evento");
      if (error) throw error;
      return data as TipoEvento[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("dim_escalation_list").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation"] });
      toast({ title: "Contato criado com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao criar contato", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const { error } = await supabase.from("dim_escalation_list").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation"] });
      toast({ title: "Contato atualizado com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao atualizar contato", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      const { error } = await supabase.from("dim_escalation_list").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const filteredEscalation = escalation?.filter((e) => {
    if (!e) return false;
    return searchTerm === "" || 
      String(e.nm_pessoa ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.contato ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.turno ?? "").toLowerCase().includes(searchTerm.toLowerCase());
  }) ?? [];

  const resetForm = () => {
    setFormData({
      nm_pessoa: "",
      contato: "",
      telegram_chat_id: "",
      id_tipo_evento: "",
      ordem: 1,
      turno: "",
      nivel_hierarquico: 1,
    });
    setEditingItem(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (item: EscalationItem) => {
    setEditingItem(item);
    setFormData({
      nm_pessoa: item.nm_pessoa,
      contato: item.contato,
      telegram_chat_id: item.telegram_chat_id || "",
      id_tipo_evento: String(item.id_tipo_evento),
      ordem: item.ordem,
      turno: item.turno || "",
      nivel_hierarquico: item.nivel_hierarquico,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nm_pessoa: formData.nm_pessoa,
      contato: formData.contato,
      telegram_chat_id: formData.telegram_chat_id || null,
      id_tipo_evento: Number(formData.id_tipo_evento),
      ordem: formData.ordem,
      turno: formData.turno || null,
      nivel_hierarquico: formData.nivel_hierarquico,
      ativo: true,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (profile?.perfil !== "admin" && profile?.perfil !== "avancado") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Escalation List</h1>
        <p className="text-muted-foreground">Gerencie os contatos de escalação</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pessoa</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Tipo de Evento</TableHead>
              <TableHead>Ordem</TableHead>
              <TableHead>Turno</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredEscalation.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum contato encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredEscalation.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nm_pessoa}</TableCell>
                  <TableCell>{item.contato}</TableCell>
                  <TableCell>{item.tipo_evento?.nm_tipo_evento}</TableCell>
                  <TableCell>{item.ordem}</TableCell>
                  <TableCell>{item.turno || "-"}</TableCell>
                  <TableCell>{item.nivel_hierarquico}</TableCell>
                  <TableCell>
                    <Switch
                      checked={item.ativo}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: item.id, ativo: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar" : "Novo"} Contato</DialogTitle>
            <DialogDescription>Preencha as informações do contato</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nm_pessoa">Pessoa*</Label>
              <Input
                id="nm_pessoa"
                value={formData.nm_pessoa}
                onChange={(e) => setFormData({ ...formData, nm_pessoa: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="contato">Contato*</Label>
              <Input
                id="contato"
                value={formData.contato}
                onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="telegram_chat_id">Telegram Chat ID</Label>
              <Input
                id="telegram_chat_id"
                value={formData.telegram_chat_id}
                onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="id_tipo_evento">Tipo de Evento*</Label>
              <Select
                value={formData.id_tipo_evento}
                onValueChange={(value) => setFormData({ ...formData, id_tipo_evento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tiposEvento?.map((tipo) => (
                    <SelectItem key={tipo.id} value={String(tipo.id)}>
                      {tipo.nm_tipo_evento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ordem">Ordem*</Label>
                <Input
                  id="ordem"
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: Number(e.target.value) })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nivel_hierarquico">Nível*</Label>
                <Input
                  id="nivel_hierarquico"
                  type="number"
                  value={formData.nivel_hierarquico}
                  onChange={(e) =>
                    setFormData({ ...formData, nivel_hierarquico: Number(e.target.value) })
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="turno">Turno</Label>
              <Input
                id="turno"
                value={formData.turno}
                onChange={(e) => setFormData({ ...formData, turno: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingItem ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}