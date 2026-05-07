import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

  const criarEvento = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fila_evento").insert({
        id_tipo_evento: Number(idTipoEvento),
        id_equipamento: idEquipamento,
        id_operacao: idOperacao || null,
        id_operador: idOperador || null,
        id_unidade: idUnidade || null,
        status: "pendente",
        origem: "MANUAL_WEB",
        observacao_inicio: observacao || null,
      });
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idTipoEvento || !idEquipamento) {
      toast({
        title: "Tipo de evento e equipamento são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    criarEvento.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar Evento Manual</DialogTitle>
          <DialogDescription>Registre um evento operacional manualmente</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Evento *</Label>
            <Select value={idTipoEvento} onValueChange={setIdTipoEvento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de evento" />
              </SelectTrigger>
              <SelectContent>
                {tiposEvento?.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nm_tipo_evento}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Equipamento *</Label>
            <Select value={idEquipamento} onValueChange={setIdEquipamento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o equipamento" />
              </SelectTrigger>
              <SelectContent>
                {equipamentos?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.cd_equipamento} — {e.nm_equipamento}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Operação</Label>
              <Select value={idOperacao} onValueChange={setIdOperacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {operacoes?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nm_operacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operador</Label>
              <Select value={idOperador} onValueChange={setIdOperador}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {operadores?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nm_operador}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Unidade</Label>
            <Select value={idUnidade} onValueChange={setIdUnidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {unidades?.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nm_unidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={criarEvento.isPending}>
              {criarEvento.isPending ? "Criando..." : "Criar Evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
