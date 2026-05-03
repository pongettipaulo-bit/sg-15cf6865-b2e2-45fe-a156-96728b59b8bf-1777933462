import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Wrench } from "lucide-react";

type Equipamento = {
  id: string;
  cd_equipamento: string;
  nm_equipamento: string;
  ativo: boolean;
  nm_grupo: string;
  nm_tipo: string;
  nm_unidade: string;
  total_eventos_abertos: number;
};

type HistoricoEvento = {
  id: string;
  nm_tipo_evento: string;
  criticidade: string;
  criado_em: string;
  dt_fim: string;
  observacao_fim: string;
  duracao_minutos: number;
};

export default function Equipamentos() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState<Equipamento | null>(null);

  // Total de equipamentos ativos
  const { data: totalEquipamentos } = useQuery({
    queryKey: ["total-equipamentos"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dim_equipamento")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);

      if (error) throw error;
      return count || 0;
    },
  });

  // Equipamentos com eventos abertos (count de vw_fila_evento_aberta agrupado)
  const { data: equipamentosComEventos } = useQuery({
    queryKey: ["equipamentos-com-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("id_equipamento");

      if (error) throw error;

      // Count unique equipment IDs
      const uniqueIds = new Set(data?.map((e) => e.id_equipamento) || []);
      return uniqueIds.size;
    },
  });

  // Lista de equipamentos
  const { data: equipamentos, isLoading } = useQuery({
    queryKey: ["equipamentos-lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_equipamento")
        .select(`
          id,
          cd_equipamento,
          nm_equipamento,
          ativo,
          id_grupo_equipamento,
          id_tipo_equipamento,
          id_unidade,
          dim_grupo_equipamento(nm_grupo_equipamento),
          dim_tipo_equipamento(nm_tipo_equipamento),
          dim_unidade(nm_unidade)
        `)
        .eq("ativo", true)
        .order("cd_equipamento", { ascending: true });

      if (error) {
        console.error("Erro ao carregar equipamentos:", error);
        throw error;
      }

      console.log("Equipamentos carregados:", data?.length || 0);

      // Get event counts for each equipment from vw_fila_evento_aberta
      const { data: eventosAbertos } = await supabase
        .from("vw_fila_evento_aberta")
        .select("id_equipamento");

      const eventosPorEquipamento = eventosAbertos?.reduce((acc: Record<string, number>, e) => {
        acc[e.id_equipamento] = (acc[e.id_equipamento] || 0) + 1;
        return acc;
      }, {}) || {};

      return data.map((e: any) => ({
        id: e.id,
        cd_equipamento: e.cd_equipamento,
        nm_equipamento: e.nm_equipamento,
        ativo: e.ativo,
        nm_grupo: e.dim_grupo_equipamento?.nm_grupo_equipamento || "—",
        nm_tipo: e.dim_tipo_equipamento?.nm_tipo_equipamento || "—",
        nm_unidade: e.dim_unidade?.nm_unidade || "—",
        total_eventos_abertos: eventosPorEquipamento[e.id] || 0,
      })) as Equipamento[];
    },
  });

  // Histórico de eventos do equipamento selecionado
  const { data: historico, isLoading: loadingHistorico } = useQuery({
    queryKey: ["historico-equipamento", equipamentoSelecionado?.id],
    queryFn: async () => {
      if (!equipamentoSelecionado) return [];

      const { data, error } = await supabase
        .from("fila_evento")
        .select(`
          id,
          criado_em,
          dt_fim,
          observacao_fim,
          tipo_evento:dim_tipo_evento(nm_tipo_evento, criticidade)
        `)
        .eq("id_equipamento", equipamentoSelecionado.id)
        .eq("status", "encerrado")
        .order("dt_fim", { ascending: false })
        .limit(30);

      if (error) throw error;

      return data.map((e: any) => {
        const inicio = new Date(e.criado_em);
        const fim = new Date(e.dt_fim);
        const duracaoMs = fim.getTime() - inicio.getTime();
        const duracaoMinutos = Math.floor(duracaoMs / 1000 / 60);

        return {
          id: e.id,
          nm_tipo_evento: e.tipo_evento?.nm_tipo_evento || "",
          criticidade: e.tipo_evento?.criticidade || "media",
          criado_em: e.criado_em,
          dt_fim: e.dt_fim,
          observacao_fim: e.observacao_fim,
          duracao_minutos: duracaoMinutos,
        };
      }) as HistoricoEvento[];
    },
    enabled: !!equipamentoSelecionado,
  });

  const filteredEquipamentos = equipamentos?.filter((e) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      e.cd_equipamento.toLowerCase().includes(search) ||
      e.nm_equipamento.toLowerCase().includes(search) ||
      e.nm_grupo.toLowerCase().includes(search) ||
      e.nm_tipo.toLowerCase().includes(search)
    );
  });

  const abrirHistorico = (equipamento: Equipamento) => {
    setEquipamentoSelecionado(equipamento);
    setHistoricoOpen(true);
  };

  const getCriticalityColor = (criticidade: string) => {
    switch (criticidade.toLowerCase()) {
      case "critica":
        return "bg-red-100 text-red-800";
      case "alta":
        return "bg-orange-100 text-orange-800";
      case "media":
        return "bg-blue-100 text-blue-800";
      case "baixa":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Equipamentos</h1>
        <p className="text-muted-foreground">Monitoramento de equipamentos e histórico de eventos</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Wrench className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Equipamentos</p>
                <p className="text-3xl font-bold">{totalEquipamentos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 font-bold text-lg">!</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Com Eventos Abertos</p>
                <p className="text-3xl font-bold">{equipamentosComEventos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar equipamento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipamentos && filteredEquipamentos.length > 0 ? (
            filteredEquipamentos.map((equipamento) => (
              <Card key={equipamento.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{equipamento.nm_equipamento}</h3>
                        <p className="text-sm text-muted-foreground">
                          {equipamento.cd_equipamento}
                        </p>
                      </div>
                      {equipamento.total_eventos_abertos > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {equipamento.total_eventos_abertos}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Grupo:</span>
                        <span className="font-medium">{equipamento.nm_grupo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium">{equipamento.nm_tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unidade:</span>
                        <span className="font-medium">{equipamento.nm_unidade}</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => abrirHistorico(equipamento)}
                    >
                      Ver Histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Nenhum equipamento encontrado
            </div>
          )}
        </div>
      )}

      {/* History Drawer */}
      <Sheet open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Histórico de Eventos</SheetTitle>
            <SheetDescription>
              {equipamentoSelecionado?.nm_equipamento} — {equipamentoSelecionado?.cd_equipamento}
            </SheetDescription>
          </SheetHeader>

          {loadingHistorico ? (
            <div className="space-y-3 mt-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {historico && historico.length > 0 ? (
                historico.map((evento) => (
                  <div key={evento.id} className="border-l-4 pl-4 py-3 space-y-2" style={{
                    borderColor: evento.criticidade === "critica" ? "#791F1F" :
                                 evento.criticidade === "alta" ? "#854F0B" :
                                 evento.criticidade === "media" ? "#185FA5" : "#3B6D11"
                  }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{evento.nm_tipo_evento}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(evento.criado_em).toLocaleString("pt-BR")} →{" "}
                          {new Date(evento.dt_fim).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Badge className={getCriticalityColor(evento.criticidade)} variant="secondary">
                        {evento.criticidade.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Duração: {Math.floor(evento.duracao_minutos / 60)}h {evento.duracao_minutos % 60}min</span>
                    </div>

                    {evento.observacao_fim && (
                      <p className="text-sm bg-muted p-2 rounded">
                        {evento.observacao_fim}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum evento no histórico
                </p>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}