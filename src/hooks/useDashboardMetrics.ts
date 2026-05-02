import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface DashboardMetrics {
  totalAbertos: number;
  pendentes: number;
  emAndamento: number;
  escalados: number;
  atrasados: number;
  encerradosHoje: number;
  encerradosOntem: number;
  topEquipamentos: Array<{ equipamento: string; total: number }>;
  eventosPorCategoria: Array<{ categoria: string; total: number }>;
  timeline24h: Array<{ hora: string; total: number }>;
}

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: async () => {
      const agora = new Date();
      const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      const h24Atras = new Date(agora.getTime() - 24 * 60 * 60 * 1000);

      // Eventos abertos
      const { data: abertos, error: erroAbertos } = await supabase
        .from("vw_fila_evento_aberta")
        .select("id, status, nm_equipamento, nm_categoria, criado_em");

      if (erroAbertos) throw erroAbertos;

      // Eventos encerrados hoje
      const { data: encerradosHoje, error: erroHoje } = await supabase
        .from("fila_evento")
        .select("id")
        .eq("status", "encerrado")
        .gte("dt_fim", hoje.toISOString());

      if (erroHoje) throw erroHoje;

      // Eventos encerrados ontem
      const { data: encerradosOntem, error: erroOntem } = await supabase
        .from("fila_evento")
        .select("id")
        .eq("status", "encerrado")
        .gte("dt_fim", ontem.toISOString())
        .lt("dt_fim", hoje.toISOString());

      if (erroOntem) throw erroOntem;

      // Processar dados
      const metrics: DashboardMetrics = {
        totalAbertos: abertos?.length || 0,
        pendentes: abertos?.filter((e) => e.status === "pendente").length || 0,
        emAndamento: abertos?.filter((e) => e.status === "em_andamento").length || 0,
        escalados: abertos?.filter((e) => e.status === "escalado").length || 0,
        atrasados: abertos?.filter((e) => e.status === "atrasado").length || 0,
        encerradosHoje: encerradosHoje?.length || 0,
        encerradosOntem: encerradosOntem?.length || 0,
        topEquipamentos: [],
        eventosPorCategoria: [],
        timeline24h: [],
      };

      // Top 5 equipamentos
      if (abertos) {
        const equipMap = new Map<string, number>();
        abertos.forEach((e) => {
          const count = equipMap.get(e.nm_equipamento) || 0;
          equipMap.set(e.nm_equipamento, count + 1);
        });
        metrics.topEquipamentos = Array.from(equipMap.entries())
          .map(([equipamento, total]) => ({ equipamento, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
      }

      // Eventos por categoria
      if (abertos) {
        const catMap = new Map<string, number>();
        abertos.forEach((e) => {
          const cat = e.nm_categoria || "Sem categoria";
          const count = catMap.get(cat) || 0;
          catMap.set(cat, count + 1);
        });
        metrics.eventosPorCategoria = Array.from(catMap.entries()).map(
          ([categoria, total]) => ({ categoria, total })
        );
      }

      // Timeline últimas 24h
      if (abertos) {
        const timelineMap = new Map<number, number>();
        for (let i = 0; i < 24; i++) {
          timelineMap.set(i, 0);
        }

        abertos.forEach((e) => {
          const criado = new Date(e.criado_em);
          if (criado >= h24Atras) {
            const horaAtras = Math.floor((agora.getTime() - criado.getTime()) / (1000 * 60 * 60));
            if (horaAtras >= 0 && horaAtras < 24) {
              const count = timelineMap.get(horaAtras) || 0;
              timelineMap.set(horaAtras, count + 1);
            }
          }
        });

        metrics.timeline24h = Array.from(timelineMap.entries())
          .sort((a, b) => b[0] - a[0])
          .map(([horasAtras, total]) => ({
            hora: horasAtras === 0 ? "agora" : `${horasAtras}h atrás`,
            total,
          }));
      }

      return metrics;
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });
}