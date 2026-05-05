import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Evento = {
  id: string;
  id_tipo_evento: number;
  id_equipamento: string;
  nm_tipo_evento: string;
  nm_equipamento: string;
  nm_operacao?: string;
  nm_operador?: string;
  nm_unidade?: string;
  nm_categoria?: string;
  nm_subcategoria?: string;
  criticidade: string;
  status: string;
  criado_em: string;
  vl_tempo_duracao_max?: number;
  origem?: string;
  nivel_escalonamento: number;
  [key: string]: any;
};

type InlineAction = "escalar" | "semTratativa" | "cancelar" | null;

type ModalAssumirProps = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const criticidadeStyle = (c: string): React.CSSProperties => {
  switch (c) {
    case "critica": return { background: "#FCEBEB", color: "#791F1F" };
    case "alta":    return { background: "#FAEEDA", color: "#633806" };
    case "media":   return { background: "#E6F1FB", color: "#0C447C" };
    case "baixa":   return { background: "#EAF3DE", color: "#27500A" };
    default:        return { background: "#f1f5f9", color: "#64748b" };
  }
};

export function ModalAssumir({ evento, open, onOpenChange }: ModalAssumirProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inlineAction, setInlineAction] = useState<InlineAction>(null);
  const [motivoId, setMotivoId] = useState("");
  const [contatoId, setContatoId] = useState("");
  const [dtPrazo, setDtPrazo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [justificativa, setJustificativa] = useState("");

  const { data: equipDetalhes } = useQuery({
    queryKey: ["equip-detalhes-assumir", evento?.id_equipamento],
    queryFn: async () => {
      if (!evento?.id_equipamento) return null;
      const { data } = await supabase
        .from("dim_equipamento")
        .select("*, dim_grupo_equipamento(nm_grupo_equipamento), dim_tipo_equipamento(nm_tipo_equipamento)")
        .eq("id", evento.id_equipamento)
        .single();
      return data;
    },
    enabled: open && !!evento?.id_equipamento,
  });

  const { data: motivos } = useQuery({
    queryKey: ["motivos-assumir", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento) return [];
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("id, nm_motivo")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("nm_motivo");
      if (error) throw error;
      return data;
    },
    enabled: open && !!evento?.id_tipo_evento,
  });

  const { data: contatos } = useQuery({
    queryKey: ["escalation-contatos", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento) return [];
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("id, nm_pessoa, turno")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    },
    enabled: open && !!evento?.id_tipo_evento,
  });

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
    queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
    onOpenChange(false);
  };

  const resetState = () => {
    setInlineAction(null);
    setMotivoId("");
    setContatoId("");
    setDtPrazo("");
    setObservacao("");
    setJustificativa("");
  };

  const aguardarMutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "em_andamento",
          dt_inicio: new Date().toISOString(),
          id_usuario_inicio: profile?.id ?? null,
        })
        .eq("id", evento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAndClose();
      toast({ title: "Evento assumido — em andamento" });
    },
    onError: () => toast({ title: "Erro ao assumir evento", variant: "destructive" }),
  });

  const escalarMutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;
      const contato = contatos?.find((c) => c.id === Number(contatoId));

      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          dt_prazo: dtPrazo,
          nivel_escalonamento: 1,
          dt_inicio: new Date().toISOString(),
          id_usuario_inicio: profile?.id ?? null,
        })
        .eq("id", evento.id);
      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert({
          id_fila_evento: evento.id,
          nivel: 1,
          dt_prazo: dtPrazo,
          id_usuario: profile?.id ?? null,
          nm_contato: contato?.nm_pessoa ?? null,
          observacao: observacao || null,
        });
      if (logError) throw logError;
    },
    onSuccess: () => {
      invalidateAndClose();
      toast({ title: "Evento escalado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao escalar evento", variant: "destructive" }),
  });

  const semTrativaMutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "encerrado",
          tp_encerramento: "sem_tratativa",
          dt_fim: new Date().toISOString(),
          id_usuario_fim: profile?.id ?? null,
        })
        .eq("id", evento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAndClose();
      toast({ title: "Evento encerrado sem tratativa" });
    },
    onError: () => toast({ title: "Erro ao encerrar evento", variant: "destructive" }),
  });

  const cancelarMutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "cancelado",
          tp_encerramento: "cancelado",
          dt_fim: new Date().toISOString(),
          observacao_fim: justificativa,
          id_usuario_fim: profile?.id ?? null,
        })
        .eq("id", evento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAndClose();
      toast({ title: "Evento cancelado" });
    },
    onError: () => toast({ title: "Erro ao cancelar evento", variant: "destructive" }),
  });

  if (!evento) return null;

  const cdEquip = (equipDetalhes as any)?.cd_equipamento;
  const nmGrupo = (equipDetalhes as any)?.dim_grupo_equipamento?.nm_grupo_equipamento;

  const dataAbertura = evento.criado_em
    ? format(new Date(evento.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : "—";
  const tempoDecorrido = evento.criado_em
    ? formatDistanceToNow(new Date(evento.criado_em), { addSuffix: true, locale: ptBR })
    : "—";

  const anyPending =
    aguardarMutation.isPending ||
    escalarMutation.isPending ||
    semTrativaMutation.isPending ||
    cancelarMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetState();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assumir Evento</DialogTitle>
        </DialogHeader>

        {/* SEÇÃO SUPERIOR — Informações do evento */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Tipo de Evento</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="font-semibold">{evento.nm_tipo_evento}</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-medium"
                style={criticidadeStyle(evento.criticidade)}
              >
                {evento.criticidade}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium mt-0.5 capitalize">{evento.status}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Categoria</p>
            <p className="font-medium mt-0.5">{evento.nm_categoria || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subcategoria</p>
            <p className="font-medium mt-0.5">{evento.nm_subcategoria || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Origem</p>
            <p className="font-mono text-xs mt-0.5">{evento.origem || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duração registrada</p>
            <p className="font-medium mt-0.5">
              {evento.vl_tempo_duracao_max != null ? `${evento.vl_tempo_duracao_max} min` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Data de abertura</p>
            <p className="font-medium mt-0.5">{dataAbertura}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tempo decorrido</p>
            <p className="font-medium mt-0.5">{tempoDecorrido}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Equipamento</p>
            <p className="font-medium mt-0.5">
              {cdEquip ? `${cdEquip} — ` : ""}{evento.nm_equipamento}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Grupo do Equipamento</p>
            <p className="font-medium mt-0.5">{nmGrupo || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Operação</p>
            <p className="font-medium mt-0.5">{evento.nm_operacao || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Operador</p>
            <p className="font-medium mt-0.5">{evento.nm_operador || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Unidade</p>
            <p className="font-medium mt-0.5">{evento.nm_unidade || "—"}</p>
          </div>
        </div>

        <Separator className="my-2" />

        {/* SEÇÃO INFERIOR — Ações */}
        <div className="space-y-4">
          {/* Botões principais */}
          {inlineAction === null && (
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => aguardarMutation.mutate()}
                disabled={anyPending}
              >
                {aguardarMutation.isPending ? "Confirmando..." : "Aguardar"}
              </Button>
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => setInlineAction("escalar")}
                disabled={anyPending}
              >
                Escalar
              </Button>
              <Button
                variant="outline"
                onClick={() => setInlineAction("semTratativa")}
                disabled={anyPending}
              >
                Sem tratativa
              </Button>
              <Button
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10"
                onClick={() => setInlineAction("cancelar")}
                disabled={anyPending}
              >
                Cancelar evento
              </Button>
            </div>
          )}

          {/* Inline: Escalar */}
          {inlineAction === "escalar" && (
            <div className="space-y-3 p-4 bg-muted/40 rounded-lg border">
              <p className="text-sm font-semibold text-purple-700">Escalar Evento</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Motivo</Label>
                  <Select value={motivoId} onValueChange={setMotivoId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o motivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {motivos?.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nm_motivo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Contato Acionado *</Label>
                  <Select value={contatoId} onValueChange={setContatoId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione o contato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contatos?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nm_pessoa}{c.turno ? ` (${c.turno})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Prazo *</Label>
                  <Input
                    type="datetime-local"
                    value={dtPrazo}
                    onChange={(e) => setDtPrazo(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Observação</Label>
                  <Textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    maxLength={280}
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground text-right mt-0.5">
                    {observacao.length}/280
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  disabled={!contatoId || !dtPrazo || escalarMutation.isPending}
                  onClick={() => escalarMutation.mutate()}
                >
                  {escalarMutation.isPending ? "Escalando..." : "Confirmar Escalonamento"}
                </Button>
                <Button variant="ghost" onClick={() => setInlineAction(null)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Inline: Sem Tratativa */}
          {inlineAction === "semTratativa" && (
            <div className="space-y-3 p-4 bg-muted/40 rounded-lg border">
              <p className="text-sm font-semibold">Confirmar encerramento sem tratativa?</p>
              <p className="text-xs text-muted-foreground">
                O evento será encerrado sem registro de tratativa.
              </p>
              <div className="flex gap-2">
                <Button
                  disabled={semTrativaMutation.isPending}
                  onClick={() => semTrativaMutation.mutate()}
                >
                  {semTrativaMutation.isPending ? "Confirmando..." : "Confirmar"}
                </Button>
                <Button variant="ghost" onClick={() => setInlineAction(null)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {/* Inline: Cancelar */}
          {inlineAction === "cancelar" && (
            <div className="space-y-3 p-4 bg-muted/40 rounded-lg border border-destructive/30">
              <p className="text-sm font-semibold text-destructive">Cancelar Evento</p>
              <div>
                <Label className="text-xs">Justificativa * (obrigatório)</Label>
                <Textarea
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value.slice(0, 280))}
                  placeholder="Por que este evento está sendo cancelado?"
                  maxLength={280}
                  rows={3}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground text-right mt-0.5">
                  {justificativa.length}/280
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  disabled={!justificativa.trim() || cancelarMutation.isPending}
                  onClick={() => cancelarMutation.mutate()}
                >
                  {cancelarMutation.isPending ? "Cancelando..." : "Confirmar cancelamento"}
                </Button>
                <Button variant="ghost" onClick={() => setInlineAction(null)}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
