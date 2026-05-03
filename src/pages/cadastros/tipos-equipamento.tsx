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

type TipoEquipamento = {
  id: string;
  cd_tipo: string;
  nm_tipo: string;
};

export default function TiposEquipamento() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<TipoEquipamento | null>(null);
  const [formData, setFormData] = useState({ cd_tipo: "", nm_tipo: "" });

  const { data: tipos, isLoading } = useQuery({
    queryKey: ["tipos_equipamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_equipamento")
        .select("*")
        .order("cd_tipo");
      if (error) throw error;
      return data as TipoEquipamento[];
    },
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_tipo_equipamento")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_tipo_equipamento")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_equipamento"] });
      toast({ title: editando ? "Tipo atualizado" : "Tipo criado" });
      fecharModal();
    },
  });

  const abrirModal = (tipo?: TipoEquipamento) => {
    if (tipo) {
      setEditando(tipo);
      setFormData({ cd_tipo: tipo.cd_tipo, nm_tipo: tipo.nm_tipo });
    } else {
      setEditando(null);
      setFormData({ cd_tipo: "", nm_tipo: "" });
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

  const filteredTipos = tipos?.filter((t) => {
    if (!t) return false;
    return searchTerm === "" || 
      String(t.cd_tipo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(t.nm_tipo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className="text-3xl font-semibold mb-2">Tipos de Equipamento</h1>
          <p className="text-muted-foreground">Classificação de equipamentos por tipo</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tipos..."
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
                  {filteredTipos && filteredTipos.length > 0 ? (
                    filteredTipos.map((tipo) => (
                      <TableRow key={tipo.id}>
                        <TableCell className="font-mono">{tipo.cd_tipo}</TableCell>
                        <TableCell>{tipo.nm_tipo}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(tipo)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum tipo encontrado
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
            <DialogTitle>{editando ? "Editar Tipo" : "Novo Tipo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cd_tipo">Código *</Label>
              <Input
                id="cd_tipo"
                value={formData.cd_tipo}
                onChange={(e) => setFormData({ ...formData, cd_tipo: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nm_tipo">Nome *</Label>
              <Input
                id="nm_tipo"
                value={formData.nm_tipo}
                onChange={(e) => setFormData({ ...formData, nm_tipo: e.target.value })}
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