import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Clock, AlertTriangle } from "lucide-react";
import { ModalAssumir } from "@/components/eventos/ModalAssumir";
import { ModalEscalar } from "@/components/eventos/ModalEscalar";
import { ModalEncerrar } from "@/components/eventos/ModalEncerrar";
import { ModalNovoPrazo } from "@/components/eventos/ModalNovoPrazo";

type Evento = {
  id: string;
  id_tipo_evento: number;
  nm_tipo_evento: string;
  criticidade: string;
  status: string;
  dt_prazo: string | null;
  dt_fim: string | null;
  prazo_vencido: boolean;
  id_equipamento: string;
  nm_equipamento: string;
  nm_operacao?: string;
  nm_categoria: string;
  nm_subcategoria: string;
  nivel_escalonamento: number;
  vl_tempo_duracao_max: number;
  criado_em: string;
  observacao_inicio?: string;
  observacao_fim?: string;
  id_motivo?: number;
  nm_motivo?: string;
};

export default function Eventos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [modalAssumir, setModalAssumir] = useState(false);
  const [modalEscalar, setModalEscalar] = useState(false);
  const [modalEncerrar, setModalEncerrar] = useState(false);
  const [modalNovoPrazo, setModalNovoPrazo] = useState(false);
  const [eventoSelecionado, setEventoSelecionado] = useState<Evento | null>(null);

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos-abertos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fila_evento")
        .select(`
          *,
          tipo_evento:dim_tipo_evento(nm_tipo_evento, criticidade),
          equipamento:dim_equipamento(nm_equipamento),
          operacao:dim_operacao(nm_operacao),
          motivo:dim_motivo_evento(nm_motivo),
          categoria:dim_tipo_evento(id_categoria),
          subcategoria:dim_tipo_evento(id_subcategoria)
        `)
        .in("status", ["pendente", "em_andamento", "escalado", "atrasado", "encerrado"])
        .order("criado_em", { ascending: false });

      if (error) {
        console.error("Erro ao carregar eventos:", error);
        throw error;
      }
      
      console.log("Eventos carregados:", data?.length, "eventos");
      console.log("Primeiro evento completo:", data?.[0]);
      
      return data.map((e: any) => ({
        id: e.id,
        id_tipo_evento: e.id_tipo_evento,
        nm_tipo_evento: e.tipo_evento?.nm_tipo_evento || "",
        criticidade: e.tipo_evento?.criticidade || "media",
        status: e.status,
        dt_prazo: e.dt_prazo,
        dt_fim: e.dt_fim,
        prazo_vencido: e.prazo_vencido || false,
        id_equipamento: e.id_equipamento,
        nm_equipamento: e.equipamento?.nm_equipamento || "",
        nm_operacao: e.operacao?.nm_operacao,
        nm_categoria: "",
        nm_subcategoria: "",
        nivel_escalonamento: e.nivel_escalonamento || 0,
        vl_tempo_duracao_max: e.vl_tempo_duracao_max || 0,
        criado_em: e.criado_em,
        observacao_inicio: e.observacao_inicio,
        observacao_fim: e.observacao_fim,
        id_motivo: e.id_motivo,
        nm_motivo: e.motivo?.nm_motivo,
      })) as Evento[];
    },
    refetchInterval: 30000,
  });

  const filteredEventos = eventos?.filter((evento) => {
    const matchesSearch = searchTerm === "" || 
      evento.nm_tipo_evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evento.nm_equipamento.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "todos" || evento.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const eventosPorStatus = {
    total: eventos?.length || 0,
    pendente: eventos?.filter((e) => e.status === "pendente").length || 0,
    em_andamento: eventos?.filter((e) => e.status === "em_andamento").length || 0,
    escalado: eventos?.filter((e) => e.status === "escalado").length || 0,
    atrasado: eventos?.filter((e) => e.status === "atrasado").length || 0,
    encerrado: eventos?.filter((e) => {
      if (e.status !== "encerrado") return false;
      if (!e.dt_fim) return false;
      const hoje = new Date().toISOString().split("T")[0];
      const dataFim = new Date(e.dt_fim).toISOString().split("T")[0];
      return dataFim === hoje;
    }).length || 0,
  };

  const getCriticidadeColor = (criticidade: string) => {
    switch (criticidade) {
      case "critica": return "bg-destructive-bg text-destructive";
      case "alta": return "bg-warning-bg text-warning";
      case "media": return "bg-primary-light text-primary-dark";
      case "baixa": return "bg-success-bg text-success";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente": return "bg-blue-100 text-blue-800";
      case "em_andamento": return "bg-yellow-100 text-yellow-800";
      case "escalado": return "bg-orange-100 text-orange-800";
      case "atrasado": return "bg-red-100 text-red-800";
      case "encerrado": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

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

  const EventoCard = ({ evento }: { evento: Evento }) => (
    <Card className={`${evento.prazo_vencido ? "border-l-4 border-l-red-600" : ""}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={getCriticidadeColor(evento.criticidade)}>
                {evento.criticidade}
              </Badge>
              <Badge variant="outline" className={getStatusColor(evento.status)}>
                {evento.status.replace("_", " ")}
              </Badge>
            </div>
            <h4 className="font-semibold text-sm truncate">{evento.nm_tipo_evento}</h4>
            <p className="text-xs text-muted-foreground truncate">
              {evento.nm_equipamento} {evento.nm_operacao ? `— ${evento.nm_operacao}` : ""}
            </p>
          </div>
          {evento.prazo_vencido && (
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
        </div>

        {evento.dt_prazo && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Prazo: {new Date(evento.dt_prazo).toLocaleString("pt-BR")}</span>
          </div>
        )}

        {evento.observacao_inicio && (
          <p className="text-xs bg-muted p-2 rounded">
            <strong>Início:</strong> {evento.observacao_inicio}
          </p>
        )}

        {evento.observacao_fim && (
          <p className="text-xs bg-muted p-2 rounded">
            <strong>Fim:</strong> {evento.observacao_fim}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
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
                onClick={() => {
                  toast({ title: "Funcionalidade em desenvolvimento" });
                }}
              >
                Sem tratativa
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  toast({ title: "Funcionalidade em desenvolvimento" });
                }}
              >
                Cancelar
              </Button>
            </div>
          )}

          {evento.status === "em_andamento" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrirModalEscalar(evento)}
              >
                Escalar
              </Button>
              <Button
                size="sm"
                variant="outline"
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
            </>
          )}

          {evento.status === "escalado" && (
            <>
              <Button
                size="sm"
                variant="outline"
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
            </>
          )}

          {evento.status === "atrasado" && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrirModalEscalar(evento)}
              >
                Escalar
              </Button>
              <Button
                size="sm"
                variant="outline"
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Fila de Eventos</h1>
        <p className="text-muted-foreground">
          Gestão de eventos operacionais em tempo real
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{eventosPorStatus.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendente</p>
            <p className="text-2xl font-bold">{eventosPorStatus.pendente}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Em Andamento</p>
            <p className="text-2xl font-bold">{eventosPorStatus.em_andamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Escalado</p>
            <p className="text-2xl font-bold">{eventosPorStatus.escalado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Atrasado</p>
            <p className="text-2xl font-bold">{eventosPorStatus.atrasado}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Encerrado Hoje</p>
            <p className="text-2xl font-bold">{eventosPorStatus.encerrado}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
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
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="escalado">Escalado</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
            <SelectItem value="encerrado">Encerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Coluna Pendente */}
          <div className="flex-1 min-w-[280px]">
            <div className="bg-muted/50 p-3 rounded-t-lg border-b-2 border-blue-600">
              <h3 className="font-semibold text-sm">
                Pendente ({eventosPorStatus.pendente})
              </h3>
            </div>
            <div className="space-y-3 p-3 min-h-[200px]">
              {filteredEventos
                .filter((e) => e.status === "pendente")
                .map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
            </div>
          </div>

          {/* Coluna Em Andamento */}
          <div className="flex-1 min-w-[280px]">
            <div className="bg-muted/50 p-3 rounded-t-lg border-b-2 border-yellow-600">
              <h3 className="font-semibold text-sm">
                Em Andamento ({eventosPorStatus.em_andamento})
              </h3>
            </div>
            <div className="space-y-3 p-3 min-h-[200px]">
              {filteredEventos
                .filter((e) => e.status === "em_andamento")
                .map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
            </div>
          </div>

          {/* Coluna Escalado */}
          <div className="flex-1 min-w-[280px]">
            <div className="bg-muted/50 p-3 rounded-t-lg border-b-2 border-orange-600">
              <h3 className="font-semibold text-sm">
                Escalado ({eventosPorStatus.escalado})
              </h3>
            </div>
            <div className="space-y-3 p-3 min-h-[200px]">
              {filteredEventos
                .filter((e) => e.status === "escalado")
                .map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
            </div>
          </div>

          {/* Coluna Atrasado */}
          <div className="flex-1 min-w-[280px]">
            <div className="bg-muted/50 p-3 rounded-t-lg border-b-2 border-red-600">
              <h3 className="font-semibold text-sm">
                Atrasado ({eventosPorStatus.atrasado})
              </h3>
            </div>
            <div className="space-y-3 p-3 min-h-[200px]">
              {filteredEventos
                .filter((e) => e.status === "atrasado")
                .map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
            </div>
          </div>

          {/* Coluna Encerrado */}
          <div className="flex-1 min-w-[280px]">
            <div className="bg-muted/50 p-3 rounded-t-lg border-b-2 border-green-600">
              <h3 className="font-semibold text-sm">
                Encerrado Hoje ({eventosPorStatus.encerrado})
              </h3>
            </div>
            <div className="space-y-3 p-3 min-h-[200px]">
              {filteredEventos
                .filter((e) => {
                  if (e.status !== "encerrado") return false;
                  if (!e.dt_fim) return false;
                  const hoje = new Date().toISOString().split("T")[0];
                  const dataFim = new Date(e.dt_fim).toISOString().split("T")[0];
                  return dataFim === hoje;
                })
                .map((evento) => (
                  <EventoCard key={evento.id} evento={evento} />
                ))}
            </div>
          </div>
        </div>
      )}

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