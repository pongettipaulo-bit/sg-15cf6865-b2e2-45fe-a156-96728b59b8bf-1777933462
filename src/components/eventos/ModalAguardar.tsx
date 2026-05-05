import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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

export function ModalAguardar({ evento, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observacao, setObservacao] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;
      const { error } = await supabase
        .from("fila_evento")
        .update({
          observacao_inicio: observacao || null,
          atualizado_em: new Date().toISOString(),
        })
        .eq("id", evento.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      onOpenChange(false);
      setObservacao("");
      toast({ title: "Observação registrada" });
    },
    onError: () => toast({ title: "Erro ao registrar observação", variant: "destructive" }),
  });

  if (!evento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aguardar</DialogTitle>
          <DialogDescription>
            {evento.nm_tipo_evento} — Registre uma observação opcional
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
              {mutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
