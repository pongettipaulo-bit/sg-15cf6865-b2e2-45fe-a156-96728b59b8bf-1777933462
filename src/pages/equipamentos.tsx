import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Tractor, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Equipamento = {
  id: string;
  cd_equipamento: string;
  nm_equipamento: string;
  nm_grupo: string;
  nm_tipo: string;
  fg_online: boolean;
  total_eventos_abertos: number;
};

type EventoHistorico = {
  id: string;
  criado_em: string;
  dt_fim: string | null;
  nm_tipo_evento: string;
  criticidade: string;
  status: string;
  vl_tempo_duracao_max: number;
  motivo: string | null;
};

const CRITICIDADE_COLORS = {
  critica: { bg: "bg-destructive-bg", text: "text-destructive" },
  alta: { bg: "bg-warning-bg", text: "text-warning-dark" },
  media: { bg: "bg-primary-light", text: "text-primary-dark" },
  baixa: { bg: "bg-success-bg", text: "text-success-dark" },
};

export default function Equipamentos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);
  const [selectedEquip, setSelectedEquip] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: equipamentos, isLoading } = useQuery({
    queryKey: ["equipamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_equipamento")
        .select(`
          id,
          cd_equipamento,
          nm_equipamento,
          ativo,
          fg_online,
          grupo:dim_grupo_equipamento(id, cd_grupo_equipamento, nm_grupo_equipamento),
          tipo:dim_tipo_equipamento(id, cd_tipo_equipamento, nm_tipo_equipamento),
          unidade:dim_unidade(id, cd_unidade, nm_unidade)
        `)
        .eq("ativo", true)
        .order("cd_equipamento");

      if (error) {
        console.error("Erro ao carregar equipamentos:", error);
        throw error;
      }

      console.log("Equipamentos carregados:", data?.length || 0);
      console.log("Exemplo de equipamento:", data?.[0]);

      // Get event counts for each equipment
      const equipamentosComEventos = await Promise.all(
        data.map(async (e: any) => {
          const { count } = await supabase
            .from("fila_evento")
            .select("*", { count: "exact", head: true })
            .eq("id_equipamento", e.id)
            .in("status", ["pendente", "em_andamento", "escalado", "atrasado"]);

          return {
            id: e.id,
            cd_equipamento: e.cd_equipamento,
            nm_equipamento: e.nm_equipamento,
            ativo: e.ativo,
            fg_online: e.fg_online || false,
            total_eventos_abertos: count || 0,
            nm_grupo: e.grupo?.nm_grupo_equipamento || "—",
            nm_tipo: e.tipo?.nm_tipo_equipamento || "—",
            nm_unidade: e.unidade?.nm_unidade || "—",
          };
        })
      );

      return equipamentosComEventos;
    },
  });

  const { data: historico, isLoading: isLoadingHistorico } = useQuery({
    queryKey: ["equipamento-historico", selectedEquipamento?.id],
    queryFn: async () => {
      if (!selectedEquipamento) return [];

      const dataLimite = new Date();
      dataLimite.setDate(dataLimite.getDate() - 30);

      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("*")
        .eq("id_equipamento", selectedEquipamento.id)
        .gte("criado_em", dataLimite.toISOString())
        .order("criado_em", { ascending: false });

      if (error) throw error;
      return data as EventoHistorico[];
    },
    enabled: !!selectedEquipamento,
  });

  const filteredEquipamentos = equipamentos?.filter((eq) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      eq.cd_equipamento.toLowerCase().includes(searchLower) ||
      eq.nm_equipamento.toLowerCase().includes(searchLower) ||
      eq.nm_grupo.toLowerCase().includes(searchLower) ||
      eq.nm_tipo.toLowerCase().includes(searchLower)
    );
  });

  const totalEquipamentos = equipamentos?.length || 0;
  const equipamentosOnline = equipamentos?.filter((e) => e.fg_online).length || 0;
  const equipamentosComEventos = equipamentos?.filter((e) => e.total_eventos_abertos > 0).length || 0;

  // Métricas do equipamento selecionado
  const totalEventosEquipamento = historico?.length || 0;
  const tempoMedioResolucao = historico?.reduce((acc, ev) => {
    if (ev.dt_fim) {
      const duracao = new Date(ev.dt_fim).getTime() - new Date(ev.criado_em).getTime();
      return acc + duracao / 1000 / 60; // minutos
    }
    return acc;
  }, 0) || 0;
  const criticidadeMaisFrequente = historico?.reduce((acc: Record<string, number>, ev) => {
    acc[ev.criticidade] = (acc[ev.criticidade] || 0) + 1;
    return acc;
  }, {});
  const criticidadeTop = criticidadeMaisFrequente
    ? Object.keys(criticidadeMaisFrequente).reduce((a, b) =>
        criticidadeMaisFrequente[a] > criticidadeMaisFrequente[b] ? a : b
      )
    : null;

  const formatDuracao = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}min`;
    return `${minutos}min`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Equipamentos</h1>
        <p className="text-muted-foreground">
          Monitoramento de equipamentos e histórico de eventos
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tractor className="w-4 h-4" />
              Total de Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{totalEquipamentos}</p>
          </CardContent>
        </Card>

        <Card className="border-success/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-success">{equipamentosOnline}</p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Com Eventos Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-destructive">{equipamentosComEventos}</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar equipamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Grid de equipamentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipamentos?.map((equipamento) => (
          <Card
            key={equipamento.id}
            className={`hover:shadow-md transition-shadow cursor-pointer ${
              equipamento.total_eventos_abertos > 0 ? "border-destructive/50" : ""
            }`}
            onClick={() => setSelectedEquipamento(equipamento)}
          >
            <CardContent className="p-6 space-y-4">
              {/* Nome do equipamento */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg leading-tight truncate">
                    {equipamento.nm_equipamento}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {equipamento.nm_grupo} · {equipamento.nm_tipo}
                  </p>
                </div>
                <div className="shrink-0">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      equipamento.fg_online ? "bg-success" : "bg-muted-foreground"
                    }`}
                  />
                </div>
              </div>

              {/* Status e eventos */}
              <div className="flex items-center justify-between">
                <Badge variant={equipamento.fg_online ? "default" : "outline"}>
                  {equipamento.fg_online ? "Online" : "Offline"}
                </Badge>
                {equipamento.total_eventos_abertos > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    {equipamento.total_eventos_abertos} evento
                    {equipamento.total_eventos_abertos > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              <Button variant="outline" size="sm" className="w-full">
                Ver Histórico
              </Button>
            </CardContent>
          </Card>
        ))}

        {filteredEquipamentos?.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
            <Tractor className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum equipamento encontrado</p>
          </div>
        )}
      </div>

      {/* Drawer de histórico */}
      <Sheet open={!!selectedEquipamento} onOpenChange={() => setSelectedEquipamento(null)}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{selectedEquipamento?.nm_equipamento}</SheetTitle>
            <SheetDescription>
              {selectedEquipamento?.nm_grupo} · {selectedEquipamento?.nm_tipo}
            </SheetDescription>
          </SheetHeader>

          {isLoadingHistorico ? (
            <div className="space-y-4 mt-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {/* Métricas do equipamento */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Total Eventos (30d)</p>
                    <p className="text-2xl font-semibold">{totalEventosEquipamento}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Tempo Médio</p>
                    <p className="text-2xl font-semibold">
                      {totalEventosEquipamento > 0
                        ? `${Math.round(tempoMedioResolucao / totalEventosEquipamento)}min`
                        : "—"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Criticidade Top</p>
                    {criticidadeTop ? (
                      <Badge
                        className={`${
                          CRITICIDADE_COLORS[criticidadeTop as keyof typeof CRITICIDADE_COLORS].bg
                        } ${
                          CRITICIDADE_COLORS[criticidadeTop as keyof typeof CRITICIDADE_COLORS].text
                        } border-0 mt-1`}
                      >
                        {criticidadeTop.toUpperCase()}
                      </Badge>
                    ) : (
                      <p className="text-2xl font-semibold">—</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-4">Timeline - Últimos 30 dias</h3>
                <ScrollArea className="h-[500px] pr-4">
                  {historico && historico.length > 0 ? (
                    <div className="space-y-4">
                      {historico.map((evento) => {
                        const criticidadeStyle =
                          CRITICIDADE_COLORS[evento.criticidade as keyof typeof CRITICIDADE_COLORS];
                        const foiEncerrado = evento.status === "encerrado";

                        return (
                          <div
                            key={evento.id}
                            className={`border-l-4 pl-4 py-3 ${
                              foiEncerrado ? "opacity-60" : ""
                            }`}
                            style={{
                              borderColor: criticidadeStyle
                                ? criticidadeStyle.text.replace("text-", "")
                                : "#ccc",
                            }}
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex-1">
                                <p className="font-medium leading-tight">{evento.nm_tipo_evento}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(new Date(evento.criado_em), {
                                    addSuffix: true,
                                    locale: ptBR,
                                  })}
                                </p>
                              </div>
                              <Badge
                                className={`${criticidadeStyle.bg} ${criticidadeStyle.text} border-0`}
                              >
                                {evento.criticidade.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDuracao(evento.vl_tempo_duracao_max)}</span>
                              </div>
                              {foiEncerrado && evento.motivo && (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-success" />
                                  <span className="text-success">{evento.motivo}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">
                        Nenhum evento nos últimos 30 dias
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}