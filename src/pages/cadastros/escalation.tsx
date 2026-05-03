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

type Escalation = {
  id: string;
  pessoa: string;
  contato: string;
  telegram_chat_id: string | null;
  id_tipo_evento: string;
  ordem: number;
  turno: string;
  nivel_hierarquico: number;
  fg_ativo: boolean;
  nm_tipo_evento?: string;
};

export default function EscalationList() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Escalation | null>(null);
  const [formData, setFormData] = useState({
    pessoa: "",
    contato: "",
    telegram_chat_id: "",
    id_tipo_evento: "",
    ordem: "1",
    turno: "diurno",
    nivel_hierarquico: "1",
  });

  const { data: escalations, isLoading } = useQuery({
    queryKey: ["escalation_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select(`*, nm_tipo_evento:dim_tipo_evento(nm_tipo_evento)`)
        .order("ordem");
      if (error) throw error;
      return data.map((e: any) => ({
        ...e,
        nm_tipo_evento: e.nm_tipo_evento?.nm_tipo_evento || "—",
      })) as Escalation[];
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
        .from("dim_escalation_list")
        .update({ fg_ativo: ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation_list"] });
      toast({ title: "Contato atualizado" });
    },
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        pessoa: data.pessoa,
        contato: data.contato,
        telegram_chat_id: data.telegram_chat_id || null,
        id_tipo_evento: data.id_tipo_evento,
        ordem: parseInt(data.ordem),
        turno: data.turno,
        nivel_hierarquico: parseInt(data.nivel_hierarquico),
      };

      if (editando) {
        const { error } = await supabase
          .from("dim_escalation_list")
          .update(payload)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_escalation_list")
          .insert({ ...payload, fg_ativo: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escalation_list"] });
      toast({ title: editando ? "Contato atualizado" : "Contato criado" });
      fecharModal();
    },
  });

  const abrirModal = (esc?: Escalation) => {
    if (esc) {
      setEditando(esc);
      setFormData({
        pessoa: esc.pessoa,
        contato: esc.contato,
        telegram_chat_id: esc.telegram_chat_id || "",
        id_tipo_evento: esc.id_tipo_evento,
        ordem: esc.ordem.toString(),
        turno: esc.turno,
        nivel_hierarquico: esc.nivel_hierarquico.toString(),
      });
    } else {
      setEditando(null);
      setFormData({
        pessoa: "",
        contato: "",
        telegram_chat_id: "",
        id_tipo_evento: "",
        ordem: "1",
        turno: "diurno",
        nivel_hierarquico: "1",
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

  const filteredEscalation = escalations?.filter((e) => {
    if (!e || searchTerm === "") return true;
    return String(e.nm_pessoa ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
           String(e.contato ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
           String(e.turno ?? "").toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className="text-3xl font-semibold mb-2">Escalation List</h1>
          <p className="text-muted-foreground">Contatos para escalonamento</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Contato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pessoa..."
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
                    <TableHead>Ordem</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Tipo Evento</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEscalation && filteredEscalation.length > 0 ? (
                    filteredEscalation.map((esc) => (
                      <TableRow key={esc.id}>
                        <TableCell className="font-mono">{esc.ordem}</TableCell>
                        <TableCell>{esc.pessoa}</TableCell>
                        <TableCell>{esc.contato}</TableCell>
                        <TableCell className="text-sm">{esc.nm_tipo_evento}</TableCell>
                        <TableCell className="capitalize">{esc.turno}</TableCell>
                        <TableCell>{esc.nivel_hierarquico}</TableCell>
                        <TableCell>
                          <Switch
                            checked={esc.fg_ativo}
                            onCheckedChange={(checked) =>
                              toggleAtivo.mutate({ id: esc.id, ativo: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(esc)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum contato encontrado
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Contato" : "Novo Contato"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pessoa">Pessoa *</Label>
                <Input
                  id="pessoa"
                  value={formData.pessoa}
                  onChange={(e) => setFormData({ ...formData, pessoa: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="contato">Contato (telefone) *</Label>
                <Input
                  id="contato"
                  value={formData.contato}
                  onChange={(e) => setFormData({ ...formData, contato: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="telegram_chat_id">Telegram Chat ID (opcional)</Label>
              <Input
                id="telegram_chat_id"
                value={formData.telegram_chat_id}
                onChange={(e) => setFormData({ ...formData, telegram_chat_id: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="id_tipo_evento">Tipo de Evento *</Label>
              <Select
                value={formData.id_tipo_evento}
                onValueChange={(value) => setFormData({ ...formData, id_tipo_evento: value })}
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
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="ordem">Ordem *</Label>
                <Input
                  id="ordem"
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="turno">Turno *</Label>
                <Select
                  value={formData.turno}
                  onValueChange={(value) => setFormData({ ...formData, turno: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diurno">Diurno</SelectItem>
                    <SelectItem value="noturno">Noturno</SelectItem>
                    <SelectItem value="24h">24h</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="nivel_hierarquico">Nível Hierárquico *</Label>
                <Input
                  id="nivel_hierarquico"
                  type="number"
                  value={formData.nivel_hierarquico}
                  onChange={(e) => setFormData({ ...formData, nivel_hierarquico: e.target.value })}
                  required
                />
              </div>
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