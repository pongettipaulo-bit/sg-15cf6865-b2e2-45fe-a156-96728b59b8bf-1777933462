import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ModalAssumirProps = {
  evento: {
    id: string;
    nm_tipo_evento: string;
    id_tipo_evento: string;
  } | null;
  open: boolean;
  onClose: () => void;
};

type Motivo = {
  id: number;
  nm_motivo: string;
  id_tipo_evento: string;
};

export function ModalAssumir({ evento, open, onClose }: ModalAssumirProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [motivoId, setMotivoId] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: motivos, isLoading: loadingMotivos } = useQuery({
    queryKey: ["motivos", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento?.id_tipo_evento) return [];

      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("*")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("nm_motivo");

      if (error) throw error;
      return data as Motivo[];
    },
    enabled: !!evento?.id_tipo_evento && open,
  });

  const assumirMutation = useMutation({
    mutationFn: async () => {
      if (!evento || !profile) return;

      const { error } = await supabase
        .from("fila_evento")
        .update({
          status: "em_andamento",
          dt_inicio: new Date().toISOString(),
          id_usuario_inicio: profile.id,
          observacao_inicio: observacao || `Assumido por ${profile.nm_usuario}`,
        })
        .eq("id", evento.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast({ title: "Evento assumido com sucesso" });
      handleClose();
    },
    onError: () => {
      toast({ title: "Erro ao assumir evento", variant: "destructive" });
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
      toast({ title: "Selecione um motivo", variant: "destructive" });
      return;
    }
    assumirMutation.mutate();
  };

  if (!evento) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assumir Evento</DialogTitle>
          <DialogDescription>{evento.nm_tipo_evento}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="motivo">Motivo *</Label>
            <Select value={motivoId} onValueChange={setMotivoId} required>
              <SelectTrigger id="motivo">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {loadingMotivos ? (
                  <SelectItem value="loading" disabled>
                    Carregando motivos...
                  </SelectItem>
                ) : motivos && motivos.length > 0 ? (
                  motivos.map((motivo) => (
                    <SelectItem key={motivo.id} value={String(motivo.id)}>
                      {motivo.nm_motivo}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="empty" disabled>
                    Nenhum motivo cadastrado para este tipo de evento
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observacao">
              Observação
              <span className="text-xs text-muted-foreground ml-2">
                {observacao.length}/280
              </span>
            </Label>
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
            <Button type="submit" disabled={assumirMutation.isPending || !motivoId}>
              {assumirMutation.isPending ? "Assumindo..." : "Assumir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}