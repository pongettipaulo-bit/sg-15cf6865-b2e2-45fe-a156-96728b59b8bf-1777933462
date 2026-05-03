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

type Motivo = {
  id: number;
  nm_motivo: string;
  id_tipo_evento: string;
  ativo: boolean;
  tipo_evento?: { nm_tipo_evento: string };
};

type TipoEvento = {
  id: number;
  nm_tipo_evento: string;
};

export default function Motivos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<Motivo | null>(null);
  const [formData, setFormData] = useState({
    nm_motivo: "",
    id_tipo_evento: "",
  });

  const { data: motivos, isLoading } = useQuery({
    queryKey: ["motivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("*, tipo_evento:dim_tipo_evento(nm_tipo_evento)")
        .order("nm_motivo");
      if (error) throw error;
      return data as Motivo[];
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
      const { error } = await supabase.from("dim_motivo_evento").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: "Motivo criado com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao criar motivo", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const { error } = await supabase.from("dim_motivo_evento").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: "Motivo atualizado com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao atualizar motivo", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      const { error } = await supabase.from("dim_motivo_evento").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const filteredMotivos = motivos?.filter((m) => {
    if (!m) return false;
    const matchesSearch = searchTerm === "" || 
      String(m.nm_motivo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === "todos" || m.id_tipo_evento === tipoFilter;
    return matchesSearch && matchesTipo;
  }) ?? [];

  const resetForm = () => {
    setFormData({ nm_motivo: "", id_tipo_evento: "" });
    setEditingMotivo(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (motivo: Motivo) => {
    setEditingMotivo(motivo);
    setFormData({
      nm_motivo: motivo.nm_motivo,
      id_tipo_evento: String(motivo.id_tipo_evento),
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nm_motivo: formData.nm_motivo,
      id_tipo_evento: formData.id_tipo_evento,
      ativo: true,
    };

    if (editingMotivo) {
      updateMutation.mutate({ id: editingMotivo.id, data: payload });
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
        <h1 className="text-3xl font-semibold mb-2">Motivos de Evento</h1>
        <p className="text-muted-foreground">Gerencie os motivos de encerramento</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {tiposEvento?.map((tipo) => (
              <SelectItem key={tipo.id} value={String(tipo.id)}>
                {tipo.nm_tipo_evento}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motivo</TableHead>
              <TableHead>Tipo de Evento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredMotivos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum motivo encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredMotivos.map((motivo) => (
                <TableRow key={motivo.id}>
                  <TableCell className="font-medium">{motivo.nm_motivo}</TableCell>
                  <TableCell>{motivo.tipo_evento?.nm_tipo_evento}</TableCell>
                  <TableCell>
                    <Switch
                      checked={motivo.ativo}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: motivo.id, ativo: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(motivo)}>
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
            <DialogTitle>{editingMotivo ? "Editar" : "Novo"} Motivo</DialogTitle>
            <DialogDescription>Preencha as informações do motivo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nm_motivo">Motivo*</Label>
              <Input
                id="nm_motivo"
                value={formData.nm_motivo}
                onChange={(e) => setFormData({ ...formData, nm_motivo: e.target.value })}
                required
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingMotivo ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}