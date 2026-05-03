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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit } from "lucide-react";

type Categoria = {
  id: string;
  nm_categoria: string;
  fg_ativo: boolean;
};

export default function Categorias() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [formData, setFormData] = useState({ nm_categoria: "" });

  const { data: categorias, isLoading } = useQuery({
    queryKey: ["categorias_crud"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_categoria_evento")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Categoria[];
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("dim_categoria_evento")
        .update({ fg_ativo: ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_crud"] });
      toast({ title: "Categoria atualizada" });
    },
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_categoria_evento")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_categoria_evento")
          .insert({ ...data, fg_ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias_crud"] });
      toast({ title: editando ? "Categoria atualizada" : "Categoria criada" });
      fecharModal();
    },
  });

  const abrirModal = (categoria?: Categoria) => {
    if (categoria) {
      setEditando(categoria);
      setFormData({ nm_categoria: categoria.nm_categoria });
    } else {
      setEditando(null);
      setFormData({ nm_categoria: "" });
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

  const filteredCategorias = categorias?.filter((c) => {
    if (!c || searchTerm === "") return true;
    return String(c.nm_categoria ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
           String(c.descricao ?? "").toLowerCase().includes(searchTerm.toLowerCase());
  }) ?? [];

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
          <h1 className="text-3xl font-semibold mb-2">Categorias</h1>
          <p className="text-muted-foreground">Categorias de eventos</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categorias..."
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
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategorias && filteredCategorias.length > 0 ? (
                    filteredCategorias.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell>{cat.nm_categoria}</TableCell>
                        <TableCell>
                          <Switch
                            checked={cat.fg_ativo}
                            onCheckedChange={(checked) =>
                              toggleAtivo.mutate({ id: cat.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(cat)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhuma categoria encontrada
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
            <DialogTitle>{editando ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="nm_categoria">Nome *</Label>
              <Input
                id="nm_categoria"
                value={formData.nm_categoria}
                onChange={(e) => setFormData({ nm_categoria: e.target.value })}
                required
              />
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