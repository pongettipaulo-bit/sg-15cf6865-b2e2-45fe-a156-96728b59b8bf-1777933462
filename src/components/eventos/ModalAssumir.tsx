import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Props = {
  evento: {
    id: string;
    nm_tipo_evento: string;
    id_tipo_evento?: string;
  };
  open: boolean;
  onClose: () => void;
};

export function ModalAssumir({ evento, open, onClose }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [motivoId, setMotivoId] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: motivos } = useQuery({
    queryKey: ["motivos-assumir", evento.id_tipo_evento],
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

  const assumirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "em_andamento",
          dt_inicio: new Date().toISOString(),
          usuario_inicio: profile?.nome || profile?.email,
          observacao_inicio: observacao,
          id_motivo_inicio: motivoId,
        })
        .eq("id", evento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast({
        title: "Evento assumido",
        description: "Você está trabalhando neste evento.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao assumir evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setMotivoId("");
    setObservacao("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivoId) {
      toast({
        title: "Motivo obrigatório",
        description: "Selecione o motivo para assumir este evento.",
        variant: "destructive",
      });
      return;
    }
    assumirMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assumir Evento</DialogTitle>
          <DialogDescription>
            {evento.nm_tipo_evento}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
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
              <Label htmlFor="observacao">Observação</Label>
              <span className="text-xs text-muted-foreground">
                {observacao.length}/280
              </span>
            </div>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value.slice(0, 280))}
              placeholder="Observações adicionais..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assumirMutation.isPending}>
              {assumirMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assumir
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}