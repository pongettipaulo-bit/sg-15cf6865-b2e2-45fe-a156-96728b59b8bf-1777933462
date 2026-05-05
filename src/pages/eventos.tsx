import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ModalAssumir } from "@/components/eventos/ModalAssumir";
import { ModalSemTratativa } from "@/components/eventos/ModalSemTratativa";
import { ModalCancelar } from "@/components/eventos/ModalCancelar";
import { ModalAguardar } from "@/components/eventos/ModalAguardar";
import { ModalEscalar } from "@/components/eventos/ModalEscalar";
import { ModalEncerrar } from "@/components/eventos/ModalEncerrar";
import { ModalNovoPrazo } from "@/components/eventos/ModalNovoPrazo";
import { ModalDetalhesEvento } from "@/components/eventos/ModalDetalhesEvento";

type Evento = {
  id: string;
  id_tipo_evento: number;
  id_equipamento: string;
  id_operacao?: string;
  id_operador?: string;
  id_unidade?: string;
  nm_tipo_evento: string;
  nm_equipamento: string;
  nm_operacao?: string;
  nm_operador?: string;
  nm_unidade?: string;
  nm_categoria: string;
  nm_subcategoria: string;
  criticidade: string;
  status: string;
  dt_prazo: string | null;
  dt_fim: string | null;
  dt_inicio?: string | null;
  prazo_vencido: boolean;
  nivel_escalonamento: number;
  vl_tempo_duracao_max: number;
  criado_em: string;
  observacao_inicio?: string;
  observacao_fim?: string;
  id_motivo?: number;
  motivo?: string;
  tp_encerramento?: string;
  usuario_inicio?: string;
  usuario_fim?: string;
  origem?: string;
};

type EquipMeta = {
  cd_equipamento: string;
  nm_grupo_equipamento: string | null;
};

const getCriticalityStyle = (criticidade: string): React.CSSProperties => {
  switch (criticidade) {
    case "critica": return { background: "#FCEBEB", color: "#791F1F" };
    case "alta":    return { background: "#FAEEDA", color: "#633806" };
    case "media":   return { background: "#E6F1FB", color: "#0C447C" };
    case "baixa":   return { background: "#EAF3DE", color: "#27500A" };
    default:        return { background: "#f1f5f9", color: "#64748b" };
  }
};

type ModalKey =
  | "assumir" | "semTratativa" | "cancelar" | "aguardar"
  | "escalar" | "encerrar" | "novoPrazo" | "detalhes";

