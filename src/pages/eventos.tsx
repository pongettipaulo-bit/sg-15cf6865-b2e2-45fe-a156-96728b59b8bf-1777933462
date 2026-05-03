import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Download, FileText, Search, Filter, Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
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

const CRITICIDADE_COLORS = {
  critica: { bg: "bg-destructive-bg", text: "text-destructive" },
  alta: { bg: "bg-warning-bg", text: "text-warning-dark" },
  media: { bg: "bg-primary-light", text: "text-primary-dark" },
  baixa: { bg: "bg-success-bg", text: "text-success-dark" },
};

const STATUS_COLUMNS = [
  { key: "pendente", label: "Pendente", color: "text-muted-foreground" },
  { key: "em_andamento", label: "Em Andamento", color: "text-primary" },
  { key: "escalado", label: "Escalado", color: "text-purple-600" },
  { key: "atrasado", label: "Atrasado", color: "text-destructive" },
  { key: "encerrado", label: "Encerrado Hoje", color: "text-success" },
];

export default function Eventos() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"kanban" | "lista" | "equipamento">("kanban");
  const [searchTerm, setSearchTerm] = useState("");
  const [criticidadeFilter, setCriticidadeFilter] = useState<string>("todas");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [equipamentoFilter, setEquipamentoFilter] = useState<string>("todos");

  // Modal states
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
      
      // Map to match expected Evento type
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

  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_categoria_evento")
        .select("nm_categoria")
        .eq("ativo", true)
        .order("nm_categoria");

      if (error) throw error;
      return data.map((c: any) => c.nm_categoria);
    },
  });

  const filteredEventos = eventos?.filter((evento) => {
    const matchSearch = searchTerm === "" || 
      evento.nm_tipo_evento.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evento.nm_equipamento.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchCriticidade = criticidadeFilter === "todas" || evento.criticidade === criticidadeFilter;
    const matchCategoria = categoriaFilter === "todas" || evento.nm_categoria === categoriaFilter;

    return matchSearch && matchCriticidade && matchCategoria;
  });

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

  const totalAbertos = eventos?.filter((e) => e.status !== "encerrado").length || 0;
  const totalPendentes = eventosPorStatus.pendente?.length || 0;
  const totalEmAndamento = eventosPorStatus.em_andamento?.length || 0;
  const totalEscalados = eventosPorStatus.escalado?.length || 0;
  const totalAtrasados = eventosPorStatus.atrasado?.length || 0;
  const totalEncerradosHoje = eventosPorStatus.encerrado?.length || 0;

  const formatDuracao = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}min`;
    return `${minutos}min`;
  };

  const getDuracaoColor = (segundos: number) => {
    if (segundos < 1800) return "text-muted-foreground"; // < 30min
    if (segundos < 3600) return "text-warning"; // 30-60min
    return "text-destructive"; // > 60min
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold">Fila de Eventos</h1>
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {totalAbertos}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4 mr-2" />
            Relatório Diário
          </Button>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo ou equipamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={criticidadeFilter} onValueChange={setCriticidadeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
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
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas Categorias</SelectItem>
            {categorias?.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{totalAbertos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-muted-foreground">{totalPendentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-primary">{totalEmAndamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Escalados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-purple-600">{totalEscalados}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">{totalAtrasados}</p>
          </CardContent>
        </Card>
        <Card className="border-success/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Encerrados Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-success">{totalEncerradosHoje}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="equipamento">Por Equipamento</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
        </TabsContent>

        <TabsContent value="lista">
          <Card>
            <CardContent className="p-0">
              <p className="p-8 text-center text-muted-foreground">
                Visualização em lista em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equipamento">
          <Card>
            <CardContent className="p-0">
              <p className="p-8 text-center text-muted-foreground">
                Visualização por equipamento em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
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