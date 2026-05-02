import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit } from "lucide-react";

type Subcategoria = {
  id: string;
  nm_subcategoria: string;
  id_categoria: string;
  fg_ativo: boolean;
  nm_categoria?: string;
};

export default function Subcategorias() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Subcategoria | null>(null);
  const [formData, setFormData] = useState({ nm_subcategoria: "", id_categoria: "" });

  const { data: subcategorias, isLoading } = useQuery({
    queryKey: ["subcategorias_crud"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_subcategoria_evento")
        .select(`*, nm_categoria:dim_categoria_evento(nm_categoria)`)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data.map((s: any) => ({
        ...s,
        nm_categoria: s.nm_categoria?.nm_categoria || "—",
      })) as Subcategoria[];
    },
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_categoria_evento")
        .select("*")
        .eq("fg_ativo", true)
        .order("nm_categoria");
      if (error) throw error;
      return data;
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("dim_subcategoria_evento")
        .update({ fg_ativo: ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias_crud"] });
      toast({ title: "Subcategoria atualizada" });
    },
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_subcategoria_evento")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_subcategoria_evento")
          .insert({ ...data, fg_ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subcategorias_crud"] });
      toast({ title: editando ? "Subcategoria atualizada" : "Subcategoria criada" });
      fecharModal();
    },
  });

  const abrirModal = (sub?: Subcategoria) => {
    if (sub) {
      setEditando(sub);
      setFormData({ nm_subcategoria: sub.nm_subcategoria, id_categoria: sub.id_categoria });
    } else {
      setEditando(null);
      setFormData({ nm_subcategoria: "", id_categoria: "" });
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(formData);
  };

  const filtrados = subcategorias?.filter((s) =>
    s.nm_subcategoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.perfil !== "admin" && profile?.perfil !== "avancado") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Acesso restrito</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Subcategorias</h1>
          <p className="text-muted-foreground">Subcategorias por categoria</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Subcategoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar subcategorias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados && filtrados.length > 0 ? (
                    filtrados.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>{sub.nm_subcategoria}</TableCell>
                        <TableCell>{sub.nm_categoria}</TableCell>
                        <TableCell>
                          <Switch
                            checked={sub.fg_ativo}
                            onCheckedChange={(checked) =>
                              toggleAtivo.mutate({ id: sub.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(sub)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma subcategoria encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Subcategoria" : "Nova Subcategoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nm_subcategoria">Nome *</Label>
              <Input
                id="nm_subcategoria"
                value={formData.nm_subcategoria}
                onChange={(e) => setFormData({ ...formData, nm_subcategoria: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="id_categoria">Categoria *</Label>
              <Select
                value={formData.id_categoria}
                onValueChange={(value) => setFormData({ ...formData, id_categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nm_categoria}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}