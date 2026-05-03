import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Evento = {
  id: string;
  id_tipo_evento: number;
  nm_tipo_evento: string;
  [key: string]: any;
};

type Props = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalEncerrar({ evento, open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observacaoFim, setObservacaoFim] = useState("");

  const encerrarEvento = useMutation({
    mutationFn: async () => {
      if (!evento || !profile) return;

      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "encerrado",
          dt_fim: new Date().toISOString(),
          observacao_fim: observacaoFim || null,
          id_usuario_fim: profile.id,
          tp_encerramento: "tratativa",
        })
        .eq("id", evento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      toast({ title: "Evento encerrado com sucesso" });
      setObservacaoFim("");
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Erro ao encerrar evento", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    encerrarEvento.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar Evento</DialogTitle>
          <DialogDescription>
            {evento?.nm_tipo_evento || "Evento"} — Descreva a resolução
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="observacao_fim">Observação Final</Label>
            <Textarea
              id="observacao_fim"
              value={observacaoFim}
              onChange={(e) => setObservacaoFim(e.target.value)}
              placeholder="Descreva como o evento foi resolvido..."
              maxLength={280}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {observacaoFim.length}/280 caracteres
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={encerrarEvento.isPending}>
              {encerrarEvento.isPending ? "Encerrando..." : "Encerrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}