import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Evento = {
  id: string;
  id_tipo_evento: number;
  nm_tipo_evento: string;
  nivel_escalonamento: number;
  [key: string]: any;
};

type Contato = {
  id: number;
  nm_pessoa: string;
  contato: string;
  turno?: string;
  nivel_hierarquia: number;
};

type ModalEscalarProps = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalEscalar({ evento, open, onOpenChange }: ModalEscalarProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [contatoId, setContatoId] = useState("");
  const [prazo, setPrazo] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: contatos } = useQuery({
    queryKey: ["escalation-list", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento?.id_tipo_evento) return [];

      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("id, nm_pessoa, contato, turno, nivel_hierarquia")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as Contato[];
    },
    enabled: !!evento?.id_tipo_evento && open,
  });

  const escalarMutation = useMutation({
    mutationFn: async () => {
      if (!evento || !contatoId || !prazo || !profile?.id) return;

      const contatoSelecionado = contatos?.find((c) => String(c.id) === contatoId);
      if (!contatoSelecionado) throw new Error("Contato não encontrado");

      const novoNivel = evento.nivel_escalonamento + 1;

      // 1. Insert log_escalonamento
      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert({
          id_fila_evento: evento.id,
          nivel: novoNivel,
          dt_prazo: new Date(prazo).toISOString(),
          id_usuario: profile.id,
          nm_contato: contatoSelecionado.nm_pessoa,
          observacao: observacao || null,
        });

      if (logError) throw logError;

      // 2. Update fila_evento
      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          dt_prazo: new Date(prazo).toISOString(),
          nivel_escalonamento: novoNivel,
        })
        .eq("id", evento.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      toast({ title: "Evento escalado com sucesso" });
    },
    onError: (error) => {
      console.error("Erro ao escalar evento:", error);
      toast({ title: "Erro ao escalar evento", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setContatoId("");
    setPrazo("");
    setObservacao("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    escalarMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalar Evento</DialogTitle>
          <DialogDescription>
            {evento?.nm_tipo_evento || "Evento"} — Nível {evento?.nivel_escalonamento || 0}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contato">Contato Acionado *</Label>
            <Select value={contatoId} onValueChange={setContatoId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contato" />
              </SelectTrigger>
              <SelectContent>
                {contatos?.map((contato) => (
                  <SelectItem key={contato.id} value={String(contato.id)}>
                    {contato.nm_pessoa} {contato.turno ? `(${contato.turno})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="prazo">Prazo *</Label>
            <Input
              id="prazo"
              type="datetime-local"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Contexto adicional..."
              maxLength={280}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {observacao.length}/280
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={escalarMutation.isPending}>
              {escalarMutation.isPending ? "Escalando..." : "Escalar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}