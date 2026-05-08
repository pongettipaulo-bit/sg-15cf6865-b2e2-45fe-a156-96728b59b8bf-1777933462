import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Clock, Play, AlertTriangle, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pendente: "#94a3b8",
  em_andamento: "#185FA5",
  escalado: "#534AB7",
  atrasado: "#E24B4A",
  encerrado: "#3B6D11",
};

type EventoAberto = {
  id: string;
  status: string;
  nm_tipo_evento: string;
  id_equipamento: string;
  nm_equipamento: string;
  nm_operacao: string | null;
  criado_em: string;
};

export default function Dashboard() {
  const router = useRouter();

  const { data: eventosAbertos } = useQuery({
    queryKey: ["dash-eventos-abertos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("id, status, nm_tipo_evento, id_equipamento, nm_equipamento, nm_operacao, criado_em")
        .order("criado_em", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EventoAberto[];
    },
    refetchInterval: 60000,
  });

  const { data: encerradosHoje } = useQuery({
    queryKey: ["dash-encerrados-hoje"],
    queryFn: async () => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("fila_evento")
        .select("*", { count: "exact", head: true })
        .eq("status", "encerrado")
        .gte("dt_fim", d.toISOString());
      return count ?? 0;
    },
    refetchInterval: 60000,
  });

  const { data: equipMeta } = useQuery({
    queryKey: ["dash-equip-meta"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dim_equipamento")
        .select("id, cd_equipamento, dim_grupo_equipamento(nm_grupo_equipamento)");
      const map = new Map<string, { cd: string; grupo: string }>();
      (data ?? []).forEach((e: any) => {
        map.set(e.id, {
          cd: e.cd_equipamento ?? "",
          grupo: e.dim_grupo_equipamento?.nm_grupo_equipamento ?? "Sem grupo",
        });
      });
      return map;
    },
    staleTime: 300_000,
  });

  const { data: ultimas24hRaw } = useQuery({
    queryKey: ["dash-ultimas-24h"],
    queryFn: async () => {
      const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("fila_evento")
        .select("criado_em")
        .gte("criado_em", desde);
      if (error) throw error;
      return (data ?? []) as Array<{ criado_em: string }>;
    },
    refetchInterval: 60000,
  });

  const metricas = useMemo(() => {
    const ev = eventosAbertos ?? [];
    return {
      total: ev.length,
      pendente: ev.filter(e => e.status === "pendente").length,
      em_andamento: ev.filter(e => e.status === "em_andamento").length,
      escalado: ev.filter(e => e.status === "escalado").length,
      atrasado: ev.filter(e => e.status === "atrasado").length,
      encerrado: encerradosHoje ?? 0,
    };
  }, [eventosAbertos, encerradosHoje]);

  const topTipos = useMemo(() => {
    const counts: Record<string, number> = {};
    (eventosAbertos ?? []).forEach(e => {
      const t = e.nm_tipo_evento || "—";
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [eventosAbertos]);

  const atrasados = useMemo(() =>
    (eventosAbertos ?? []).filter(e => e.status === "atrasado").slice(0, 5),
    [eventosAbertos]
  );

  const porGrupo = useMemo(() => {
    const counts: Record<string, number> = {};
    (eventosAbertos ?? []).forEach(e => {
      const grupo = equipMeta?.get(e.id_equipamento)?.grupo ?? "Sem grupo";
      counts[grupo] = (counts[grupo] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [eventosAbertos, equipMeta]);

  const porHora = useMemo(() => {
    const counts = new Array(24).fill(0);
    (ultimas24hRaw ?? []).forEach(e => {
      counts[new Date(e.criado_em).getHours()]++;
    });
    return counts;
  }, [ultimas24hRaw]);

  const maxStatus = Math.max(metricas.pendente, metricas.em_andamento, metricas.escalado, metricas.atrasado, metricas.encerrado, 1);
  const maxTipo = topTipos[0]?.count || 1;
  const maxGrupo = porGrupo[0]?.count || 1;
  const maxHora = Math.max(...porHora, 1);

  const block: React.CSSProperties = {
    background: "hsl(var(--card))",
    border: "0.5px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    overflow: "hidden",
  };

  const blockTitle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "hsl(var(--muted-foreground))",
    marginBottom: 8,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <div style={{
      height: "100%",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      padding: 12,
      gap: 8,
      boxSizing: "border-box",
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0, maxHeight: 48, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2, margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>
            Visão geral dos eventos operacionais em tempo real
          </p>
        </div>
      </div>

      {/* Section 1 — 5 metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, flexShrink: 0 }}>
        {[
          { label: "Total abertos",  value: metricas.total,        color: "hsl(var(--foreground))",       icon: <AlertCircle size={18} /> },
          { label: "Pendentes",      value: metricas.pendente,     color: STATUS_COLORS.pendente,          icon: <Clock size={18} /> },
          { label: "Em andamento",   value: metricas.em_andamento, color: STATUS_COLORS.em_andamento,      icon: <Play size={18} /> },
          { label: "Atrasados",      value: metricas.atrasado,     color: metricas.atrasado > 0 ? "#E24B4A" : "hsl(var(--muted-foreground))", icon: <AlertTriangle size={18} /> },
          { label: "Encerrados hoje",value: metricas.encerrado,    color: STATUS_COLORS.encerrado,         icon: <CheckCircle2 size={18} /> },
        ].map(card => (
          <div key={card.label} style={{
            ...block,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            height: 56,
            padding: "8px 12px",
          }}>
            <span style={{ color: card.color, flexShrink: 0 }}>{card.icon}</span>
            <div>
              <div style={{ fontSize: 24, fontWeight: 500, lineHeight: 1, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Section 2 — Por status / Top eventos / Atrasados */}
      <div style={{ display: "flex", gap: 8, flex: "13 1 0", minHeight: 0 }}>
        {/* Bloco 1: Por status (40%) */}
        <div style={{ ...block, flex: 4 }}>
          <div style={blockTitle}>Por status</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
            {[
              { key: "pendente",    label: "Pendente",       count: metricas.pendente },
              { key: "em_andamento",label: "Em andamento",   count: metricas.em_andamento },
              { key: "escalado",    label: "Escalado",       count: metricas.escalado },
              { key: "atrasado",    label: "Atrasado",       count: metricas.atrasado },
              { key: "encerrado",   label: "Encerrado hoje", count: metricas.encerrado },
            ].map(s => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  color: "hsl(var(--muted-foreground))",
                  width: 90,
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}>{s.label}</span>
                <div style={{ flex: 1, height: 8, background: "hsl(var(--muted))", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(s.count / maxStatus) * 100}%`,
                    background: STATUS_COLORS[s.key] ?? "#94a3b8",
                    borderRadius: 4,
                    transition: "width 0.4s",
                  }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, width: 24, textAlign: "right", flexShrink: 0 }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bloco 2: Top tipos (30%) */}
        <div style={{ ...block, flex: 3 }}>
          <div style={blockTitle}>Top eventos</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 6 }}>
            {topTipos.length === 0
              ? <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Nenhum evento aberto</span>
              : topTipos.map((t, i) => (
                <div key={t.name} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", width: 18, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{t.count}</span>
                  </div>
                  <div style={{ marginLeft: 24, height: 4, background: "hsl(var(--muted))", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(t.count / maxTipo) * 100}%`, background: "#185FA5", borderRadius: 2 }} />
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Bloco 3: Atrasados (30%) */}
        <div style={{ ...block, flex: 3 }}>
          <div style={blockTitle}>
            Atrasados
            {metricas.atrasado > 0 && (
              <span style={{
                background: "#E24B4A",
                color: "#fff",
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 10,
                padding: "1px 6px",
              }}>
                {metricas.atrasado}
              </span>
            )}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 8 }}>
            {atrasados.length === 0
              ? <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Nenhum evento atrasado</span>
              : atrasados.map(e => {
                  const cd = equipMeta?.get(e.id_equipamento)?.cd ?? e.nm_equipamento;
                  return (
                    <div
                      key={e.id}
                      onClick={() => router.push("/eventos")}
                      style={{ borderLeft: "3px solid #E24B4A", paddingLeft: 8, cursor: "pointer" }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cd}</div>
                      <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.nm_operacao ?? "—"}
                      </div>
                      <div style={{ fontSize: 11, color: "#E24B4A" }}>
                        {formatDistanceToNow(new Date(e.criado_em), { locale: ptBR, addSuffix: true })}
                      </div>
                    </div>
                  );
                })
            }
          </div>
        </div>
      </div>

      {/* Section 3 — Por grupo / Últimas 24h */}
      <div style={{ display: "flex", gap: 8, flex: "11 1 0", minHeight: 0 }}>
        {/* Bloco 1: Por grupo (50%) */}
        <div style={{ ...block, flex: 1 }}>
          <div style={blockTitle}>Por grupo</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
            {porGrupo.length === 0
              ? <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>Sem dados</span>
              : porGrupo.map(g => (
                <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 11,
                    color: "hsl(var(--muted-foreground))",
                    width: 130,
                    flexShrink: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>{g.name}</span>
                  <div style={{ flex: 1, height: 6, background: "hsl(var(--muted))", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(g.count / maxGrupo) * 100}%`, background: "#185FA5", borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, width: 24, textAlign: "right", flexShrink: 0 }}>{g.count}</span>
                </div>
              ))
            }
          </div>
        </div>

        {/* Bloco 2: Últimas 24h (50%) */}
        <div style={{ ...block, flex: 1 }}>
          <div style={blockTitle}>Últimas 24h</div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 1 }}>
              {porHora.map((count, h) => (
                <div
                  key={h}
                  title={`${String(h).padStart(2, "0")}h: ${count}`}
                  style={{
                    flex: 1,
                    height: `${(count / maxHora) * 100}%`,
                    minHeight: count > 0 ? 2 : 0,
                    background: "#185FA5",
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.3s",
                  }}
                />
              ))}
            </div>
            <div style={{ position: "relative", height: 16, flexShrink: 0 }}>
              {[0, 4, 8, 12, 16, 20].map(h => (
                <span
                  key={h}
                  style={{
                    position: "absolute",
                    left: `${((h + 0.5) / 24) * 100}%`,
                    transform: "translateX(-50%)",
                    fontSize: 10,
                    color: "hsl(var(--muted-foreground))",
                    whiteSpace: "nowrap",
                  }}
                >
                  {String(h).padStart(2, "0")}h
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
