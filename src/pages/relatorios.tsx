import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, TrendingUp, Clock, Target, AlertTriangle } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CHART_COLORS = ["#185FA5", "#3B6D11", "#854F0B", "#791F1F", "#534AB7"];

type EventoRelatorio = {
  id: string;
  criado_em: string;
  dt_fim: string;
  nm_tipo_evento: string;
  criticidade: string;
  nm_equipamento: string;
  nm_categoria: string;
  vl_tempo_duracao_max: number;
  motivo: string | null;
};

export default function Relatorios() {
  const [periodo, setPeriodo] = useState<"hoje" | "7d" | "30d" | "custom">("7d");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["relatorios", periodo, dataInicio, dataFim],
    queryFn: async () => {
      let inicio: Date;
      let fim = endOfDay(new Date());

      if (periodo === "custom") {
        if (!dataInicio || !dataFim) return null;
        inicio = startOfDay(new Date(dataInicio));
        fim = endOfDay(new Date(dataFim));
      } else {
        inicio = startOfDay(subDays(new Date(), parseInt(periodo)));
      }

      // Buscar eventos encerrados no período
      const { data: eventos, error } = await supabase
        .from("fila_evento")
        .select("*")
        .eq("status", "encerrado")
        .gte("criado_em", inicio.toISOString())
        .lte("dt_fim", fim.toISOString())
        .order("criado_em", { ascending: false });

      if (error) throw error;

      const eventosRelatorio = eventos as EventoRelatorio[];

      // Métricas gerais
      const total = eventosRelatorio.length;
      const tempoMedio =
        total > 0
          ? eventosRelatorio.reduce((acc, ev) => {
              const duracao =
                new Date(ev.dt_fim).getTime() - new Date(ev.criado_em).getTime();
              return acc + duracao / 1000 / 60; // minutos
            }, 0) / total
          : 0;

      // Taxa no prazo (assumir SLA padrão de 60min para simplificar)
      const noPrazo = eventosRelatorio.filter(
        (ev) => ev.vl_tempo_duracao_max <= 3600
      ).length;
      const taxaNoPrazo = total > 0 ? (noPrazo / total) * 100 : 0;

      // Pior equipamento
      const equipamentosCount = eventosRelatorio.reduce(
        (acc: Record<string, number>, ev) => {
          acc[ev.nm_equipamento] = (acc[ev.nm_equipamento] || 0) + 1;
          return acc;
        },
        {}
      );
      const piorEquipamento =
        Object.keys(equipamentosCount).length > 0
          ? Object.keys(equipamentosCount).reduce((a, b) =>
              equipamentosCount[a] > equipamentosCount[b] ? a : b
            )
          : "—";

      // Eventos por dia
      const eventosPorDia = eventosRelatorio.reduce(
        (acc: Record<string, number>, ev) => {
          const dia = format(new Date(ev.criado_em), "dd/MMM", { locale: ptBR });
          acc[dia] = (acc[dia] || 0) + 1;
          return acc;
        },
        {}
      );
      const chartEventosPorDia = Object.entries(eventosPorDia).map(([dia, total]) => ({
        dia,
        total,
      }));

      // Eventos por criticidade
      const eventosPorCriticidade = eventosRelatorio.reduce(
        (acc: Record<string, number>, ev) => {
          acc[ev.criticidade] = (acc[ev.criticidade] || 0) + 1;
          return acc;
        },
        {}
      );
      const chartEventosPorCriticidade = Object.entries(eventosPorCriticidade).map(
        ([criticidade, total]) => ({ criticidade, total })
      );

      // Top 10 equipamentos
      const top10Equipamentos = Object.entries(equipamentosCount)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([equipamento, total]) => ({
          equipamento: equipamento.substring(0, 30),
          total,
        }));

      // Eventos por categoria
      const eventosPorCategoria = eventosRelatorio.reduce(
        (acc: Record<string, number>, ev) => {
          acc[ev.nm_categoria] = (acc[ev.nm_categoria] || 0) + 1;
          return acc;
        },
        {}
      );
      const chartEventosPorCategoria = Object.entries(eventosPorCategoria).map(
        ([categoria, total], index) => ({
          categoria,
          total,
          percent: total / eventosRelatorio.length,
        })
      );

      return {
        total,
        tempoMedio,
        taxaNoPrazo,
        piorEquipamento,
        chartEventosPorDia,
        chartEventosPorCriticidade,
        top10Equipamentos,
        chartEventosPorCategoria,
        eventos: eventosRelatorio,
      };
    },
  });

  const dadosPorCriticidade = [
    { name: "Crítica", value: data?.eventos?.filter((e) => (e.criticidade || "").toLowerCase() === "critica").length || 0 },
    { name: "Alta", value: data?.eventos?.filter((e) => (e.criticidade || "").toLowerCase() === "alta").length || 0 },
    { name: "Média", value: data?.eventos?.filter((e) => (e.criticidade || "").toLowerCase() === "media").length || 0 },
    { name: "Baixa", value: data?.eventos?.filter((e) => (e.criticidade || "").toLowerCase() === "baixa").length || 0 },
  ];

  const exportarCSV = () => {
    if (!data || !data.eventos) return;

    const headers = [
      "Data/Hora Criação",
      "Data/Hora Encerramento",
      "Tipo",
      "Criticidade",
      "Equipamento",
      "Categoria",
      "Duração (min)",
      "Motivo",
    ];

    const rows = data.eventos.map((ev) => [
      format(new Date(ev.criado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      format(new Date(ev.dt_fim), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      ev.nm_tipo_evento,
      ev.criticidade,
      ev.nm_equipamento,
      ev.nm_categoria,
      Math.round(ev.vl_tempo_duracao_max / 60),
      ev.motivo || "",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_eventos_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise de eventos encerrados e indicadores de performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodo} onValueChange={(value) => setPeriodo(value as "hoje" | "7d" | "30d" | "custom")}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Hoje</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodo === "custom" && (
            <>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </>
          )}

          <Button onClick={exportarCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Total de Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{Math.round(data.tempoMedio)}min</p>
          </CardContent>
        </Card>

        <Card className="border-success/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-success flex items-center gap-2">
              <Target className="w-4 h-4" />
              Taxa no Prazo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-success">
              {data.taxaNoPrazo.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Pior Equipamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-destructive truncate">
              {data.piorEquipamento}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Eventos por dia */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {data.chartEventosPorDia.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartEventosPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum evento no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos por criticidade */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos por Criticidade</CardTitle>
          </CardHeader>
          <CardContent>
            {data.chartEventosPorCriticidade.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.chartEventosPorCriticidade}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="criticidade" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum evento no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 10 equipamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Equipamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.top10Equipamentos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.top10Equipamentos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" />
                  <YAxis dataKey="equipamento" type="category" width={120} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum evento no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos por categoria */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {data.chartEventosPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.chartEventosPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) =>
                      `${entry.categoria.substring(0, 12)} (${(entry.percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {data.chartEventosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum evento no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de eventos */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Encerrados no Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.eventos.slice(0, 50).map((evento) => (
                  <TableRow key={evento.id}>
                    <TableCell className="text-sm">
                      {format(new Date(evento.criado_em), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-sm">{evento.nm_tipo_evento}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          (evento.criticidade || "media") === "critica"
                            ? "bg-destructive-bg text-destructive"
                            : (evento.criticidade || "media") === "alta"
                            ? "bg-warning-bg text-warning-dark"
                            : (evento.criticidade || "media") === "media"
                            ? "bg-primary-light text-primary-dark"
                            : "bg-success-bg text-success-dark"
                        }`}
                      >
                        {(evento.criticidade || "media").toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{evento.nm_equipamento}</TableCell>
                    <TableCell className="text-sm">{evento.nm_categoria}</TableCell>
                    <TableCell className="text-sm">
                      {Math.round(evento.vl_tempo_duracao_max / 60)}min
                    </TableCell>
                    <TableCell className="text-sm">{evento.motivo || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.eventos.length > 50 && (
            <p className="text-sm text-muted-foreground mt-4">
              Exibindo 50 de {data.eventos.length} eventos. Exporte o CSV para ver todos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}