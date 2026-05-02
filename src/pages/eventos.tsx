import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Plus, Download, FileText, Search, Filter } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ModalAssumir } from "@/components/eventos/ModalAssumir";
import { ModalEscalar } from "@/components/eventos/ModalEscalar";
import { ModalEncerrar } from "@/components/eventos/ModalEncerrar";
import { ModalNovoPrazo } from "@/components/eventos/ModalNovoPrazo";

type Evento = {
  id: string;
  status: string;
  criado_em: string;
  dt_prazo: string | null;
  prazo_vencido: boolean;
  nivel_escalonamento: number;
  vl_tempo_duracao_max: number;
  nm_tipo_evento: string;
  criticidade: string;
  nm_categoria: string;
  nm_subcategoria: string;
  nm_equipamento: string;
  nm_operacao: string;
  dt_inicio: string | null;
  dt_fim: string | null;
  id_tipo_evento?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [criticidadeFilter, setCriticidadeFilter] = useState<string>("todas");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");

  // Modal states
  const [modalAssumir, setModalAssumir] = useState<Evento | null>(null);
  const [modalEscalar, setModalEscalar] = useState<Evento | null>(null);
  const [modalEncerrar, setModalEncerrar] = useState<Evento | null>(null);
  const [modalNovoPrazo, setModalNovoPrazo] = useState<Evento | null>(null);

  const { data: eventos, isLoading } = useQuery({
    queryKey: ["eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data as Evento[];
    },
    refetchInterval: 10000, // Atualiza a cada 10s
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_categoria_evento")
        .select("nm_categoria")
        .eq("fg_ativo", true)
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

  const eventosPorStatus = STATUS_COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredEventos?.filter((e) => {
      if (col.key === "encerrado") {
        // Encerrados hoje
        const hoje = new Date().toISOString().split("T")[0];
        const dtFim = e.dt_fim?.split("T")[0];
        return e.status === "encerrado" && dtFim === hoje;
      }
      return e.status === col.key;
    }) || [];
    return acc;
  }, {} as Record<string, Evento[]>);

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
            {STATUS_COLUMNS.map((column) => (
              <div key={column.key} className="space-y-3">
                {/* Header da coluna */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <h3 className={`font-semibold ${column.color}`}>{column.label}</h3>
                  <Badge variant="outline">{eventosPorStatus[column.key]?.length || 0}</Badge>
                </div>

                {/* Cards de eventos */}
                <div className="space-y-3 min-h-[400px]">
                  {eventosPorStatus[column.key]?.map((evento) => {
                    const criticidadeStyle = CRITICIDADE_COLORS[evento.criticidade as keyof typeof CRITICIDADE_COLORS];
                    const tempoDecorrido = formatDistanceToNow(new Date(evento.criado_em), {
                      addSuffix: true,
                      locale: ptBR,
                    });
                    const duracao = evento.vl_tempo_duracao_max;

                    return (
                      <Card
                        key={evento.id}
                        className={`hover:shadow-md transition-shadow ${
                          evento.status === "atrasado" ? "border-l-4 border-l-destructive" : ""
                        } ${evento.status === "encerrado" ? "opacity-60" : ""}`}
                      >
                        <CardContent className="p-4 space-y-3">
                          {/* Badge criticidade */}
                          <Badge className={`${criticidadeStyle.bg} ${criticidadeStyle.text} border-0`}>
                            {evento.criticidade.toUpperCase()}
                          </Badge>

                          {/* Tipo de evento */}
                          <h4 className="font-semibold text-sm leading-tight">
                            {evento.nm_tipo_evento}
                          </h4>

                          {/* Equipamento e operação */}
                          <p className="text-xs text-muted-foreground">
                            {evento.nm_equipamento} — {evento.nm_operacao}
                          </p>

                          {/* Tempo e duração */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{tempoDecorrido}</span>
                            <span className={`font-medium ${getDuracaoColor(duracao)}`}>
                              {formatDuracao(duracao)}
                            </span>
                          </div>

                          {/* Categoria */}
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {evento.nm_categoria}
                            </Badge>
                            {evento.nm_subcategoria && (
                              <Badge variant="outline" className="text-xs">
                                {evento.nm_subcategoria}
                              </Badge>
                            )}
                          </div>

                          {/* Botões de ação */}
                          {evento.status === "pendente" && (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => setModalAssumir(evento)}
                            >
                              Assumir
                            </Button>
                          )}
                          {evento.status === "em_andamento" && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex-1"
                                onClick={() => setModalEscalar(evento)}
                              >
                                Escalar
                              </Button>
                              <Button 
                                size="sm" 
                                className="flex-1"
                                onClick={() => setModalEncerrar(evento)}
                              >
                                Encerrar
                              </Button>
                            </div>
                          )}
                          {evento.status === "escalado" && (
                            <div className="space-y-2">
                              {evento.dt_prazo && (
                                <p className="text-xs text-muted-foreground">
                                  Prazo: {formatDistanceToNow(new Date(evento.dt_prazo), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </p>
                              )}
                              <Button 
                                size="sm" 
                                className="w-full"
                                onClick={() => setModalEncerrar(evento)}
                              >
                                Encerrar
                              </Button>
                            </div>
                          )}
                          {evento.status === "atrasado" && (
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="w-full"
                              onClick={() => setModalNovoPrazo(evento)}
                            >
                              Novo Prazo
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Empty state */}
                  {eventosPorStatus[column.key]?.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                      <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground text-center">
                        Nenhum evento {column.label.toLowerCase()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
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
      {modalAssumir && (
        <ModalAssumir
          evento={modalAssumir}
          open={!!modalAssumir}
          onClose={() => setModalAssumir(null)}
        />
      )}
      {modalEscalar && (
        <ModalEscalar
          evento={modalEscalar}
          open={!!modalEscalar}
          onClose={() => setModalEscalar(null)}
        />
      )}
      {modalEncerrar && (
        <ModalEncerrar
          evento={modalEncerrar}
          open={!!modalEncerrar}
          onClose={() => setModalEncerrar(null)}
        />
      )}
      {modalNovoPrazo && (
        <ModalNovoPrazo
          evento={modalNovoPrazo}
          open={!!modalNovoPrazo}
          onClose={() => setModalNovoPrazo(null)}
        />
      )}
    </div>
  );
}