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
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TipoEvento = {
  id: number;
  nm_tipo_evento: string;
  criticidade: string;
  sla_minutos: number;
  id_categoria: number;
  id_subcategoria: number;
  notificar_telegram: boolean;
  ativo: boolean;
  categoria?: { nm_categoria: string };
  subcategoria?: { nm_subcategoria: string };
};

type Categoria = {
  id: number;
  nm_categoria: string;
};

type Subcategoria = {
  id: number;
  nm_subcategoria: string;
  id_categoria: number;
};

export default function TiposEvento() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [criticidadeFilter, setCriticidadeFilter] = useState<string>("todas");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoEvento | null>(null);
  const [formData, setFormData] = useState({
    nm_tipo_evento: "",
    criticidade: "media",
    sla_minutos: 60,
    id_categoria: "",
    id_subcategoria: "",
    notificar_telegram: false,
  });

  const { data: tipos, isLoading } = useQuery({
    queryKey: ["tipos-evento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_evento")
        .select("*, categoria:dim_categoria_evento(nm_categoria), subcategoria:dim_subcategoria_evento(nm_subcategoria)")
        .order("nm_tipo_evento");
      if (error) throw error;
      return data as TipoEvento[];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_categoria_evento")
        .select("*")
        .eq("ativo", true)
        .order("nm_categoria");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const { data: subcategorias } = useQuery({
    queryKey: ["subcategorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_subcategoria_evento")
        .select("*")
        .eq("ativo", true)
        .order("nm_subcategoria");
      if (error) throw error;
      return data as Subcategoria[];
    },
  });

  const filteredSubcategorias = subcategorias?.filter(
    (s) => !formData.id_categoria || s.id_categoria === Number(formData.id_categoria)
  ) ?? [];

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("dim_tipo_evento").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-evento"] });
      toast({ title: "Tipo de evento criado com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao criar tipo de evento", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const { error } = await supabase.from("dim_tipo_evento").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-evento"] });
      toast({ title: "Tipo de evento atualizado com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao atualizar tipo de evento", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: number; ativo: boolean }) => {
      const { error } = await supabase.from("dim_tipo_evento").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-evento"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const filteredTipos = tipos?.filter((t) => {
    if (!t) return false;
    const matchesSearch = searchTerm === "" || 
      String(t.nm_tipo_evento ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCriticidade = criticidadeFilter === "todas" || t.criticidade === criticidadeFilter;
    return matchesSearch && matchesCriticidade;
  }) ?? [];

  const resetForm = () => {
    setFormData({
      nm_tipo_evento: "",
      criticidade: "media",
      sla_minutos: 60,
      id_categoria: "",
      id_subcategoria: "",
      notificar_telegram: false,
    });
    setEditingTipo(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (tipo: TipoEvento) => {
    setEditingTipo(tipo);
    setFormData({
      nm_tipo_evento: tipo.nm_tipo_evento,
      criticidade: tipo.criticidade,
      sla_minutos: tipo.sla_minutos,
      id_categoria: String(tipo.id_categoria),
      id_subcategoria: String(tipo.id_subcategoria),
      notificar_telegram: tipo.notificar_telegram,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nm_tipo_evento: formData.nm_tipo_evento,
      criticidade: formData.criticidade,
      sla_minutos: formData.sla_minutos,
      id_categoria: Number(formData.id_categoria),
      id_subcategoria: Number(formData.id_subcategoria),
      notificar_telegram: formData.notificar_telegram,
      ativo: true,
    };

    if (editingTipo) {
      updateMutation.mutate({ id: editingTipo.id, data: payload });
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
        <h1 className="text-3xl font-semibold mb-2">Tipos de Evento</h1>
        <p className="text-muted-foreground">Gerencie os tipos de evento do sistema</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tipo de evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={criticidadeFilter} onValueChange={setCriticidadeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Criticidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
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
              <TableHead>Nome</TableHead>
              <TableHead>Criticidade</TableHead>
              <TableHead>SLA (min)</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead>Telegram</TableHead>
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
            ) : filteredTipos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum tipo de evento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredTipos.map((tipo) => (
                <TableRow key={tipo.id}>
                  <TableCell className="font-medium">{tipo.nm_tipo_evento}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tipo.criticidade === "critica"
                          ? "destructive"
                          : tipo.criticidade === "alta"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {tipo.criticidade}
                    </Badge>
                  </TableCell>
                  <TableCell>{tipo.sla_minutos}</TableCell>
                  <TableCell>{tipo.categoria?.nm_categoria}</TableCell>
                  <TableCell>{tipo.subcategoria?.nm_subcategoria}</TableCell>
                  <TableCell>{tipo.notificar_telegram ? "Sim" : "Não"}</TableCell>
                  <TableCell>
                    <Switch
                      checked={tipo.ativo}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: tipo.id, ativo: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(tipo)}>
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
            <DialogTitle>{editingTipo ? "Editar" : "Novo"} Tipo de Evento</DialogTitle>
            <DialogDescription>
              Preencha as informações do tipo de evento
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nm_tipo_evento">Nome*</Label>
              <Input
                id="nm_tipo_evento"
                value={formData.nm_tipo_evento}
                onChange={(e) => setFormData({ ...formData, nm_tipo_evento: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="criticidade">Criticidade*</Label>
              <Select
                value={formData.criticidade}
                onValueChange={(value) => setFormData({ ...formData, criticidade: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sla_minutos">SLA (minutos)*</Label>
              <Input
                id="sla_minutos"
                type="number"
                value={formData.sla_minutos}
                onChange={(e) => setFormData({ ...formData, sla_minutos: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <Label htmlFor="id_categoria">Categoria*</Label>
              <Select
                value={formData.id_categoria}
                onValueChange={(value) =>
                  setFormData({ ...formData, id_categoria: value, id_subcategoria: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias?.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.nm_categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="id_subcategoria">Subcategoria*</Label>
              <Select
                value={formData.id_subcategoria}
                onValueChange={(value) => setFormData({ ...formData, id_subcategoria: value })}
                disabled={!formData.id_categoria}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategorias.map((sub) => (
                    <SelectItem key={sub.id} value={String(sub.id)}>
                      {sub.nm_subcategoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="notificar_telegram"
                checked={formData.notificar_telegram}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notificar_telegram: checked })
                }
              />
              <Label htmlFor="notificar_telegram">Notificar via Telegram</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingTipo ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}