export default function Eventos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>("todas");

  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  const [modalAberto, setModalAberto] = useState<ModalKey | null>(null);

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos-abertos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as Evento[];
    },
    refetchInterval: 30000,
  });

  const { data: eventosEncerrados } = useQuery({
    queryKey: ["eventos-encerrados-hoje"],
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];

      const { data: encerrados, error } = await supabase
        .from("fila_evento")
        .select(`
          *,
          dim_tipo_evento(nm_tipo_evento, criticidade),
          dim_equipamento(nm_equipamento)
        `)
        .eq("status", "encerrado")
        .gte("dt_fim", hoje)
        .order("dt_fim", { ascending: false });

      if (error) return { encerrados: 0, cancelados: 0, eventosEncerradosHoje: [] as Evento[] };

      const { count: cancelados } = await supabase
        .from("fila_evento")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelado")
        .gte("dt_fim", hoje);

      const eventosProcessados: Evento[] = (encerrados || []).map((e: any) => ({
        id: e.id,
        id_tipo_evento: e.id_tipo_evento,
        id_equipamento: e.id_equipamento,
        id_operacao: e.id_operacao,
        id_operador: e.id_operador,
        id_unidade: e.id_unidade,
        nm_tipo_evento: e.dim_tipo_evento?.nm_tipo_evento || "",
        nm_equipamento: e.dim_equipamento?.nm_equipamento || "",
        nm_operacao: "",
        nm_operador: "",
        nm_unidade: "",
        nm_categoria: "",
        nm_subcategoria: "",
        criticidade: e.dim_tipo_evento?.criticidade || "media",
        status: "encerrado",
        dt_prazo: null,
        dt_fim: e.dt_fim,
        dt_inicio: e.dt_inicio,
        prazo_vencido: false,
        nivel_escalonamento: 0,
        vl_tempo_duracao_max: 0,
        criado_em: e.criado_em,
        observacao_inicio: e.observacao_inicio,
        observacao_fim: e.observacao_fim,
        tp_encerramento: e.tp_encerramento,
        usuario_inicio: null,
        usuario_fim: null,
        motivo: null,
        origem: e.origem,
      }));

      return {
        encerrados: encerrados?.length || 0,
        cancelados: cancelados || 0,
        eventosEncerradosHoje: eventosProcessados,
      };
    },
    refetchInterval: 30000,
  });

  const { data: equipMeta } = useQuery({
    queryKey: ["equip-meta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dim_equipamento")
        .select("id, cd_equipamento, dim_grupo_equipamento(nm_grupo_equipamento)");
      const map = new Map<string, EquipMeta>();
      (data || []).forEach((e: any) => {
        map.set(e.id, {
          cd_equipamento: e.cd_equipamento,
          nm_grupo_equipamento: e.dim_grupo_equipamento?.nm_grupo_equipamento ?? null,
        });
      });
      return map;
    },
    staleTime: 300_000,
  });

  const eventosPorStatus = {
    total: eventos?.length || 0,
    pendente: eventos?.filter((e) => e.status === "pendente").length || 0,
    em_andamento: eventos?.filter((e) => e.status === "em_andamento").length || 0,
    escalado: eventos?.filter((e) => e.status === "escalado").length || 0,
    atrasado: eventos?.filter((e) => e.status === "atrasado").length || 0,
    encerrado: eventosEncerrados?.encerrados || 0,
    cancelado: eventosEncerrados?.cancelados || 0,
  };

  const todosEventos = useMemo<Evento[]>(() => {
    return [
      ...(eventos || []),
      ...(eventosEncerrados?.eventosEncerradosHoje || []),
    ];
  }, [eventos, eventosEncerrados]);

  const eventosFiltrados = useMemo(() => {
    return todosEventos.filter((e) => {
      if (filtroStatus !== "todos" && e.status !== filtroStatus) return false;
      if (filtroCriticidade !== "todas" && e.criticidade !== filtroCriticidade) return false;
      if (searchTerm) {
        const t = searchTerm.toLowerCase();
        return (
          e.nm_tipo_evento?.toLowerCase().includes(t) ||
          e.nm_equipamento?.toLowerCase().includes(t) ||
          e.nm_categoria?.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [todosEventos, filtroStatus, filtroCriticidade, searchTerm]);

  const abrir = (modal: ModalKey, evento: Evento) => {
    setEventoSelecionado(evento);
    setModalAberto(modal);
  };

  const fechar = (modal: ModalKey) => (open: boolean) => {
    if (!open) setModalAberto(null);
  };

  const EventoCard = ({ evento }: { evento: Evento }) => {
    const meta = equipMeta?.get(evento.id_equipamento);
    const isAtrasado = evento.status === "atrasado";
    const isEncerrado = evento.status === "encerrado";
    const critStyle = getCriticalityStyle(evento.criticidade);

    const dataAbertura = evento.criado_em
      ? format(new Date(evento.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
      : "—";

    const tempoDecorrido = evento.criado_em
      ? formatDistanceToNow(new Date(evento.criado_em), { addSuffix: true, locale: ptBR })
      : "";

    return (
      <div
        className={[
          "bg-card border rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow space-y-3",
          isAtrasado ? "border-l-[3px] border-l-[#E24B4A]" : "",
          isEncerrado ? "opacity-70" : "",
        ].filter(Boolean).join(" ")}
        onClick={() => abrir("detalhes", evento)}
      >
        {/* Badges */}
        <div className="flex items-start gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={critStyle}
          >
            {evento.criticidade}
          </span>
          {isAtrasado && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#E24B4A] text-white">
              atrasado
            </span>
          )}
        </div>

        {/* Nome do evento */}
        <h4 className={`font-semibold text-sm leading-snug ${isEncerrado ? "line-through text-muted-foreground" : ""}`}>
          {evento.nm_tipo_evento}
        </h4>

        {/* Detalhes */}
        <div className="text-xs space-y-0.5 text-muted-foreground">
          {meta?.cd_equipamento && (
            <p className="font-mono font-medium text-foreground">{meta.cd_equipamento}</p>
          )}
          {meta?.nm_grupo_equipamento && <p>{meta.nm_grupo_equipamento}</p>}
          {evento.nm_operacao && <p>{evento.nm_operacao}</p>}
          <p>{dataAbertura}</p>
          <p className="italic">{tempoDecorrido}</p>
        </div>

        {/* Botões — stopPropagation para não abrir o modal de detalhes */}
        <div
          className="flex gap-2 flex-wrap"
          onClick={(e) => e.stopPropagation()}
        >
          {evento.status === "pendente" && (
            <>
              <Button size="sm" onClick={() => abrir("assumir", evento)}>
                Assumir
              </Button>
              <Button size="sm" variant="outline" onClick={() => abrir("semTratativa", evento)}>
                Sem tratativa
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive hover:bg-destructive/10 text-xs px-2"
                onClick={() => abrir("cancelar", evento)}
              >
                Cancelar
              </Button>
            </>
          )}

          {evento.status === "em_andamento" && (
            <>
              <Button size="sm" variant="outline" onClick={() => abrir("aguardar", evento)}>
                Aguardar
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => abrir("escalar", evento)}
              >
                Escalar
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => abrir("encerrar", evento)}
              >
                Encerrar
              </Button>
            </>
          )}

          {evento.status === "escalado" && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white w-full"
              onClick={() => abrir("encerrar", evento)}
            >
              Encerrar
            </Button>
          )}

          {evento.status === "atrasado" && (
            <>
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => abrir("novoPrazo", evento)}
              >
                Novo Prazo
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => abrir("encerrar", evento)}
              >
                Encerrar
              </Button>
            </>
          )}

          {isEncerrado && evento.tp_encerramento && (
            <span className="text-xs text-muted-foreground">
              {evento.tp_encerramento === "tratativa"
                ? "✓ Com tratativa"
                : evento.tp_encerramento === "sem_tratativa"
                ? "○ Sem tratativa"
                : "✗ Cancelado"}
            </span>
          )}
        </div>
      </div>
    );
  };

  const colCount = (status: string) =>
    eventosFiltrados.filter((e) => e.status === status).length;

  const KanbanColumn = ({
    title,
    status,
  }: {
    title: string;
    status: string;
  }) => (
    <div className="min-w-80 flex-shrink-0">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
          {colCount(status)}
        </span>
      </div>
      <div className="space-y-3">
        {isLoading
          ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)
          : eventosFiltrados
              .filter((e) => e.status === status)
              .map((evento) => <EventoCard key={evento.id} evento={evento} />)}
        {!isLoading && colCount(status) === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhum evento
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-1">Fila de Eventos</h1>
        <p className="text-muted-foreground text-sm">Gestão de eventos operacionais</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total", value: eventosPorStatus.total, cls: "" },
          { label: "Pendentes", value: eventosPorStatus.pendente, cls: "" },
          { label: "Em andamento", value: eventosPorStatus.em_andamento, cls: "" },
          { label: "Escalados", value: eventosPorStatus.escalado, cls: "text-purple-600" },
          { label: "Atrasados", value: eventosPorStatus.atrasado, cls: "text-destructive" },
          { label: "Encerrados Hoje", value: eventosPorStatus.encerrado, cls: "text-green-600" },
          { label: "Cancelados", value: eventosPorStatus.cancelado, cls: "text-muted-foreground" },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filtroCriticidade} onValueChange={setFiltroCriticidade}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Criticidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="escalado">Escalado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban */}
      <div className="flex gap-5 overflow-x-auto pb-6">
        <KanbanColumn title="Pendente" status="pendente" />
        <KanbanColumn title="Em Andamento" status="em_andamento" />
        <KanbanColumn title="Escalado" status="escalado" />
        <KanbanColumn title="Atrasado" status="atrasado" />
        <KanbanColumn title="Encerrado Hoje" status="encerrado" />
      </div>

      {/* Modais */}
      <ModalAssumir
        evento={eventoSelecionado}
        open={modalAberto === "assumir"}
        onOpenChange={fechar("assumir")}
      />
      <ModalSemTratativa
        evento={eventoSelecionado}
        open={modalAberto === "semTratativa"}
        onOpenChange={fechar("semTratativa")}
      />
      <ModalCancelar
        evento={eventoSelecionado}
        open={modalAberto === "cancelar"}
        onOpenChange={fechar("cancelar")}
      />
      <ModalAguardar
        evento={eventoSelecionado}
        open={modalAberto === "aguardar"}
        onOpenChange={fechar("aguardar")}
      />
      <ModalEscalar
        evento={eventoSelecionado}
        open={modalAberto === "escalar"}
        onOpenChange={fechar("escalar")}
      />
      <ModalEncerrar
        evento={eventoSelecionado}
        open={modalAberto === "encerrar"}
        onOpenChange={fechar("encerrar")}
      />
      <ModalNovoPrazo
        evento={eventoSelecionado}
        open={modalAberto === "novoPrazo"}
        onOpenChange={fechar("novoPrazo")}
      />
      <ModalDetalhesEvento
        evento={eventoSelecionado}
        open={modalAberto === "detalhes"}
        onOpenChange={fechar("detalhes")}
      />
    </div>
  );
}
