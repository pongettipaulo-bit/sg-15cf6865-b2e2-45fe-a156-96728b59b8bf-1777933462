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
  nm_tipo_evento: string;
  [key: string]: any;
};

type Props = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalCancelar({ evento, open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [justificativa, setJustificativa] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "cancelado",
          tp_encerramento: "cancelado",
          dt_fim: new Date().toISOString(),
          observacao_fim: justificativa,
          id_usuario_fim: profile?.id ?? null,
        })
        .eq("id", evento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      setJustificativa("");
      toast({ title: "Evento cancelado" });
    },
    onError: () => toast({ title: "Erro ao cancelar evento", variant: "destructive" }),
  });

  if (!evento) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificativa.trim()) {
      toast({ title: "Justificativa é obrigatória", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar Evento</DialogTitle>
          <DialogDescription>{evento.nm_tipo_evento}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="justificativa">Justificativa *</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que este evento está sendo cancelado?"
              maxLength={280}
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{justificativa.length}/280</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Voltar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={mutation.isPending || !justificativa.trim()}
            >
              {mutation.isPending ? "Cancelando..." : "Cancelar Evento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
