import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle, Tractor } from "lucide-react";

const STATUS_PRIORITY: Record<string, number> = {
  atrasado: 4,
  escalado: 3,
  em_andamento: 2,
  pendente: 1,
};

const STATUS_COLOR: Record<string, string> = {
  atrasado: "#E24B4A",
  escalado: "#534AB7",
  em_andamento: "#185FA5",
  pendente: "#94a3b8",
};

const STATUS_LABEL: Record<string, string> = {
  atrasado: "Atrasado",
  escalado: "Escalado",
  em_andamento: "Em andamento",
  pendente: "Pendente",
};

const FILTRO_LABELS: Record<string, string> = {
  todos: "Todos",
  pendente: "Pendente",
  em_andamento: "Em andamento",
  escalado: "Escalado",
  atrasado: "Atrasado",
};

type EventoAberto = {
  id: string;
  status: string;
  nm_tipo_evento: string;
  id_equipamento: string;
  nm_equipamento: string;
  criado_em: string;
};

type EquipRow = {
  id_equipamento: string;
  nm_equipamento: string;
  cd_equipamento: string;
  nm_grupo: string;
  total_eventos: number;
  status_critico: string;
  ultimo_evento: string;
};

export default function Equipamentos() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const { data: eventos } = useQuery({
    queryKey: ["equip-eventos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_fila_evento_aberta")
        .select("id, status, nm_tipo_evento, id_equipamento, nm_equipamento, criado_em")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventoAberto[];
    },
    refetchInterval: 60000,
  });

  const { data: equipMeta } = useQuery({
    queryKey: ["equip-meta-full"],
    queryFn: async () => {
      const { data } = await supabase
        .from("dim_equipamento")
        .select("id, cd_equipamento, dim_grupo_equipamento(nm_grupo_equipamento)");
      const map = new Map<string, { cd: string; grupo: string }>();
      (data ?? []).forEach((e: any) => {
        map.set(e.id, {
          cd: e.cd_equipamento ?? "",
          grupo: e.dim_grupo_equipamento?.nm_grupo_equipamento ?? "—",
        });
      });
      return map;
    },
    staleTime: 300_000,
  });

  const equipamentos = useMemo((): EquipRow[] => {
    if (!eventos) return [];

    const map: Record<string, { id_equipamento: string; nm_equipamento: string; eventos: EventoAberto[] }> = {};

    eventos.forEach(e => {
      if (!map[e.id_equipamento]) {
        map[e.id_equipamento] = { id_equipamento: e.id_equipamento, nm_equipamento: e.nm_equipamento, eventos: [] };
      }
      map[e.id_equipamento].eventos.push(e);
    });

    return Object.values(map).map(g => {
      const meta = equipMeta?.get(g.id_equipamento);

      let worstPriority = 0;
      let worstStatus = "pendente";
      g.eventos.forEach(e => {
        const p = STATUS_PRIORITY[e.status] ?? 0;
        if (p > worstPriority) { worstPriority = p; worstStatus = e.status; }
      });

      return {
        id_equipamento: g.id_equipamento,
        nm_equipamento: g.nm_equipamento,
        cd_equipamento: meta?.cd ?? "",
        nm_grupo: meta?.grupo ?? "—",
        total_eventos: g.eventos.length,
        status_critico: worstStatus,
        ultimo_evento: g.eventos[0]?.nm_tipo_evento ?? "—",
      };
    }).sort((a, b) => {
      const diff = (STATUS_PRIORITY[b.status_critico] ?? 0) - (STATUS_PRIORITY[a.status_critico] ?? 0);
      return diff !== 0 ? diff : b.total_eventos - a.total_eventos;
    });
  }, [eventos, equipMeta]);

  const totalComAtivos = equipamentos.length;
  const totalAtrasados = equipamentos.filter(e => e.status_critico === "atrasado").length;

  const filtrados = useMemo(() =>
    equipamentos.filter(e => {
      if (filtroStatus !== "todos" && e.status_critico !== filtroStatus) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          e.cd_equipamento.toLowerCase().includes(s) ||
          e.nm_equipamento.toLowerCase().includes(s)
        );
      }
      return true;
    }),
    [equipamentos, filtroStatus, searchTerm]
  );

  const cardStyle: React.CSSProperties = {
    background: "hsl(var(--card))",
    border: "0.5px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    padding: "8px 12px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 56,
    flexShrink: 0,
  };

  const colGrid = "2fr 1.5fr 80px 130px 2fr 110px";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Equipamentos</h1>
        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: 0 }}>
          Equipamentos com eventos ativos agora
        </p>
      </div>

      {/* Metric cards + busca + filtro */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={cardStyle}>
          <Tractor size={18} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1 }}>{totalComAtivos}</div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Com eventos ativos</div>
          </div>
        </div>

        <div style={cardStyle}>
          <AlertTriangle size={18} color={totalAtrasados > 0 ? "#E24B4A" : "hsl(var(--muted-foreground))"} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 500, lineHeight: 1, color: totalAtrasados > 0 ? "#E24B4A" : undefined }}>
              {totalAtrasados}
            </div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>Com eventos atrasados</div>
          </div>
        </div>

        <div style={{ flex: 1, position: "relative", minWidth: 200 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "hsl(var(--muted-foreground))" }} />
          <Input
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 13 }}
          />
        </div>

        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["todos", "pendente", "em_andamento", "escalado", "atrasado"].map(s => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 6,
                border: "0.5px solid hsl(var(--border))",
                background: filtroStatus === s
                  ? s === "todos" ? "hsl(var(--foreground))" : STATUS_COLOR[s]
                  : "hsl(var(--card))",
                color: filtroStatus === s ? "#fff" : "hsl(var(--foreground))",
                cursor: "pointer",
                fontWeight: filtroStatus === s ? 600 : 400,
              }}
            >
              {FILTRO_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div style={{
        background: "hsl(var(--card))",
        border: "0.5px solid hsl(var(--border))",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}>
        {/* Cabeçalho */}
        <div style={{
          display: "grid",
          gridTemplateColumns: colGrid,
          padding: "8px 12px 8px 15px",
          borderBottom: "1px solid hsl(var(--border))",
          background: "hsl(var(--muted) / 0.4)",
        }}>
          {["Equipamento", "Grupo", "Eventos", "Status", "Último evento", ""].map(h => (
            <span key={h} style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: "hsl(var(--muted-foreground))",
            }}>
              {h}
            </span>
          ))}
        </div>

        {filtrados.length === 0 ? (
          <div style={{ padding: "32px 12px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: 13 }}>
            Nenhum equipamento com eventos ativos
          </div>
        ) : (
          filtrados.map((e, i) => (
            <div
              key={e.id_equipamento}
              style={{
                display: "grid",
                gridTemplateColumns: colGrid,
                padding: "10px 12px",
                paddingLeft: 12,
                borderBottom: i < filtrados.length - 1 ? "1px solid hsl(var(--border) / 0.5)" : "none",
                borderLeft: `3px solid ${STATUS_COLOR[e.status_critico] ?? "#94a3b8"}`,
                background: i % 2 === 1 ? "hsl(var(--muted) / 0.15)" : "transparent",
                alignItems: "center",
                cursor: "default",
              }}
              onMouseEnter={ev => (ev.currentTarget.style.background = "hsl(var(--muted) / 0.35)")}
              onMouseLeave={ev => (ev.currentTarget.style.background = i % 2 === 1 ? "hsl(var(--muted) / 0.15)" : "transparent")}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{e.cd_equipamento || "—"}</div>
                <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.nm_equipamento}
                </div>
              </div>

              <div style={{ fontSize: 13, color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.nm_grupo}
              </div>

              <div style={{ fontSize: 13, fontWeight: 600 }}>{e.total_eventos}</div>

              <div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 10,
                  background: `${STATUS_COLOR[e.status_critico]}22`,
                  color: STATUS_COLOR[e.status_critico],
                  whiteSpace: "nowrap",
                }}>
                  {STATUS_LABEL[e.status_critico] ?? e.status_critico}
                </span>
              </div>

              <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "hsl(var(--foreground))" }}>
                {e.ultimo_evento}
              </div>

              <div>
                <Button
                  size="sm"
                  variant="outline"
                  style={{ fontSize: 12, height: 28 }}
                  onClick={() => router.push(`/eventos?eq=${encodeURIComponent(e.cd_equipamento || e.nm_equipamento)}`)}
                >
                  Ver eventos
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
