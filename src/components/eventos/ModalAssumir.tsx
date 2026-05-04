import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Evento = {
  id: string;
  id_tipo_evento: number;
  nm_tipo_evento: string;
  [key: string]: any;
};

type Motivo = {
  id: number;
  nm_motivo: string;
};

type ModalAssumirProps = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalAssumir({ evento, open, onOpenChange }: ModalAssumirProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observacaoInicio, setObservacaoInicio] = useState("");
  const [descricaoProblema, setDescricaoProblema] = useState("");
  const [motivoId, setMotivoId] = useState<string>("");
  const [observacao, setObservacao] = useState("");

  const { data: operadores } = useQuery({
    queryKey: ["operadores-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_operador")
        .select("*")
        .eq("ativo", true)
        .order("nm_operador");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: motivos, isLoading: loadingMotivos } = useQuery({
    queryKey: ["motivos-assumir", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento) return [];
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("*")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("nm_motivo");
      if (error) throw error;
      return data;
    },
    enabled: open && !!evento?.id_tipo_evento,
  });

  const assumirEvento = useMutation({
    mutationFn: async (data: { observacaoInicio: string; descricaoProblema: string }) => {
      if (!evento) return;
      
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "em_andamento",
          id_usuario_inicio: profile?.id,
          dt_inicio: new Date().toISOString(),
          observacao_inicio: data.observacaoInicio,
          ds_problema: data.descricaoProblema,
        })
        .eq("id", evento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      toast({ title: "Evento assumido com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao assumir evento", variant: "destructive" });
    },
  });

  if (!evento) return null;

  const handleSubmit = (e: React.FormEvent) => {
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assumir Evento</DialogTitle>
          <DialogDescription>
            {evento?.nm_tipo_evento || "Evento"} — Preencha os dados para assumir
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="motivo">Motivo *</Label>
            <Select value={motivoId} onValueChange={setMotivoId} required>
              <SelectTrigger>
                <SelectValue placeholder={loadingMotivos ? "Carregando..." : "Selecione o motivo"} />
              </SelectTrigger>
              <SelectContent>
                {motivos?.map((motivo) => (
                  <SelectItem key={motivo.id} value={String(motivo.id)}>
                    {motivo.nm_motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              placeholder="Descreva ações tomadas..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={280}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {observacao.length}/280
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assumirEvento.isPending || !motivoId}>
              {assumirEvento.isPending ? "Assumindo..." : "Assumir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}