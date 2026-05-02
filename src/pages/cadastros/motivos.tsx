import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Motivo = {
  id: string;
  motivo: string;
  id_tipo_evento: string;
  fg_ativo: boolean;
  nm_tipo_evento?: string;
};

export default function Motivos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Motivo | null>(null);
  const [formData, setFormData] = useState({
    motivo: "",
    id_tipo_evento: "",
  });

  const { data: motivos, isLoading } = useQuery({
    queryKey: ["motivos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select(`*, nm_tipo_evento:dim_tipo_evento(nm_tipo_evento)`)
        .order("criado_em", { ascending: false });
      
      if (error) throw error;
      return data.map((m: any) => ({
        ...m,
        nm_tipo_evento: m.nm_tipo_evento?.nm_tipo_evento || "—",
      })) as Motivo[];
    },
  });

  const { data: tiposEvento } = useQuery({
    queryKey: ["tipos_evento_select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_evento")
        .select("*")
        .eq("fg_ativo", true)
        .order("nm_tipo_evento");
      if (error) throw error;
      return data;
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("dim_motivo_evento")
        .update({ fg_ativo: ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: "Motivo atualizado" });
    },
  });

  const salvarMotivo = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_motivo_evento")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_motivo_evento")
          .insert({ ...data, fg_ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["motivos"] });
      toast({ title: editando ? "Motivo atualizado" : "Motivo criado" });
      fecharModal();
    },
  });

  const abrirModal = (motivo?: Motivo) => {
    if (motivo) {
      setEditando(motivo);
      setFormData({
        motivo: motivo.motivo,
        id_tipo_evento: motivo.id_tipo_evento,
      });
    } else {
      setEditando(null);
      setFormData({ motivo: "", id_tipo_evento: "" });
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salvarMotivo.mutate(formData);
  };

  const motivosFiltrados = motivos?.filter((m) =>
    m.motivo.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-semibold mb-2">Motivos</h1>
          <p className="text-muted-foreground">Motivos de eventos e encerramentos</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Motivo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar motivos..."
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
                    <TableHead>Motivo</TableHead>
                    <TableHead>Tipo de Evento Vinculado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {motivosFiltrados && motivosFiltrados.length > 0 ? (
                    motivosFiltrados.map((motivo) => (
                      <TableRow key={motivo.id}>
                        <TableCell>{motivo.motivo}</TableCell>
                        <TableCell>{motivo.nm_tipo_evento}</TableCell>
                        <TableCell>
                          <Switch
                            checked={motivo.fg_ativo}
                            onCheckedChange={(checked) =>
                              toggleAtivo.mutate({ id: motivo.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModal(motivo)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum motivo encontrado
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
            <DialogTitle>{editando ? "Editar Motivo" : "Novo Motivo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="id_tipo_evento">Tipo de Evento *</Label>
              <Select
                value={formData.id_tipo_evento}
                onValueChange={(value) =>
                  setFormData({ ...formData, id_tipo_evento: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposEvento?.map((tipo: any) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nm_tipo_evento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvarMotivo.isPending}>
                {salvarMotivo.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}