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

type Unidade = {
  id: string;
  cd_unidade: string;
  nm_unidade: string;
  fg_ativo: boolean;
};

export default function Unidades() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Unidade | null>(null);
  const [formData, setFormData] = useState({ cd_unidade: "", nm_unidade: "" });

  const { data: unidades, isLoading } = useQuery({
    queryKey: ["unidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_unidade")
        .select("*")
        .order("cd_unidade");
      if (error) throw error;
      return data as Unidade[];
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("dim_unidade")
        .update({ fg_ativo: ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      toast({ title: "Unidade atualizada" });
    },
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_unidade")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_unidade")
          .insert({ ...data, fg_ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades"] });
      toast({ title: editando ? "Unidade atualizada" : "Unidade criada" });
      fecharModal();
    },
  });

  const abrirModal = (unidade?: Unidade) => {
    if (unidade) {
      setEditando(unidade);
      setFormData({ cd_unidade: unidade.cd_unidade, nm_unidade: unidade.nm_unidade });
    } else {
      setEditando(null);
      setFormData({ cd_unidade: "", nm_unidade: "" });
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

  const filteredUnidades = unidades?.filter((u) => {
    if (!u || searchTerm === "") return true;
    return String(u.cd_unidade ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
           String(u.nm_unidade ?? "").toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className="text-3xl font-semibold mb-2">Unidades</h1>
          <p className="text-muted-foreground">Unidades operacionais</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Unidade
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar unidades..."
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
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnidades && filteredUnidades.length > 0 ? (
                    filteredUnidades.map((unidade) => (
                      <TableRow key={unidade.id}>
                        <TableCell className="font-mono">{unidade.cd_unidade}</TableCell>
                        <TableCell>{unidade.nm_unidade}</TableCell>
                        <TableCell>
                          <Switch
                            checked={unidade.fg_ativo}
                            onCheckedChange={(checked) =>
                              toggleAtivo.mutate({ id: unidade.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(unidade)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma unidade encontrada
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
            <DialogTitle>{editando ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cd_unidade">Código *</Label>
              <Input
                id="cd_unidade"
                value={formData.cd_unidade}
                onChange={(e) => setFormData({ ...formData, cd_unidade: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nm_unidade">Nome *</Label>
              <Input
                id="nm_unidade"
                value={formData.nm_unidade}
                onChange={(e) => setFormData({ ...formData, nm_unidade: e.target.value })}
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