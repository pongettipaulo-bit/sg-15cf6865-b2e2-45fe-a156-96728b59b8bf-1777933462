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
import { Search, Plus, Edit, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Subcategoria = {
  id: number;
  nm_subcategoria: string;
  id_categoria: number;
  fg_ativo: boolean;
  categoria?: { nm_categoria: string };
};

type Categoria = {
  id: number;
  nm_categoria: string;
};

export default function Subcategorias() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubcategoria, setEditingSubcategoria] = useState<Subcategoria | null>(null);
  const [formData, setFormData] = useState({
    nm_subcategoria: "",
    id_categoria: "",
  });

  const { data: subcategorias, isLoading } = useQuery({
    queryKey: ["subcategorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_subcategoria_evento")
        .select("*, categoria:dim_categoria_evento(nm_categoria)")
        .order("nm_subcategoria");
      if (error) throw error;
      return data as Subcategoria[];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_categoria_evento")
        .select("*")
        .eq("fg_ativo", true)
        .order("nm_categoria");
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("dim_subcategoria_evento").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias"] });
      toast({ title: "Subcategoria criada com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao criar subcategoria", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const { error } = await supabase.from("dim_subcategoria_evento").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias"] });
      toast({ title: "Subcategoria atualizada com sucesso" });
      setModalOpen(false);
      resetForm();
    },
    onError: () => toast({ title: "Erro ao atualizar subcategoria", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, fg_ativo }: { id: number; fg_ativo: boolean }) => {
      const { error } = await supabase.from("dim_subcategoria_evento").update({ fg_ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const filteredSubcategorias = subcategorias?.filter((s) => {
    if (!s) return false;
    return searchTerm === "" || 
      String(s.nm_subcategoria ?? "").toLowerCase().includes(searchTerm.toLowerCase());
  }) ?? [];

  const resetForm = () => {
    setFormData({ nm_subcategoria: "", id_categoria: "" });
    setEditingSubcategoria(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (subcategoria: Subcategoria) => {
    setEditingSubcategoria(subcategoria);
    setFormData({
      nm_subcategoria: subcategoria.nm_subcategoria,
      id_categoria: String(subcategoria.id_categoria),
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nm_subcategoria: formData.nm_subcategoria,
      id_categoria: Number(formData.id_categoria),
      fg_ativo: true,
    };

    if (editingSubcategoria) {
      updateMutation.mutate({ id: editingSubcategoria.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (profile?.perfil !== "admin" && profile?.perfil !== "avancado") {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 text-destructive">
          <AlertCircle className="w-5 h-5" />
          <p>Acesso negado. Apenas Admin e Avançado podem acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold mb-2">Subcategorias de Evento</h1>
        <p className="text-muted-foreground">Gerencie as subcategorias de evento</p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar subcategoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          Nova
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
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
            ) : filteredSubcategorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhuma subcategoria encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredSubcategorias.map((subcategoria) => (
                <TableRow key={subcategoria.id}>
                  <TableCell className="font-medium">{subcategoria.nm_subcategoria}</TableCell>
                  <TableCell>{subcategoria.categoria?.nm_categoria}</TableCell>
                  <TableCell>
                    <Switch
                      checked={subcategoria.fg_ativo}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: subcategoria.id, fg_ativo: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openEditModal(subcategoria)}>
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
            <DialogTitle>{editingSubcategoria ? "Editar" : "Nova"} Subcategoria</DialogTitle>
            <DialogDescription>Preencha as informações da subcategoria</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nm_subcategoria">Nome*</Label>
              <Input
                id="nm_subcategoria"
                value={formData.nm_subcategoria}
                onChange={(e) => setFormData({ ...formData, nm_subcategoria: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="id_categoria">Categoria*</Label>
              <Select
                value={formData.id_categoria}
                onValueChange={(value) => setFormData({ ...formData, id_categoria: value })}
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingSubcategoria ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}