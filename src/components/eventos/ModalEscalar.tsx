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
  turno?: string;
};

type Motivo = {
  id: number;
  nm_motivo: string;
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

  const [motivoId, setMotivoId] = useState<string>("");
  const [idContato, setIdContato] = useState<string>("");
  const [dtPrazo, setDtPrazo] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: motivos } = useQuery({
    queryKey: ["motivos-escalar", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento) return [];
      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("id, nm_motivo")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("nm_motivo");
      if (error) throw error;
      return data as Motivo[];
    },
    enabled: open && !!evento?.id_tipo_evento,
  });

  const { data: contatos } = useQuery({
    queryKey: ["escalation-contatos", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento) return [];
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("id, nm_pessoa, turno")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as Contato[];
    },
    enabled: open && !!evento?.id_tipo_evento,
  });

  const escalarEvento = useMutation({
    mutationFn: async () => {
      if (!evento) return;

      const novoNivel = (evento.nivel_escalonamento || 0) + 1;
      const contato = contatos?.find((c) => c.id === Number(idContato));

      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          nivel_escalonamento: novoNivel,
          dt_prazo: new Date(dtPrazo).toISOString(),
        })
        .eq("id", evento.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert({
          id_fila_evento: evento.id,
          nivel: novoNivel,
          dt_prazo: new Date(dtPrazo).toISOString(),
          id_usuario: profile?.id ?? null,
          nm_contato: contato?.nm_pessoa ?? null,
          observacao: observacao || null,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      setMotivoId("");
      setIdContato("");
      setDtPrazo("");
      setObservacao("");
      toast({ title: "Evento escalado com sucesso" });
    },
    onError: () => toast({ title: "Erro ao escalar evento", variant: "destructive" }),
  });

  if (!evento) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!idContato || !dtPrazo) {
      toast({ title: "Preencha contato e prazo", variant: "destructive" });
      return;
    }
    escalarEvento.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escalar Evento</DialogTitle>
          <DialogDescription>
            {evento.nm_tipo_evento} — Nível atual: {evento.nivel_escalonamento || 0}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Motivo</Label>
            <Select value={motivoId} onValueChange={setMotivoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivos?.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nm_motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Contato Acionado *</Label>
            <Select value={idContato} onValueChange={setIdContato}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contato" />
              </SelectTrigger>
              <SelectContent>
                {contatos?.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nm_pessoa}{c.turno ? ` (${c.turno})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Prazo *</Label>
            <Input
              type="datetime-local"
              value={dtPrazo}
              onChange={(e) => setDtPrazo(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Contexto adicional..."
              maxLength={280}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{observacao.length}/280</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={escalarEvento.isPending}>
              {escalarEvento.isPending ? "Escalando..." : "Escalar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
