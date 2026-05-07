import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, Play, Bell, AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { format, formatDistanceToNow, addHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ModalAssumir } from "@/components/eventos/ModalAssumir";
import { ModalEscalar } from "@/components/eventos/ModalEscalar";
import { ModalEncerrar } from "@/components/eventos/ModalEncerrar";
import { ModalNovoPrazo } from "@/components/eventos/ModalNovoPrazo";
import { ModalDetalhesEvento } from "@/components/eventos/ModalDetalhesEvento";
import { ModalCriarEvento } from "@/components/eventos/ModalCriarEvento";

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

type ModalKey = "assumir" | "escalar" | "encerrar" | "novoPrazo" | "detalhes";

export default function Eventos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>("todas");

  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  const [modalAberto, setModalAberto] = useState<ModalKey | null>(null);
  const [modalCriar, setModalCriar] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

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
          e.nm_operacao?.toLowerCase().includes(t)
        );
      }
      return true;
    });
  }, [todosEventos, filtroStatus, filtroCriticidade, searchTerm]);

  // Track last data refresh
  useEffect(() => {
    if (eventos) setLastUpdate(new Date());
  }, [eventos]);

  // Derive single unit name if all events share the same unit
  const nmUnidade = useMemo(() => {
    if (!eventos || eventos.length === 0) return null;
    const units = [...new Set(eventos.map((e) => e.nm_unidade).filter(Boolean))];
    return units.length === 1 ? (units[0] ?? null) : null;
  }, [eventos]);

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
      ? format(new Date(evento.criado_em), "dd/MM HH:mm", { locale: ptBR })
      : "—";
    const tempoDecorrido = evento.criado_em
      ? formatDistanceToNow(new Date(evento.criado_em), { addSuffix: true, locale: ptBR })
      : "";

    return (
      <div
        style={{
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderLeft: isAtrasado ? "3px solid #E24B4A" : "1px solid hsl(var(--border))",
          padding: "8px 10px",
          cursor: "pointer",
          opacity: isEncerrado ? 0.7 : 1,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
        onClick={() => abrir("detalhes", evento)}
      >
        {/* Badge */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <span style={{ ...critStyle, fontSize: 9, padding: "1px 5px" }}>
            {evento.criticidade}
          </span>
          {isAtrasado && (
            <span style={{ fontSize: 9, padding: "1px 5px", background: "rgba(226,75,74,0.15)", color: "#E24B4A" }}>
              atrasado
            </span>
          )}
        </div>

        {/* Título */}
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.3,
            textDecoration: isEncerrado ? "line-through" : "none",
            color: isEncerrado ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
          }}
        >
          {evento.nm_tipo_evento}
        </div>

        {/* Info */}
        <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
          {meta?.cd_equipamento && (
            <div className="font-mono" style={{ color: "hsl(var(--foreground))", fontWeight: 500 }}>
              {meta.cd_equipamento}
            </div>
          )}
          {meta?.nm_grupo_equipamento && <div>{meta.nm_grupo_equipamento}</div>}
          {evento.nm_operacao && <div>{evento.nm_operacao}</div>}
        </div>

        {/* Tempo */}
        <div style={{ fontSize: 9, color: "hsl(var(--muted-foreground))" }}>
          {dataAbertura} · {tempoDecorrido}
        </div>

        {/* Prazo — escalado e atrasado */}
        {(evento.status === "escalado" || evento.status === "atrasado") && evento.dt_prazo && (
          <div style={{
            fontSize: 11,
            color: evento.status === "atrasado" && evento.prazo_vencido ? "#dc2626" : "#d97706",
            fontWeight: 500,
          }}>
            {"Prazo: " + format(addHours(new Date(evento.dt_prazo), 3), "dd/MM HH:mm", { locale: ptBR })}
          </div>
        )}

        {/* Botões */}
        <div
          style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {evento.status === "pendente" && (
            <Button
              className="h-6 px-2 py-0 text-[9px] leading-none uppercase tracking-wide"
              onClick={() => abrir("assumir", evento)}
            >
              Assumir
            </Button>
          )}
          {evento.status === "em_andamento" && (
            <>
              <Button
                className="h-6 px-2 py-0 text-[9px] leading-none uppercase tracking-wide bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => abrir("escalar", evento)}
              >
                Escalar
              </Button>
              <Button
                className="h-6 px-2 py-0 text-[9px] leading-none uppercase tracking-wide bg-green-600 hover:bg-green-700 text-white"
                onClick={() => abrir("encerrar", evento)}
              >
                Encerrar
              </Button>
            </>
          )}
          {evento.status === "escalado" && (
            <Button
              className="h-6 px-2 py-0 text-[9px] leading-none uppercase tracking-wide bg-green-600 hover:bg-green-700 text-white w-full"
              onClick={() => abrir("encerrar", evento)}
            >
              Encerrar
            </Button>
          )}
          {evento.status === "atrasado" && (
            <>
              <Button
                className="h-6 px-2 py-0 text-[9px] leading-none uppercase tracking-wide bg-orange-500 hover:bg-orange-600 text-white"
                onClick={() => abrir("novoPrazo", evento)}
              >
                Novo Prazo
              </Button>
              <Button
                className="h-6 px-2 py-0 text-[9px] leading-none uppercase tracking-wide bg-green-600 hover:bg-green-700 text-white"
                onClick={() => abrir("encerrar", evento)}
              >
                Encerrar
              </Button>
            </>
          )}
          {isEncerrado && evento.tp_encerramento && (
            <span style={{ fontSize: 9, color: "hsl(var(--muted-foreground))" }}>
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
    headerBg,
    headerTextColor,
    Icon,
  }: {
    title: string;
    status: string;
    headerBg: string;
    headerTextColor: string;
    Icon: React.ElementType;
  }) => {
    const count = colCount(status);
    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid hsl(var(--border))",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 36,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "0 10px",
            borderBottom: "1px solid hsl(var(--border))",
            flexShrink: 0,
            background: headerBg,
          }}
        >
          <Icon size={13} style={{ color: headerTextColor, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: headerTextColor }}>{title}</span>
          <span
            style={{
              fontSize: 10,
              background: "rgba(0,0,0,0.12)",
              color: headerTextColor,
              padding: "0 6px",
              lineHeight: "18px",
              fontWeight: 500,
              marginLeft: "auto",
            }}
          >
            {count}
          </span>
        </div>
        {/* Cards */}
        <div
          style={{
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 4,
            overflowY: "auto",
            flex: 1,
          }}
        >
          {isLoading
            ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)
            : eventosFiltrados
                .filter((e) => e.status === status)
                .map((evento) => <EventoCard key={evento.id} evento={evento} />)}
          {!isLoading && count === 0 && (
            <div
              style={{
                fontSize: 11,
                color: "hsl(var(--muted-foreground))",
                textAlign: "center",
                paddingTop: 20,
              }}
            >
              Nenhum evento
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%" }}>
      {/* Cabeçalho */}
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "hsl(var(--foreground))" }}>
            Fila de Eventos
          </h1>
          <span style={{ fontSize: 13, color: "hsl(var(--muted-foreground))" }}>
            FieldOS
          </span>
        </div>
        <div style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>
          {`Atualizado ${formatDistanceToNow(lastUpdate, { addSuffix: true, locale: ptBR })}`}
          {" · "}
          {eventosPorStatus.atrasado > 0 ? (
            <span style={{ color: "#dc2626", fontWeight: 500 }}>
              {eventosPorStatus.atrasado}{" "}
              {eventosPorStatus.atrasado === 1 ? "atrasado" : "atrasados"}
            </span>
          ) : (
            <span>0 atrasados</span>
          )}
          {" · "}
          <span>
            {eventosPorStatus.pendente}{" "}
            {eventosPorStatus.pendente === 1 ? "pendente" : "pendentes"}
          </span>
        </div>
      </div>

      {/* Filtros + botão adicionar */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
        <div className="relative" style={{ flex: 1, maxWidth: 360 }}>
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Buscar equipamento, operação ou evento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 h-8 text-sm"
          />
        </div>
        <Select value={filtroCriticidade} onValueChange={setFiltroCriticidade}>
          <SelectTrigger className="w-36 h-8 text-sm">
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
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="escalado">Escalado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="h-8 px-3 text-sm ml-auto"
          style={{ background: "#185FA5" }}
          onClick={() => setModalCriar(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Adicionar evento
        </Button>
      </div>

      {/* Kanban — full width, no horizontal scroll */}
      <div
        style={{
          display: "flex",
          width: "100%",
          overflowX: "hidden",
          border: "1px solid hsl(var(--border))",
          flex: 1,
          minHeight: 400,
        }}
      >
        <KanbanColumn
          title="Pendente"
          status="pendente"
          headerBg="#D3D1C7"
          headerTextColor="#2C2C2A"
          Icon={Clock}
        />
        <KanbanColumn
          title="Em Andamento"
          status="em_andamento"
          headerBg="#B5D4F4"
          headerTextColor="#042C53"
          Icon={Play}
        />
        <KanbanColumn
          title="Escalado"
          status="escalado"
          headerBg="#CECBF6"
          headerTextColor="#26215C"
          Icon={Bell}
        />
        <KanbanColumn
          title="Atrasado"
          status="atrasado"
          headerBg="#F7C1C1"
          headerTextColor="#501313"
          Icon={AlertTriangle}
        />
        <KanbanColumn
          title="Encerrado Hoje"
          status="encerrado"
          headerBg="#C0DD97"
          headerTextColor="#173404"
          Icon={CheckCircle2}
        />
      </div>

      {/* Modais */}
      <ModalCriarEvento open={modalCriar} onOpenChange={setModalCriar} />
      <ModalAssumir
        evento={eventoSelecionado}
        open={modalAberto === "assumir"}
        onOpenChange={fechar("assumir")}
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
