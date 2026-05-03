import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Motivo = {
  id: string;
  motivo: string;
  id_tipo_evento: string;
  fg_ativo: boolean;
  nm_tipo_evento?: string;
};

type TipoEvento = {
  id: string;
  nm_tipo_evento: string;
};

export default function Motivos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<Motivo | null>(null);
  const [formData, setFormData] = useState({
    motivo: "",
    id_tipo_evento: "",
    fg_ativo: true,
  });

  // Buscar motivos com join do tipo de evento
  const { data: motivos, isLoading } = useQuery({
    queryKey: ["motivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select(`
          id,
          motivo,
          id_tipo_evento,
          fg_ativo,
          dim_tipo_evento!inner(nm_tipo_evento)
        `)
        .order("motivo");

      if (error) throw error;

      return data.map((m: any) => ({
        ...m,
        nm_tipo_evento: m.dim_tipo_evento?.nm_tipo_evento,
      }));
    },
  });

  // Buscar tipos de evento para o select
  const { data: tiposEvento } = useQuery({
    queryKey: ["tipos-evento-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_evento")
        .select("id, nm_tipo_evento")
        .eq("fg_ativo", true)
        .order("nm_tipo_evento");

      if (error) throw error;
      return data as TipoEvento[];
    },
  });

  // Criar motivo
  const createMutation = useMutation({
    mutationFn: async (newMotivo: typeof formData) => {
      const { error } = await supabase.from("dim_motivo_evento").insert([newMotivo]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: "Motivo criado com sucesso" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar motivo", variant: "destructive" });
    },
  });

  // Atualizar motivo
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<typeof formData> }) => {
      const { error } = await supabase.from("dim_motivo_evento").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: "Motivo atualizado com sucesso" });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar motivo", variant: "destructive" });
    },
  });

  // Toggle ativo/inativo
  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, fg_ativo }: { id: string; fg_ativo: boolean }) => {
      const { error } = await supabase.from("dim_motivo_evento").update({ fg_ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: "Status atualizado" });
    },
  });

  const filteredMotivos = motivos?.filter((m) => {
    if (!m) return false;
    const matchesSearch = searchTerm === "" || 
      String(m.motivo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === "todos" || m.id_tipo_evento === tipoFilter;
    return matchesSearch && matchesTipo;
  }) ?? [];

  if (profile?.perfil !== "admin" && profile?.perfil !== "avancado") {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({ motivo: "", id_tipo_evento: "", fg_ativo: true });
    setEditingMotivo(null);
  };

  const handleOpenDialog = (motivo?: Motivo) => {
    if (motivo) {
      setEditingMotivo(motivo);
      setFormData({
        motivo: motivo.motivo,
        id_tipo_evento: motivo.id_tipo_evento,
        fg_ativo: motivo.fg_ativo,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMotivo) {
      updateMutation.mutate({ id: editingMotivo.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-8 ml-64">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-2">Motivos</h1>
        <p className="text-muted-foreground">Gerenciar motivos de eventos</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
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
                <SelectItem key={tipo.id} value={tipo.id}>
                  {tipo.nm_tipo_evento}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => handleOpenDialog()} className="ml-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Motivo
          </Button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Motivo</TableHead>
                <TableHead>Tipo de Evento</TableHead>
                <TableHead className="w-24">Ativo</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMotivos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Nenhum motivo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredMotivos.map((motivo) => (
                  <TableRow key={motivo.id}>
                    <TableCell className="font-medium">{motivo.motivo}</TableCell>
                    <TableCell>{motivo.nm_tipo_evento}</TableCell>
                    <TableCell>
                      <Switch
                        checked={motivo.fg_ativo}
                        onCheckedChange={(checked) =>
                          toggleAtivoMutation.mutate({ id: motivo.id, fg_ativo: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(motivo)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMotivo ? "Editar Motivo" : "Novo Motivo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="motivo">Motivo *</Label>
                <Input
                  id="motivo"
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="tipo">Tipo de Evento *</Label>
                <Select
                  value={formData.id_tipo_evento}
                  onValueChange={(value) => setFormData({ ...formData, id_tipo_evento: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposEvento?.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nm_tipo_evento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="ativo"
                  checked={formData.fg_ativo}
                  onCheckedChange={(checked) => setFormData({ ...formData, fg_ativo: checked })}
                />
                <Label htmlFor="ativo">Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingMotivo ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}