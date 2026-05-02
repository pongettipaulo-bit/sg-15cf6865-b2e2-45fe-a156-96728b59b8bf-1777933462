import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

const STATUS_COLORS = {
  pendente: "hsl(var(--muted-foreground))",
  em_andamento: "hsl(var(--primary))",
  escalado: "#534AB7",
  atrasado: "hsl(var(--destructive))",
  encerrado: "hsl(var(--success))",
};

const CHART_COLORS = ["#185FA5", "#3B6D11", "#854F0B", "#791F1F", "#534AB7"];

export default function Dashboard() {
  const { data: metrics, isLoading } = useDashboardMetrics();

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const comparativo = metrics.encerradosHoje - metrics.encerradosOntem;
  const percentualComparativo = metrics.encerradosOntem > 0
    ? ((comparativo / metrics.encerradosOntem) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral dos eventos operacionais em tempo real
        </p>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total abertos - card grande destacado */}
        <Card className="md:col-span-2 bg-primary/5 border-primary">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Total de Eventos Abertos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-semibold text-primary">{metrics.totalAbertos}</p>
          </CardContent>
        </Card>

        {/* Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-muted-foreground">
              {metrics.pendentes}
            </p>
          </CardContent>
        </Card>

        {/* Em andamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-primary">
              {metrics.emAndamento}
            </p>
          </CardContent>
        </Card>

        {/* Escalados */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Escalados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold" style={{ color: "#534AB7" }}>
              {metrics.escalados}
            </p>
          </CardContent>
        </Card>

        {/* Atrasados */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Atrasados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-destructive">
              {metrics.atrasados}
            </p>
          </CardContent>
        </Card>

        {/* Encerrados hoje vs ontem */}
        <Card className="md:col-span-2 border-success/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Encerrados Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-3">
              <p className="text-3xl font-semibold text-success">
                {metrics.encerradosHoje}
              </p>
              <div className="flex items-center gap-1 text-sm">
                {comparativo >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-success" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-destructive" />
                )}
                <span className={comparativo >= 0 ? "text-success" : "text-destructive"}>
                  {comparativo >= 0 ? "+" : ""}{comparativo} ({percentualComparativo}%)
                </span>
                <span className="text-muted-foreground">vs ontem</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 equipamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Top 5 Equipamentos com Mais Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topEquipamentos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.topEquipamentos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" />
                  <YAxis dataKey="equipamento" type="category" width={120} fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum evento aberto
              </div>
            )}
          </CardContent>
        </Card>

        {/* Eventos por categoria */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">
              Eventos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.eventosPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={metrics.eventosPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry: any) => 
                      `${entry.categoria.substring(0, 15)} (${(entry.percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {metrics.eventosPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))" 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum evento aberto
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline 24h */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Eventos nas Últimas 24 Horas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.timeline24h.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.timeline24h}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hora" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))" 
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                  name="Eventos criados"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum evento nas últimas 24 horas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}