import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit } from "lucide-react";

type GrupoEquipamento = {
  id: string;
  cd_grupo: string;
  nm_grupo_equipamento: string;
};

export default function GruposEquipamento() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<GrupoEquipamento | null>(null);
  const [formData, setFormData] = useState({ cd_grupo: "", nm_grupo_equipamento: "" });

  const { data: grupos, isLoading } = useQuery({
    queryKey: ["grupos-equipamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_grupo_equipamento")
        .select("*")
        .order("cd_grupo");
      if (error) throw error;
      return data as GrupoEquipamento[];
    },
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_grupo_equipamento")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_grupo_equipamento")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grupos-equipamento"] });
      toast({ title: editando ? "Grupo atualizado" : "Grupo criado" });
      fecharModal();
    },
  });

  const abrirModal = (grupo?: GrupoEquipamento) => {
    if (grupo) {
      setEditando(grupo);
      setFormData({ cd_grupo: grupo.cd_grupo, nm_grupo_equipamento: grupo.nm_grupo_equipamento });
    } else {
      setEditando(null);
      setFormData({ cd_grupo: "", nm_grupo_equipamento: "" });
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

  const filteredGrupos = grupos?.filter((g) => {
    if (!g) return false;
    return searchTerm === "" || 
      String(g.cd_grupo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(g.nm_grupo_equipamento ?? "").toLowerCase().includes(searchTerm.toLowerCase());
  }) ?? [];

  if (profile?.perfil !== "admin" && profile?.perfil !== "avancado") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Grupos de Equipamento</h1>
          <p className="text-muted-foreground">Gestão de grupos de equipamentos</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar grupos..."
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
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrupos && filteredGrupos.length > 0 ? (
                    filteredGrupos.map((grupo) => (
                      <TableRow key={grupo.id}>
                        <TableCell className="font-mono">{grupo.cd_grupo}</TableCell>
                        <TableCell>{grupo.nm_grupo_equipamento}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(grupo)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum grupo encontrado
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
            <DialogTitle>{editando ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cd_grupo">Código *</Label>
              <Input
                id="cd_grupo"
                value={formData.cd_grupo}
                onChange={(e) => setFormData({ ...formData, cd_grupo: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nm_grupo_equipamento">Nome *</Label>
              <Input
                id="nm_grupo_equipamento"
                value={formData.nm_grupo_equipamento}
                onChange={(e) => setFormData({ ...formData, nm_grupo_equipamento: e.target.value })}
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