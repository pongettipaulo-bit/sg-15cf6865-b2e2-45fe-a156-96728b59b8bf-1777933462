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

export function ModalSemTratativa({ evento, open, onOpenChange }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observacao, setObservacao] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "encerrado",
          tp_encerramento: "sem_tratativa",
          dt_fim: new Date().toISOString(),
          observacao_fim: observacao ? `Sem tratativa. ${observacao}` : "Sem tratativa.",
          id_usuario_fim: profile?.id ?? null,
        })
        .eq("id", evento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      setObservacao("");
      toast({ title: "Evento encerrado sem tratativa" });
    },
    onError: () => toast({ title: "Erro ao encerrar evento", variant: "destructive" }),
  });

  if (!evento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sem Tratativa</DialogTitle>
          <DialogDescription>
            {evento.nm_tipo_evento} — A máquina já voltou a operar normalmente?
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Observação adicional..."
              maxLength={280}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{observacao.length}/280</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Confirmando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
