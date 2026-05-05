import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
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
  nm_categoria: string;
  nm_subcategoria: string;
  criticidade: string;
  status: string;
  origem?: string;
  criado_em: string;
  dt_inicio?: string | null;
  dt_fim?: string | null;
  dt_prazo?: string | null;
  prazo_vencido?: boolean;
  nivel_escalonamento: number;
  observacao_inicio?: string;
  observacao_fim?: string;
  usuario_inicio?: string;
  usuario_fim?: string;
  motivo?: string;
  tp_encerramento?: string;
  [key: string]: any;
};

type Props = {
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

const fmtDate = (d?: string | null) =>
  d ? format(new Date(d), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";

export function ModalDetalhesEvento({ evento, open, onOpenChange }: Props) {
  const { data: equipDetalhes } = useQuery({
    queryKey: ["equip-detalhes", evento?.id_equipamento],
    queryFn: async () => {
      if (!evento?.id_equipamento) return null;
      const { data, error } = await supabase
        .from("dim_equipamento")
        .select(`
          cd_equipamento,
          nm_equipamento,
          dim_grupo_equipamento(nm_grupo_equipamento),
          dim_tipo_equipamento(nm_tipo_equipamento)
        `)
        .eq("id", evento.id_equipamento)
        .single();
      if (error) return null;
      return data;
    },
    enabled: open && !!evento?.id_equipamento,
  });

  const { data: logEscalonamento } = useQuery({
    queryKey: ["log-escalonamento", evento?.id],
    queryFn: async () => {
      if (!evento) return [];
      const { data, error } = await supabase
        .from("log_escalonamento")
        .select("*")
        .eq("id_fila_evento", evento.id)
        .order("criado_em", { ascending: false });
      if (error) return [];
      return data;
    },
    enabled: open && !!evento && (evento.nivel_escalonamento ?? 0) > 0,
  });

  if (!evento) return null;

  const grupo = (equipDetalhes as any)?.dim_grupo_equipamento?.nm_grupo_equipamento;
  const tipoEquip = (equipDetalhes as any)?.dim_tipo_equipamento?.nm_tipo_equipamento;
  const cdEquip = (equipDetalhes as any)?.cd_equipamento;

  const tempoDecorrido = evento.criado_em
    ? formatDistanceToNow(new Date(evento.criado_em), { addSuffix: true, locale: ptBR })
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Evento</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Informações do Evento */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Informações do Evento
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-muted-foreground text-xs">Tipo de Evento</p>
                <p className="font-medium">{evento.nm_tipo_evento}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Criticidade</p>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium"
                  style={criticidadeStyle(evento.criticidade)}
                >
                  {evento.criticidade}
                </span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Categoria</p>
                <p className="font-medium">{evento.nm_categoria || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Subcategoria</p>
                <p className="font-medium">{evento.nm_subcategoria || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant="outline">{evento.status}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Origem</p>
                <p className="font-mono text-xs">{evento.origem || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Abertura</p>
                <p className="font-medium">{fmtDate(evento.criado_em)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tempo decorrido</p>
                <p className="font-medium">{tempoDecorrido}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Equipamento e Operação */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Equipamento e Operação
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-muted-foreground text-xs">Equipamento</p>
                <p className="font-medium">
                  {cdEquip ? `${cdEquip} — ` : ""}{evento.nm_equipamento}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Localização (Grupo)</p>
                <p className="font-medium">{grupo || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tipo de Equipamento</p>
                <p className="font-medium">{tipoEquip || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Operador</p>
                <p className="font-medium">{evento.nm_operador || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Operação</p>
                <p className="font-medium">{evento.nm_operacao || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Unidade</p>
                <p className="font-medium">{evento.nm_unidade || "—"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Tratativa */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Tratativa
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-muted-foreground text-xs">Assumido por</p>
                <p className="font-medium">{evento.usuario_inicio || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Encerrado por</p>
                <p className="font-medium">{evento.usuario_fim || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Motivo</p>
                <p className="font-medium">{evento.motivo || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Tipo de encerramento</p>
                <p className="font-medium">{evento.tp_encerramento || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Início</p>
                <p className="font-medium">{fmtDate(evento.dt_inicio)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Fim</p>
                <p className="font-medium">{fmtDate(evento.dt_fim)}</p>
              </div>
              {evento.observacao_inicio && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Obs. início</p>
                  <p className="font-medium">{evento.observacao_inicio}</p>
                </div>
              )}
              {evento.observacao_fim && (
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Obs. fim</p>
                  <p className="font-medium">{evento.observacao_fim}</p>
                </div>
              )}
            </div>
          </div>

          {/* Escalonamento */}
          {(evento.nivel_escalonamento ?? 0) > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Escalonamento
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Nível</p>
                    <p className="font-medium">{evento.nivel_escalonamento}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Prazo</p>
                    <p className={`font-medium ${evento.prazo_vencido ? "text-destructive" : ""}`}>
                      {fmtDate(evento.dt_prazo)}
                      {evento.prazo_vencido && (
                        <span className="ml-2 text-xs">
                          <AlertTriangle className="inline w-3 h-3 mr-0.5" />vencido
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {logEscalonamento && logEscalonamento.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Histórico</p>
                    {logEscalonamento.map((log: any) => (
                      <div key={log.id} className="bg-muted rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-medium">
                            Nível {log.nivel} — {log.nm_contato || "—"}
                          </span>
                          <span className="text-muted-foreground">{fmtDate(log.criado_em)}</span>
                        </div>
                        <p className="text-muted-foreground">Prazo: {fmtDate(log.dt_prazo)}</p>
                        {log.observacao && <p>{log.observacao}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
