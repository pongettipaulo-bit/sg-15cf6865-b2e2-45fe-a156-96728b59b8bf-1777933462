import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Search, Activity, AlertCircle } from "lucide-react";

type Equipamento = {
  id: string;
  cd_equipamento: string;
  nm_equipamento: string;
  ativo: boolean;
  nm_grupo: string;
  nm_tipo: string;
  nm_unidade: string;
  fg_online: boolean;
  total_eventos_abertos: number;
};

type EventoHistorico = {
  id: string;
  nm_tipo_evento: string;
  criticidade: string;
  criado_em: string;
  dt_fim: string;
  duracao_minutos: number;
  observacao_fim: string;
};

export default function Equipamentos() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEquipamento, setSelectedEquipamento] = useState<Equipamento | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Metrics queries
  const { data: totalEquipamentos } = useQuery({
    queryKey: ["equipamentos-total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("dim_equipamento")
        .select("*", { count: "exact", head: true })
        .eq("ativo", true);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: equipamentosOnline } = useQuery({
    queryKey: ["equipamentos-online"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fato_dados")
        .select("id_equipamento, fg_online")
        .order("dt_hr_local", { ascending: false });
      
      if (error) throw error;
      
      const latestByEquipment = new Map();
      data.forEach((record: any) => {
        if (!latestByEquipment.has(record.id_equipamento)) {
          latestByEquipment.set(record.id_equipamento, record.fg_online);
        }
      });
      
      return Array.from(latestByEquipment.values()).filter(online => online === true).length;
    },
  });

  const { data: equipamentosComEventos } = useQuery({
    queryKey: ["equipamentos-com-eventos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("id_equipamento");
      
      if (error) throw error;
      
      const uniqueEquipamentos = new Set(data.map((e: any) => e.id_equipamento));
      return uniqueEquipamentos.size;
    },
  });

  // Main equipamentos query
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

      // Get online status from latest fato_dados
      const { data: fatoDados } = await supabase
        .from("fato_dados")
        .select("id_equipamento, fg_online")
        .order("dt_hr_local", { ascending: false });

      const onlineStatus = new Map();
      fatoDados?.forEach((record: any) => {
        if (!onlineStatus.has(record.id_equipamento)) {
          onlineStatus.set(record.id_equipamento, record.fg_online || false);
        }
      });

      // Get event counts from vw_fila_evento_aberta
      const { data: eventosAbertos } = await supabase
        .from("vw_fila_evento_aberta")
        .select("id_equipamento");

      const eventCounts = new Map();
      eventosAbertos?.forEach((e: any) => {
        eventCounts.set(e.id_equipamento, (eventCounts.get(e.id_equipamento) || 0) + 1);
      });

      return data.map((e: any) => ({
        id: e.id,
        cd_equipamento: e.cd_equipamento,
        nm_equipamento: e.nm_equipamento,
        ativo: e.ativo,
        nm_grupo: e.dim_grupo_equipamento?.nm_grupo_equipamento || "—",
        nm_tipo: e.dim_tipo_equipamento?.nm_tipo_equipamento || "—",
        nm_unidade: e.dim_unidade?.nm_unidade || "—",
        fg_online: onlineStatus.get(e.id) || false,
        total_eventos_abertos: eventCounts.get(e.id) || 0,
      })) as Equipamento[];
    },
  });

  // Historico query
  const { data: historico, isLoading: loadingHistorico } = useQuery({
    queryKey: ["equipamento-historico", selectedEquipamento?.id],
    queryFn: async () => {
      if (!selectedEquipamento) return [];

      const { data, error } = await supabase
        .from("fila_evento")
        .select(`
          id,
          criado_em,
          dt_fim,
          observacao_fim,
          tipo_evento:dim_tipo_evento(nm_tipo_evento, criticidade)
        `)
        .eq("id_equipamento", selectedEquipamento.id)
        .eq("status", "encerrado")
        .order("dt_fim", { ascending: false })
        .limit(30);

      if (error) throw error;

      return data.map((e: any) => {
        const inicio = new Date(e.criado_em);
        const fim = new Date(e.dt_fim);
        const duracaoMs = fim.getTime() - inicio.getTime();
        const duracaoMinutos = Math.floor(duracaoMs / 60000);

        return {
          id: e.id,
          nm_tipo_evento: e.tipo_evento?.nm_tipo_evento || "",
          criticidade: e.tipo_evento?.criticidade || "media",
          criado_em: e.criado_em,
          dt_fim: e.dt_fim,
          duracao_minutos: duracaoMinutos,
          observacao_fim: e.observacao_fim || "",
        };
      }) as EventoHistorico[];
    },
    enabled: !!selectedEquipamento,
  });

  const filteredEquipamentos = equipamentos?.filter((e) => {
    if (!e) return false;
    return searchTerm === "" || 
      String(e.cd_equipamento ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.nm_equipamento ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.nm_grupo ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(e.nm_tipo ?? "").toLowerCase().includes(searchTerm.toLowerCase());
  }) ?? [];

  const abrirHistorico = (equipamento: Equipamento) => {
    setSelectedEquipamento(equipamento);
    setDrawerOpen(true);
  };

  const formatDuracao = (minutos: number) => {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`;
  };

  const getCriticidadeColor = (criticidade: string) => {
    switch (criticidade.toLowerCase()) {
      case "critica": return "bg-red-100 text-red-800";
      case "alta": return "bg-orange-100 text-orange-800";
      case "media": return "bg-blue-100 text-blue-800";
      case "baixa": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Equipamentos</h1>
        <p className="text-muted-foreground">Monitoramento de equipamentos e histórico de eventos</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalEquipamentos || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{equipamentosOnline || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              Com Eventos Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{equipamentosComEventos || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEquipamentos.map((equipamento) => (
                <Card
                  key={equipamento.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => abrirHistorico(equipamento)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-mono text-sm text-muted-foreground">
                          {equipamento.cd_equipamento}
                        </div>
                        <div className="font-semibold">{equipamento.nm_equipamento}</div>
                      </div>
                      {equipamento.total_eventos_abertos > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {equipamento.total_eventos_abertos}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div>{equipamento.nm_grupo} - {equipamento.nm_tipo}</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${equipamento.fg_online ? "bg-green-500" : "bg-gray-400"}`} />
                        <span>{equipamento.fg_online ? "Online" : "Offline"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer Histórico */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedEquipamento?.cd_equipamento} - {selectedEquipamento?.nm_equipamento}
            </SheetTitle>
          </SheetHeader>

          {selectedEquipamento && (
            <div className="mt-6 space-y-6">
              {/* Informações */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Grupo</div>
                  <div className="font-medium">{selectedEquipamento.nm_grupo}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Tipo</div>
                  <div className="font-medium">{selectedEquipamento.nm_tipo}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Unidade</div>
                  <div className="font-medium">{selectedEquipamento.nm_unidade}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedEquipamento.fg_online ? "bg-green-500" : "bg-gray-400"}`} />
                    <span className="font-medium">{selectedEquipamento.fg_online ? "Online" : "Offline"}</span>
                  </div>
                </div>
              </div>

              {/* Histórico */}
              <div>
                <h3 className="font-semibold mb-3">Histórico de Eventos (30 dias)</h3>
                {loadingHistorico ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20" />
                    ))}
                  </div>
                ) : historico && historico.length > 0 ? (
                  <div className="space-y-3">
                    {historico.map((evento) => (
                      <Card key={evento.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium">{evento.nm_tipo_evento}</div>
                            <Badge className={getCriticidadeColor(evento.criticidade)}>
                              {evento.criticidade.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Duração: {formatDuracao(evento.duracao_minutos)}</div>
                            <div>
                              Encerrado: {new Date(evento.dt_fim).toLocaleString("pt-BR")}
                            </div>
                            {evento.observacao_fim && (
                              <div className="mt-2 text-xs italic">{evento.observacao_fim}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum evento encerrado nos últimos 30 dias</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}