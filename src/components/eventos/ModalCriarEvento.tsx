import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalCriarEvento({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [idTipoEvento, setIdTipoEvento] = useState("");
  const [idEquipamento, setIdEquipamento] = useState("");
  const [idOperacao, setIdOperacao] = useState("");
  const [idOperador, setIdOperador] = useState("");
  const [idUnidade, setIdUnidade] = useState("");
  const [observacao, setObservacao] = useState("");

  const [buscaTipoEvento, setBuscaTipoEvento] = useState("");
  const [openTipoEvento, setOpenTipoEvento] = useState(false);

  const [buscaEquipamento, setBuscaEquipamento] = useState("");
  const [openEquipamento, setOpenEquipamento] = useState(false);

  const [buscaOperacao, setBuscaOperacao] = useState("");
  const [openOperacao, setOpenOperacao] = useState(false);

  const [buscaOperador, setBuscaOperador] = useState("");
  const [openOperador, setOpenOperador] = useState(false);

  const [buscaUnidade, setBuscaUnidade] = useState("");
  const [openUnidade, setOpenUnidade] = useState(false);

  const { data: tiposEvento } = useQuery({
    queryKey: ["tipos-evento-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_tipo_evento")
        .select("id, nm_tipo_evento")
        .eq("ativo", true)
        .order("nm_tipo_evento");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: equipamentos } = useQuery({
    queryKey: ["equipamentos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_equipamento")
        .select("id, cd_equipamento, nm_equipamento")
        .eq("ativo", true)
        .order("cd_equipamento");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: operacoes } = useQuery({
    queryKey: ["operacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_operacao")
        .select("id, nm_operacao")
        .order("nm_operacao");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: operadores } = useQuery({
    queryKey: ["operadores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_operador")
        .select("id, nm_operador")
        .eq("ativo", true)
        .order("nm_operador");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: unidades } = useQuery({
    queryKey: ["unidades-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_unidade")
        .select("id, nm_unidade")
        .eq("ativo", true)
        .order("nm_unidade");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const tipoEventosFiltrados = tiposEvento?.filter(t =>
    (t.nm_tipo_evento ?? "").toLowerCase().includes(buscaTipoEvento.toLowerCase())
  ) ?? [];
  const tipoEventoSelecionado = tiposEvento?.find(t => String(t.id) === idTipoEvento);

  const equipamentosFiltrados = equipamentos?.filter(e =>
    `${e.cd_equipamento ?? ""} ${e.nm_equipamento ?? ""}`.toLowerCase().includes(buscaEquipamento.toLowerCase())
  ) ?? [];
  const equipamentoSelecionado = equipamentos?.find(e => String(e.id) === idEquipamento);

  const operacoesFiltradas = operacoes?.filter(o =>
    (o.nm_operacao ?? "").toLowerCase().includes(buscaOperacao.toLowerCase())
  ) ?? [];
  const operacaoSelecionada = operacoes?.find(o => String(o.id) === idOperacao);

  const operadoresFiltrados = operadores?.filter(o =>
    (o.nm_operador ?? "").toLowerCase().includes(buscaOperador.toLowerCase())
  ) ?? [];
  const operadorSelecionado = operadores?.find(o => String(o.id) === idOperador);

  const unidadesFiltradas = unidades?.filter(u =>
    (u.nm_unidade ?? "").toLowerCase().includes(buscaUnidade.toLowerCase())
  ) ?? [];
  const unidadeSelecionada = unidades?.find(u => String(u.id) === idUnidade);

  const criarEvento = useMutation({
    mutationFn: async () => {
      const payload = {
        id_tipo_evento: Number(idTipoEvento),
        id_equipamento: Number(idEquipamento),
        id_operacao: idOperacao && idOperacao !== "none" ? Number(idOperacao) : null,
        id_operador: idOperador && idOperador !== "none" ? Number(idOperador) : null,
        id_unidade: idUnidade && idUnidade !== "none" ? Number(idUnidade) : null,
        status: "pendente",
        origem: "MANUAL_WEB",
        observacao_inicio: observacao || null,
      };
      console.log("Insert payload:", payload);
      const { data, error } = await supabase.from("fila_evento").insert(payload).select();
      console.log("Supabase response:", { data, error });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      onOpenChange(false);
      resetForm();
      toast({ title: "Evento criado com sucesso" });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao criar evento",
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setIdTipoEvento("");
    setIdEquipamento("");
    setIdOperacao("");
    setIdOperador("");
    setIdUnidade("");
    setObservacao("");
  };

  const handleSubmit = () => {
    if (!idTipoEvento || !idEquipamento) {
      toast({
        title: "Tipo de evento e equipamento são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    criarEvento.mutate();
  };

  const dropdownStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 50,
    width: "100%",
    maxHeight: 200,
    overflowY: "auto",
    background: "hsl(var(--background))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    marginTop: 4,
  };

  const itemStyle: React.CSSProperties = {
    padding: "8px 12px",
    cursor: "pointer",
    fontSize: 13,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Evento Manual</DialogTitle>
          <DialogDescription>Registre um evento operacional manualmente</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo de Evento *</Label>
            <div style={{ position: "relative" }}>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Buscar tipo de evento..."
                value={openTipoEvento ? buscaTipoEvento : (tipoEventoSelecionado ? tipoEventoSelecionado.nm_tipo_evento : "")}
                onFocus={() => { setOpenTipoEvento(true); setBuscaTipoEvento(""); }}
                onBlur={() => setTimeout(() => setOpenTipoEvento(false), 150)}
                onChange={e => setBuscaTipoEvento(e.target.value)}
              />
              {openTipoEvento && tipoEventosFiltrados.length > 0 && (
                <div style={dropdownStyle}>
                  {tipoEventosFiltrados.map(t => (
                    <div
                      key={t.id}
                      style={itemStyle}
                      onMouseDown={() => { setIdTipoEvento(String(t.id)); setOpenTipoEvento(false); setBuscaTipoEvento(""); }}
                    >
                      {t.nm_tipo_evento}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Equipamento *</Label>
            <div style={{ position: "relative" }}>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Buscar equipamento..."
                value={openEquipamento ? buscaEquipamento : (equipamentoSelecionado ? `${equipamentoSelecionado.cd_equipamento} — ${equipamentoSelecionado.nm_equipamento}` : "")}
                onFocus={() => { setOpenEquipamento(true); setBuscaEquipamento(""); }}
                onBlur={() => setTimeout(() => setOpenEquipamento(false), 150)}
                onChange={e => setBuscaEquipamento(e.target.value)}
              />
              {openEquipamento && equipamentosFiltrados.length > 0 && (
                <div style={dropdownStyle}>
                  {equipamentosFiltrados.map(e => (
                    <div
                      key={e.id}
                      style={itemStyle}
                      onMouseDown={() => { setIdEquipamento(String(e.id)); setOpenEquipamento(false); setBuscaEquipamento(""); }}
                    >
                      {e.cd_equipamento} — {e.nm_equipamento}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Operação</Label>
              <div style={{ position: "relative" }}>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Buscar operação..."
                  value={openOperacao ? buscaOperacao : (operacaoSelecionada ? operacaoSelecionada.nm_operacao : "")}
                  onFocus={() => { setOpenOperacao(true); setBuscaOperacao(""); }}
                  onBlur={() => setTimeout(() => setOpenOperacao(false), 150)}
                  onChange={e => setBuscaOperacao(e.target.value)}
                />
                {openOperacao && operacoesFiltradas.length > 0 && (
                  <div style={dropdownStyle}>
                    {operacoesFiltradas.map(o => (
                      <div
                        key={o.id}
                        style={itemStyle}
                        onMouseDown={() => { setIdOperacao(String(o.id)); setOpenOperacao(false); setBuscaOperacao(""); }}
                      >
                        {o.nm_operacao}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Operador</Label>
              <div style={{ position: "relative" }}>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="Buscar operador..."
                  value={openOperador ? buscaOperador : (operadorSelecionado ? operadorSelecionado.nm_operador : "")}
                  onFocus={() => { setOpenOperador(true); setBuscaOperador(""); }}
                  onBlur={() => setTimeout(() => setOpenOperador(false), 150)}
                  onChange={e => setBuscaOperador(e.target.value)}
                />
                {openOperador && operadoresFiltrados.length > 0 && (
                  <div style={dropdownStyle}>
                    {operadoresFiltrados.map(o => (
                      <div
                        key={o.id}
                        style={itemStyle}
                        onMouseDown={() => { setIdOperador(String(o.id)); setOpenOperador(false); setBuscaOperador(""); }}
                      >
                        {o.nm_operador}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Unidade</Label>
            <div style={{ position: "relative" }}>
              <input
                className="w-full border rounded-md px-3 py-2 text-sm"
                placeholder="Buscar unidade..."
                value={openUnidade ? buscaUnidade : (unidadeSelecionada ? unidadeSelecionada.nm_unidade : "")}
                onFocus={() => { setOpenUnidade(true); setBuscaUnidade(""); }}
                onBlur={() => setTimeout(() => setOpenUnidade(false), 150)}
                onChange={e => setBuscaUnidade(e.target.value)}
              />
              {openUnidade && unidadesFiltradas.length > 0 && (
                <div style={dropdownStyle}>
                  {unidadesFiltradas.map(u => (
                    <div
                      key={u.id}
                      style={itemStyle}
                      onMouseDown={() => { setIdUnidade(String(u.id)); setOpenUnidade(false); setBuscaUnidade(""); }}
                    >
                      {u.nm_unidade}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o evento..."
              maxLength={280}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {observacao.length}/280
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={criarEvento.isPending}>
              {criarEvento.isPending ? "Criando..." : "Criar Evento"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
