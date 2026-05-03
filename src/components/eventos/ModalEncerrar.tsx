import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type Props = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalEncerrar({ evento, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [motivoId, setMotivoId] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: motivos } = useQuery({
    queryKey: ["motivos-encerrar", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento?.id_tipo_evento) return [];
      
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("id, nm_motivo")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("nm_motivo");
      if (error) throw error;
      return data as Motivo[];
    },
    enabled: !!evento?.id_tipo_evento && open,
  });

  const encerrarMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("fila_evento").update(data).eq("id", evento!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      toast({ title: "Evento encerrado com sucesso" });
      onOpenChange(false);
      setMotivoId("");
      setObservacao("");
    },
    onError: () => toast({ title: "Erro ao encerrar evento", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evento || !motivoId) return;

    encerrarMutation.mutate({
      status: "encerrado",
      dt_fim: new Date().toISOString(),
      id_motivo: Number(motivoId),
      observacao_fim: observacao || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar Evento</DialogTitle>
          <DialogDescription>
            {evento?.nm_tipo_evento || "Evento"} — Preencha os dados para encerrar
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="motivo">Motivo de Encerramento*</Label>
            <Select value={motivoId} onValueChange={setMotivoId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
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
            <Label htmlFor="observacao">Observação Final</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva a resolução..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={encerrarMutation.isPending || !motivoId}>
              {encerrarMutation.isPending ? "Encerrando..." : "Encerrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}