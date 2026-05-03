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
import { Plus, Search, Edit, AlertCircle } from "lucide-react";

type TipoEvento = {
  id: string;
  cd_tipo_evento: string;
  nm_tipo_evento: string;
  criticidade: string;
  sla_minutos: number;
  id_categoria: string;
  id_subcategoria: string;
  notificar_telegram: boolean;
  fg_ativo: boolean;
  nm_categoria?: string;
  nm_subcategoria?: string;
};

type FormData = {
  cd_tipo_evento: string;
  nm_tipo_evento: string;
  criticidade: string;
  sla_minutos: string;
  id_categoria: string;
  id_subcategoria: string;
  notificar_telegram: boolean;
};

export default function TiposEvento() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<TipoEvento | null>(null);
  const [formData, setFormData] = useState<FormData>({
    cd_tipo_evento: "",
    nm_tipo_evento: "",
    criticidade: "media",
    sla_minutos: "60",
    id_categoria: "",
    id_subcategoria: "",
    notificar_telegram: false,
  });
  const [criticidadeFilter, setCriticidadeFilter] = useState<string>("todas");

  // Queries
  const { data: tipos, isLoading } = useQuery({
    queryKey: ["tipos_evento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_evento")
        .select(`
          *,
          nm_categoria:dim_categoria_evento(nm_categoria),
          nm_subcategoria:dim_subcategoria_evento(nm_subcategoria)
        `)
        .order("criado_em", { ascending: false });
      
      if (error) throw error;
      return data.map((t: any) => ({
        ...t,
        nm_categoria: t.nm_categoria?.nm_categoria || "—",
        nm_subcategoria: t.nm_subcategoria?.nm_subcategoria || "—",
      })) as TipoEvento[];
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
      return data;
    },
  });

  const { data: subcategorias } = useQuery({
    queryKey: ["subcategorias", formData.id_categoria],
    queryFn: async () => {
      if (!formData.id_categoria) return [];
      const { data, error } = await supabase
        .from("dim_subcategoria_evento")
        .select("*")
        .eq("id_categoria", formData.id_categoria)
        .eq("fg_ativo", true)
        .order("nm_subcategoria");
      if (error) throw error;
      return data;
    },
    enabled: !!formData.id_categoria,
  });

  // Mutations
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("dim_tipo_evento")
        .update({ fg_ativo: ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_evento"] });
      toast({ title: "Tipo de evento atualizado" });
    },
  });

  const salvarTipo = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        cd_tipo_evento: data.cd_tipo_evento,
        nm_tipo_evento: data.nm_tipo_evento,
        criticidade: data.criticidade,
        sla_minutos: parseInt(data.sla_minutos),
        id_categoria: data.id_categoria,
        id_subcategoria: data.id_subcategoria,
        notificar_telegram: data.notificar_telegram,
      };

      if (editando) {
        const { error } = await supabase
          .from("dim_tipo_evento")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_tipo_evento")
          .insert({ ...payload, fg_ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos_evento"] });
      toast({ title: editando ? "Tipo atualizado" : "Tipo criado" });
      fecharModal();
    },
  });

  const abrirModal = (tipo?: TipoEvento) => {
    if (tipo) {
      setEditando(tipo);
      setFormData({
        cd_tipo_evento: tipo.cd_tipo_evento,
        nm_tipo_evento: tipo.nm_tipo_evento,
        criticidade: tipo.criticidade,
        sla_minutos: tipo.sla_minutos.toString(),
        id_categoria: tipo.id_categoria,
        id_subcategoria: tipo.id_subcategoria,
        notificar_telegram: tipo.notificar_telegram,
      });
    } else {
      setEditando(null);
      setFormData({
        cd_tipo_evento: "",
        nm_tipo_evento: "",
        criticidade: "media",
        sla_minutos: "60",
        id_categoria: "",
        id_subcategoria: "",
        notificar_telegram: false,
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
    salvarTipo.mutate(formData);
  };

  const filteredTipos = tipos?.filter((t) => {
    if (!t || searchTerm === "") return true;
    const matchesSearch = String(t.nm_tipo_evento ?? "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCriticidade = criticidadeFilter === "todas" || t.criticidade === criticidadeFilter;
    return matchesSearch && matchesCriticidade;
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
          <h1 className="text-3xl font-semibold mb-2">Tipos de Evento</h1>
          <p className="text-muted-foreground">Configurar tipos de eventos operacionais</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Tipo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
                    <TableHead>Criticidade</TableHead>
                    <TableHead>SLA (min)</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Subcategoria</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTipos && filteredTipos.length > 0 ? (
                    filteredTipos.map((tipo) => (
                      <TableRow key={tipo.id}>
                        <TableCell className="font-mono text-sm">
                          {tipo.cd_tipo_evento}
                        </TableCell>
                        <TableCell>{tipo.nm_tipo_evento}</TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              tipo.criticidade === "critica"
                                ? "bg-destructive-bg text-destructive"
                                : tipo.criticidade === "alta"
                                ? "bg-warning-bg text-warning-dark"
                                : tipo.criticidade === "media"
                                ? "bg-primary-light text-primary-dark"
                                : "bg-success-bg text-success-dark"
                            }`}
                          >
                            {tipo.criticidade.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono">{tipo.sla_minutos}</TableCell>
                        <TableCell className="text-sm">{tipo.nm_categoria}</TableCell>
                        <TableCell className="text-sm">{tipo.nm_subcategoria}</TableCell>
                        <TableCell>
                          {tipo.notificar_telegram ? "Sim" : "Não"}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={tipo.fg_ativo}
                            onCheckedChange={(checked) =>
                              toggleAtivo.mutate({ id: tipo.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => abrirModal(tipo)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        Nenhum tipo de evento encontrado
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
            <DialogTitle>
              {editando ? "Editar Tipo de Evento" : "Novo Tipo de Evento"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cd_tipo_evento">Código *</Label>
              <Input
                id="cd_tipo_evento"
                value={formData.cd_tipo_evento}
                onChange={(e) =>
                  setFormData({ ...formData, cd_tipo_evento: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="nm_tipo_evento">Nome *</Label>
              <Input
                id="nm_tipo_evento"
                value={formData.nm_tipo_evento}
                onChange={(e) =>
                  setFormData({ ...formData, nm_tipo_evento: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="criticidade">Criticidade *</Label>
              <Select
                value={formData.criticidade}
                onValueChange={(value) =>
                  setFormData({ ...formData, criticidade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sla_minutos">SLA (minutos) *</Label>
              <Input
                id="sla_minutos"
                type="number"
                value={formData.sla_minutos}
                onChange={(e) =>
                  setFormData({ ...formData, sla_minutos: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="id_categoria">Categoria *</Label>
              <Select
                value={formData.id_categoria}
                onValueChange={(value) =>
                  setFormData({ ...formData, id_categoria: value, id_subcategoria: "" })
                }
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
            {formData.id_categoria && (
              <div>
                <Label htmlFor="id_subcategoria">Subcategoria *</Label>
                <Select
                  value={formData.id_subcategoria}
                  onValueChange={(value) =>
                    setFormData({ ...formData, id_subcategoria: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategorias?.map((sub: any) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.nm_subcategoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="notificar_telegram"
                checked={formData.notificar_telegram}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, notificar_telegram: checked })
                }
              />
              <Label htmlFor="notificar_telegram" className="cursor-pointer">
                Notificar via Telegram
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvarTipo.isPending}>
                {salvarTipo.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}