import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Props = {
  evento: {
    id: string;
    nm_tipo_evento: string;
    nivel_escalonamento: number;
  };
  open: boolean;
  onClose: () => void;
};

export function ModalNovoPrazo({ evento, open, onClose }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prazo, setPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");

  const novoPrazoMutation = useMutation({
    mutationFn: async () => {
      // Update fila_evento
      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          dt_prazo: prazo,
          nivel_escalonamento: evento.nivel_escalonamento + 1,
        })
        .eq("id", evento.id);

      if (updateError) throw updateError;

      // Insert log_escalonamento
      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert({
          id_evento: evento.id,
          dt_prazo: prazo,
          nivel: evento.nivel_escalonamento + 1,
          observacao: `[NOVO PRAZO] ${justificativa}`,
          usuario: profile?.nm_usuario || profile?.email,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast({
        title: "Prazo atualizado",
        description: "O evento foi reescalonado com novo prazo.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar prazo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setPrazo("");
    setJustificativa("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prazo || !justificativa.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Defina o novo prazo e justifique o atraso.",
        variant: "destructive",
      });
      return;
    }
    novoPrazoMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Definir Novo Prazo</DialogTitle>
          <DialogDescription>
            {evento.nm_tipo_evento} — Evento atrasado
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prazo">Novo Prazo *</Label>
            <Input
              id="prazo"
              type="datetime-local"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="justificativa">Justificativa *</Label>
              <span className="text-xs text-muted-foreground">
                {justificativa.length}/280
              </span>
            </div>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value.slice(0, 280))}
              placeholder="Explique o motivo do atraso e o novo prazo..."
              rows={5}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={novoPrazoMutation.isPending}>
              {novoPrazoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Atualizar Prazo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}