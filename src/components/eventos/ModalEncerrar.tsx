import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

type Props = {
  evento: {
    id: string;
    nm_tipo_evento: string;
    id_tipo_evento?: string;
  };
  open: boolean;
  onClose: () => void;
};

export function ModalEncerrar({ evento, open, onClose }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [motivoId, setMotivoId] = useState("");
  const [observacao, setObservacao] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  const { data: motivos } = useQuery({
    queryKey: ["motivos-encerrar", evento.id_tipo_evento],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("id, nm_motivo")
        .eq("fg_ativo", true)
        .order("nm_motivo");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const encerrarMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "encerrado",
          dt_fim: new Date().toISOString(),
          id_usuario_fim: profile?.id,
          observacao_fim: `Encerrado por ${profile?.nm_usuario}`,
          id_motivo_fim: motivoId,
        })
        .eq("id", evento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast({
        title: "Evento encerrado",
        description: "O evento foi finalizado com sucesso.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao encerrar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setMotivoId("");
    setObservacao("");
    setConfirmado(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoId) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe como o evento foi resolvido.",
        variant: "destructive",
      });
      return;
    }
    if (!confirmado) {
      toast({
        title: "Confirmação necessária",
        description: "Confirme que o evento está resolvido.",
        variant: "destructive",
      });
      return;
    }
    encerrarMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Encerrar Evento</DialogTitle>
          <DialogDescription>
            {evento.nm_tipo_evento}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Como foi resolvido? *</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivos?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nm_motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="observacao">Observação final</Label>
              <span className="text-xs text-muted-foreground">
                {observacao.length}/280
              </span>
            </div>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value.slice(0, 280))}
              placeholder="Detalhes sobre a resolução..."
              rows={4}
            />
          </div>

          <div className="flex items-center gap-3 p-4 bg-warning-bg rounded-lg border border-warning">
            <AlertTriangle className="w-5 h-5 text-warning-dark shrink-0" />
            <div className="flex items-start gap-2">
              <Checkbox
                id="confirmacao"
                checked={confirmado}
                onCheckedChange={(checked) => setConfirmado(checked as boolean)}
                className="mt-1"
              />
              <Label htmlFor="confirmacao" className="text-sm leading-tight cursor-pointer">
                Confirmo que o evento está resolvido e pode ser encerrado
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={encerrarMutation.isPending}>
              {encerrarMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Encerrar Evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}