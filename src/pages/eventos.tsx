import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Clock, AlertTriangle } from "lucide-react";
import { ModalAssumir } from "@/components/eventos/ModalAssumir";
import { ModalEscalar } from "@/components/eventos/ModalEscalar";
import { ModalEncerrar } from "@/components/eventos/ModalEncerrar";
import { ModalNovoPrazo } from "@/components/eventos/ModalNovoPrazo";

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
  criticidade: string;
  status: string;
  dt_prazo: string | null;
  dt_fim: string | null;
  prazo_vencido: boolean;
  nm_categoria: string;
  nm_subcategoria: string;
  nivel_escalonamento: number;
  vl_tempo_duracao_max: number;
  criado_em: string;
  observacao_inicio?: string;
  observacao_fim?: string;
  id_motivo?: number;
  motivo?: string;
  tp_encerramento?: string;
};

export default function Eventos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [modalAssumir, setModalAssumir] = useState(false);
  const [modalEscalar, setModalEscalar] = useState(false);
  const [modalEncerrar, setModalEncerrar] = useState(false);
  const [modalNovoPrazo, setModalNovoPrazo] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);
  
  // Filter states
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>("todas");
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroCategoria, setFiltroCategoria] = useState<string>("todas");
  const [buscaTexto, setBuscaTexto] = useState("");

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos-abertos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao carregar eventos:", error);
        throw error;
      }
      
      console.log("Eventos carregados da view:", data?.length, "eventos");
      
      return data as Evento[];
    },
    refetchInterval: 30000,
  });

  // Separate query for closed/cancelled events count (not in view)
  const { data: eventosEncerrados } = useQuery({
    queryKey: ["eventos-encerrados-hoje"],
    queryFn: async () => {
      const hoje = new Date().toISOString().split("T")[0];
      
      // Simplified query - just get IDs and basic fields
      const { data: encerrados, error: errorEncerrados } = await supabase
        .from("fila_evento")
        .select("*")
        .eq("status", "encerrado")
        .gte("dt_fim", hoje)
        .order("dt_fim", { ascending: false });

      if (errorEncerrados) {
        console.error("Erro ao carregar encerrados:", errorEncerrados);
        return { encerrados: 0, cancelados: 0, eventosEncerradosHoje: [] };
      }

      const { count: cancelados } = await supabase
        .from("fila_evento")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelado")
        .gte("dt_fim", hoje);

      // Get related data separately for each event
      const eventosComDados = await Promise.all(
        (encerrados || []).map(async (e: any) => {
          const { data: tipoEvento } = await supabase
            .from("dim_tipo_evento")
            .select("nm_tipo_evento, criticidade")
            .eq("id", e.id_tipo_evento)
            .single();

          const { data: equipamento } = await supabase
            .from("dim_equipamento")
            .select("nm_equipamento")
            .eq("id", e.id_equipamento)
            .single();

          return {
            id: e.id,
            id_tipo_evento: e.id_tipo_evento,
            id_equipamento: e.id_equipamento,
            id_operacao: e.id_operacao,
            id_operador: e.id_operador,
            id_unidade: e.id_unidade,
            nm_tipo_evento: tipoEvento?.nm_tipo_evento || "",
            nm_equipamento: equipamento?.nm_equipamento || "",
            nm_operacao: "",
            nm_operador: "",
            nm_unidade: "",
            criticidade: tipoEvento?.criticidade || "media",
            status: "encerrado",
            dt_prazo: null,
            dt_fim: e.dt_fim,
            prazo_vencido: false,
            nm_categoria: "",
            nm_subcategoria: "",
            nivel_escalonamento: 0,
            vl_tempo_duracao_max: 0,
            criado_em: e.criado_em,
            observacao_fim: e.observacao_fim,
            tp_encerramento: e.tp_encerramento,
          };
        })
      );

      return {
        encerrados: encerrados?.length || 0,
        cancelados: cancelados || 0,
        eventosEncerradosHoje: eventosComDados,
      };
    },
    refetchInterval: 30000,
  });

  const eventosFiltrados = useMemo(() => {
    let filtered = [...(eventos || [])];
    
    // Add closed events to the filtered list
    if (eventosEncerrados?.eventosEncerradosHoje) {
      filtered = [...filtered, ...eventosEncerrados.eventosEncerradosHoje];
    }

    // Apply filters
    if (filtroCriticidade !== "todas") {
      filtered = filtered.filter((e) => e.criticidade === filtroCriticidade);
    }

    if (filtroStatus !== "todos") {
      filtered = filtered.filter((e) => e.status === filtroStatus);
    }

    if (filtroCategoria !== "todas") {
      filtered = filtered.filter((e) => e.nm_categoria === filtroCategoria);
    }

    if (buscaTexto) {
      const termo = buscaTexto.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.nm_tipo_evento?.toLowerCase().includes(termo) ||
          e.nm_equipamento?.toLowerCase().includes(termo) ||
          e.nm_categoria?.toLowerCase().includes(termo)
      );
    }

    return filtered;
  }, [eventos, eventosEncerrados, filtroCriticidade, filtroStatus, filtroCategoria, buscaTexto]);

  const encerrarSemTratativa = useMutation({
    mutationFn: async (evento: Evento) => {
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "encerrado",
          tp_encerramento: "sem_tratativa",
          dt_fim: new Date().toISOString(),
          observacao_fim: "Encerrado sem tratativa",
          id_usuario_fim: profile?.id,
        })
        .eq("id", evento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      toast({ title: "Evento encerrado sem tratativa" });
    },
    onError: () => {
      toast({ title: "Erro ao encerrar evento", variant: "destructive" });
    },
  });

  const cancelarEvento = useMutation({
    mutationFn: async (evento: Evento) => {
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "cancelado",
          tp_encerramento: "cancelado",
          dt_fim: new Date().toISOString(),
          observacao_fim: "Evento cancelado",
          id_usuario_fim: profile?.id,
        })
        .eq("id", evento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      toast({ title: "Evento cancelado" });
    },
    onError: () => {
      toast({ title: "Erro ao cancelar evento", variant: "destructive" });
    },
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

  const filteredEventos = eventos?.filter((e) => {
    const matchesSearch = searchTerm === "" || 
      e.nm_tipo_evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.nm_equipamento.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "todos" || e.status === statusFilter;
    
    const showCancelled = mostrarCancelados || e.status !== "cancelado";
    
    return matchesSearch && matchesStatus && showCancelled;
  }) ?? [];

  const abrirModalAssumir = (evento: Evento) => {
    setEventoSelecionado(evento);
    setModalAssumir(true);
  };

  const abrirModalEscalar = (evento: Evento) => {
    setEventoSelecionado(evento);
    setModalEscalar(true);
  };

  const abrirModalEncerrar = (evento: Evento) => {
    setEventoSelecionado(evento);
    setModalEncerrar(true);
  };

  const abrirModalNovoPrazo = (evento: Evento) => {
    setEventoSelecionado(evento);
    setModalNovoPrazo(true);
  };

  const getCriticalityColor = (criticidade: string) => {
    switch (criticidade) {
      case "critica": return "bg-destructive-bg text-destructive";
      case "alta": return "bg-warning-bg text-[#633806]";
      case "media": return "bg-primary-light text-primary-dark";
      case "baixa": return "bg-success-bg text-[#27500A]";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-muted text-muted-foreground";
      case "em_andamento": return "bg-primary text-primary-foreground";
      case "escalado": return "bg-purple-600 text-white";
      case "atrasado": return "bg-destructive text-destructive-foreground";
      case "encerrado": return "bg-success text-white";
      case "cancelado": return "bg-gray-400 text-gray-700";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const EventoCard = ({ evento }: { evento: Evento }) => {
    const isCancelado = evento.status === "cancelado";
    
    return (
      <Card className={`${evento.status === "atrasado" ? "border-l-4 border-l-destructive" : ""} ${isCancelado ? "opacity-60" : ""}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <Badge className={getCriticalityColor(evento.criticidade)}>
              {evento.criticidade}
            </Badge>
            <Badge variant="outline" className={getStatusColor(evento.status)}>
              {evento.status}
            </Badge>
          </div>
          
          <h4 className={`font-semibold text-sm ${isCancelado ? "line-through" : ""}`}>
            {evento.nm_tipo_evento}
          </h4>
          
          <div className={`text-xs space-y-1 ${isCancelado ? "line-through" : ""}`}>
            <p className="text-muted-foreground">
              {evento.nm_equipamento}
              {evento.nm_operacao && ` — ${evento.nm_operacao}`}
            </p>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>há {Math.floor((Date.now() - new Date(evento.criado_em).getTime()) / 60000)} min</span>
            </div>
          </div>

          {evento.status === "pendente" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => abrirModalAssumir(evento)}
              >
                Assumir
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => encerrarSemTratativa.mutate(evento)}
                disabled={encerrarSemTratativa.isPending}
              >
                Sem tratativa
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => cancelarEvento.mutate(evento)}
                disabled={cancelarEvento.isPending}
              >
                Cancelar
              </Button>
            </div>
          )}

          {evento.status === "em_andamento" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrirModalEscalar(evento)}
              >
                Escalar
              </Button>
              <Button
                size="sm"
                onClick={() => abrirModalEncerrar(evento)}
              >
                Encerrar
              </Button>
            </div>
          )}

          {evento.status === "escalado" && (
            <div className="space-y-2">
              {evento.dt_prazo && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Prazo: {new Date(evento.dt_prazo).toLocaleString("pt-BR")}</span>
                </div>
              )}
              <Button
                size="sm"
                onClick={() => abrirModalEncerrar(evento)}
                className="w-full"
              >
                Encerrar
              </Button>
            </div>
          )}

          {evento.status === "atrasado" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => abrirModalNovoPrazo(evento)}
              >
                Novo Prazo
              </Button>
              <Button
                size="sm"
                onClick={() => abrirModalEncerrar(evento)}
              >
                Encerrar
              </Button>
            </div>
          )}

          {isCancelado && evento.observacao_fim && (
            <p className="text-xs text-muted-foreground italic">
              {evento.observacao_fim}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Fila de Eventos</h1>
          <p className="text-muted-foreground">Gestão de eventos operacionais</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em andamento</SelectItem>
            <SelectItem value="escalado">Escalado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            id="mostrar-cancelados"
            checked={mostrarCancelados}
            onCheckedChange={setMostrarCancelados}
          />
          <Label htmlFor="mostrar-cancelados" className="cursor-pointer">
            Mostrar cancelados
          </Label>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{eventosPorStatus.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold">{eventosPorStatus.pendente}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Em andamento</p>
            <p className="text-2xl font-bold">{eventosPorStatus.em_andamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Escalados</p>
            <p className="text-2xl font-bold">{eventosPorStatus.escalado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Atrasados</p>
            <p className="text-2xl font-bold text-destructive">{eventosPorStatus.atrasado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Encerrados Hoje</p>
            <p className="text-2xl font-bold text-success">{eventosPorStatus.encerrado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Cancelados</p>
            <p className="text-2xl font-bold text-gray-500">{eventosPorStatus.cancelado}</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {/* Pendente Column */}
        <div className="min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Pendente ({eventosFiltrados.filter((e) => e.status === "pendente").length})</h3>
          </div>
          <div className="space-y-3">
            {eventosFiltrados
              .filter((e) => e.status === "pendente")
              .map((evento) => (
                <EventoCard key={evento.id} evento={evento} />
              ))}
          </div>
        </div>

        {/* Em Andamento Column */}
        <div className="min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Em Andamento ({eventosFiltrados.filter((e) => e.status === "em_andamento").length})</h3>
          </div>
          <div className="space-y-3">
            {eventosFiltrados
              .filter((e) => e.status === "em_andamento")
              .map((evento) => (
                <EventoCard key={evento.id} evento={evento} />
              ))}
          </div>
        </div>

        {/* Escalado Column */}
        <div className="min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Escalado ({eventosFiltrados.filter((e) => e.status === "escalado").length})</h3>
          </div>
          <div className="space-y-3">
            {eventosFiltrados
              .filter((e) => e.status === "escalado")
              .map((evento) => (
                <EventoCard key={evento.id} evento={evento} />
              ))}
          </div>
        </div>

        {/* Atrasado Column */}
        <div className="min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Atrasado ({eventosFiltrados.filter((e) => e.status === "atrasado").length})</h3>
          </div>
          <div className="space-y-3">
            {eventosFiltrados
              .filter((e) => e.status === "atrasado")
              .map((evento) => (
                <EventoCard key={evento.id} evento={evento} />
              ))}
          </div>
        </div>

        {/* Encerrado Hoje Column */}
        <div className="min-w-80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Encerrado Hoje ({eventosFiltrados.filter((e) => e.status === "encerrado").length})</h3>
          </div>
          <div className="space-y-3">
            {eventosFiltrados
              .filter((e) => e.status === "encerrado")
              .map((evento) => (
                <div
                  key={evento.id}
                  className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow opacity-60"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        evento.criticidade === "critica"
                          ? "bg-destructive-bg text-destructive"
                          : evento.criticidade === "alta"
                          ? "bg-warning-bg text-[#633806]"
                          : evento.criticidade === "media"
                          ? "bg-primary-light text-primary-dark"
                          : "bg-success-bg text-[#27500A]"
                      }`}
                    >
                      {(evento.criticidade || "media").toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-semibold mb-2 line-through">{evento.nm_tipo_evento}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {evento.nm_equipamento} — {evento.nm_operacao || "—"}
                  </p>
                  <div className="flex gap-2 flex-wrap mb-3">
                    {evento.nm_categoria && (
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {evento.nm_categoria}
                      </span>
                    )}
                    {evento.nm_subcategoria && (
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {evento.nm_subcategoria}
                      </span>
                    )}
                  </div>
                  {evento.tp_encerramento && (
                    <p className="text-xs text-muted-foreground">
                      {evento.tp_encerramento === "tratativa"
                        ? "✓ Com tratativa"
                        : evento.tp_encerramento === "sem_tratativa"
                        ? "○ Sem tratativa"
                        : "✗ Cancelado"}
                    </p>
                  )}
                </div>
              ))}
            {eventosFiltrados.filter((e) => e.status === "encerrado").length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum evento encerrado hoje
              </p>
            )}
          </div>
        </div>
      </div>

      <ModalAssumir
        evento={eventoSelecionado}
        open={modalAssumir}
        onOpenChange={setModalAssumir}
      />

      <ModalEscalar
        evento={eventoSelecionado}
        open={modalEscalar}
        onOpenChange={setModalEscalar}
      />

      <ModalNovoPrazo
        evento={eventoSelecionado}
        open={modalNovoPrazo}
        onOpenChange={setModalNovoPrazo}
      />

      <ModalEncerrar
        evento={eventoSelecionado}
        open={modalEncerrar}
        onOpenChange={setModalEncerrar}
      />
    </div>
  );
}