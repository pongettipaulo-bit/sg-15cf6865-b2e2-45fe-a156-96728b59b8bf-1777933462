import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Props = {
  evento: {
    id: string;
    nm_tipo_evento: string;
    id_tipo_evento?: string;
    nivel_escalonamento: number;
  };
  open: boolean;
  onClose: () => void;
};

export function ModalEscalar({ evento, open, onClose }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contatoId, setContatoId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: contatos } = useQuery({
    queryKey: ["escalation-list", evento.id_tipo_evento],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("id, nm_pessoa, ds_contato")
        .eq("fg_ativo", true)
        .order("nr_ordem");

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const escalarMutation = useMutation({
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
          id_contato_acionado: contatoId,
          dt_prazo: prazo,
          nivel: evento.nivel_escalonamento + 1,
          observacao,
          observacao_inicio: observacao || `Escalado por ${profile?.nm_usuario}`,
          usuario: profile?.nm_usuario || profile?.email,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos"] });
      toast({
        title: "Evento escalado",
        description: "O contato foi notificado sobre o prazo.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao escalar evento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setContatoId("");
    setPrazo("");
    setObservacao("");
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contatoId || !prazo) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o contato e defina o prazo.",
        variant: "destructive",
      });
      return;
    }
    escalarMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Escalar Evento</DialogTitle>
          <DialogDescription>
            {evento.nm_tipo_evento} — Nível {evento.nivel_escalonamento + 1}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contato">Contato Acionado *</Label>
            <Select value={contatoId} onValueChange={setContatoId}>
              <SelectTrigger id="contato">
                <SelectValue placeholder="Selecione o contato" />
              </SelectTrigger>
              <SelectContent>
                {contatos?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nm_pessoa} — {c.ds_contato}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prazo">Prazo *</Label>
            <Input
              id="prazo"
              type="datetime-local"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
            />
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
              placeholder="Contexto adicional..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={escalarMutation.isPending}>
              {escalarMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Escalar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}