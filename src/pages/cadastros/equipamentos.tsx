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

type Equipamento = {
  id: string;
  cd_equipamento: string;
  nm_equipamento: string;
  id_grupo: string;
  id_tipo: string;
  id_unidade: string;
  ativo: boolean;
  grupo?: { nm_grupo_equipamento: string };
  tipo?: { nm_tipo_equipamento: string };
  unidade?: { nm_unidade: string };
};

type GrupoEquipamento = {
  id: string;
  nm_grupo_equipamento: string;
};

type TipoEquipamento = {
  id: string;
  nm_tipo_equipamento: string;
};

export default function Equipamentos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Equipamento | null>(null);
  const [formData, setFormData] = useState({
    cd_equipamento: "",
    nm_equipamento: "",
    id_grupo: "",
    id_tipo: "",
    id_unidade: "",
  });

  const { data: equipamentos, isLoading } = useQuery({
    queryKey: ["equipamentos-cadastro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_equipamento")
        .select(`
          *,
          grupo:dim_grupo_equipamento(nm_grupo_equipamento),
          tipo:dim_tipo_equipamento(nm_tipo_equipamento),
          unidade:dim_unidade(nm_unidade)
        `)
        .order("cd_equipamento");
      if (error) throw error;
      return data as Equipamento[];
    },
  });

  const { data: grupos } = useQuery({
    queryKey: ["grupos-equipamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_grupo_equipamento")
        .select("id, nm_grupo_equipamento")
        .order("nm_grupo_equipamento");
      if (error) throw error;
      return data as GrupoEquipamento[];
    },
  });

  const { data: tipos } = useQuery({
    queryKey: ["tipos-equipamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_equipamento")
        .select("id, nm_tipo_equipamento")
        .order("nm_tipo_equipamento");
      if (error) throw error;
      return data as TipoEquipamento[];
    },
  });

  const { data: unidades } = useQuery({
    queryKey: ["unidades_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_unidade")
        .select("*")
        .eq("ativo", true)
        .order("nm_unidade");
      if (error) throw error;
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("dim_equipamento")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos_crud"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_equipamento")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_equipamento")
          .insert({ ...data, ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipamentos_crud"] });
      toast({ title: editando ? "Equipamento atualizado" : "Equipamento criado" });
      fecharModal();
    },
  });

  const filteredEquipamentos = equipamentos?.filter((e) => {
    if (!e) return false;
    return searchTerm === "" || 
      String(e.cd_equipamento ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.nm_equipamento ?? "").toLowerCase().includes(searchTerm.toLowerCase());
  }) ?? [];

  const abrirModal = (equip?: Equipamento) => {
    if (equip) {
      setEditando(equip);
      setFormData({
        cd_equipamento: equip.cd_equipamento,
        nm_equipamento: equip.nm_equipamento,
        id_grupo: equip.id_grupo,
        id_tipo: equip.id_tipo,
        id_unidade: equip.id_unidade,
      });
    } else {
      setEditando(null);
      setFormData({
        cd_equipamento: "",
        nm_equipamento: "",
        id_grupo: "",
        id_tipo: "",
        id_unidade: "",
      });
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

  // Admin has unrestricted access
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
          <h1 className="text-3xl font-semibold mb-2">Equipamentos</h1>
          <p className="text-muted-foreground">Gestão de equipamentos agrícolas</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Equipamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
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
                    <TableHead>Grupo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipamentos && filteredEquipamentos.length > 0 ? (
                    filteredEquipamentos.map((equip) => (
                      <TableRow key={equip.id}>
                        <TableCell className="font-mono">{equip.cd_equipamento}</TableCell>
                        <TableCell>{equip.nm_equipamento}</TableCell>
                        <TableCell className="text-sm">{equip.grupo?.nm_grupo_equipamento || "—"}</TableCell>
                        <TableCell className="text-sm">{equip.tipo?.nm_tipo_equipamento || "—"}</TableCell>
                        <TableCell className="text-sm">{equip.unidade?.nm_unidade || "—"}</TableCell>
                        <TableCell>
                          <Switch
                            checked={equip.ativo}
                            onCheckedChange={(checked) =>
                              toggleMutation.mutate({ id: equip.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(equip)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum equipamento encontrado
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
            <DialogTitle>{editando ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cd_equipamento">Código *</Label>
              <Input
                id="cd_equipamento"
                value={formData.cd_equipamento}
                onChange={(e) => setFormData({ ...formData, cd_equipamento: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nm_equipamento">Nome *</Label>
              <Input
                id="nm_equipamento"
                value={formData.nm_equipamento}
                onChange={(e) => setFormData({ ...formData, nm_equipamento: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="id_grupo">Grupo *</Label>
              <Select
                value={formData.id_grupo}
                onValueChange={(value) => setFormData({ ...formData, id_grupo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {grupos?.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nm_grupo_equipamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="id_tipo">Tipo *</Label>
              <Select
                value={formData.id_tipo}
                onValueChange={(value) => setFormData({ ...formData, id_tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos?.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nm_tipo_equipamento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="id_unidade">Unidade *</Label>
              <Select
                value={formData.id_unidade}
                onValueChange={(value) => setFormData({ ...formData, id_unidade: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {unidades?.map((unidade: any) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nm_unidade}
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