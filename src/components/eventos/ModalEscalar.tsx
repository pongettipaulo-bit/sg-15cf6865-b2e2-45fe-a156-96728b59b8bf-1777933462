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

  const [idContato, setIdContato] = useState<string>("");
  const [dtPrazo, setDtPrazo] = useState("");
  const [observacao, setObservacao] = useState("");

  const { data: contatos } = useQuery({
    queryKey: ["escalation-contatos", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento) return [];
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("*")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    },
    enabled: open && !!evento?.id_tipo_evento,
  });

  const escalarEvento = useMutation({
    mutationFn: async (data: { idContato: number; dtPrazo: string; observacao: string }) => {
      if (!evento) return;
      
      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          nivel_escalonamento: (evento.nivel_escalonamento || 0) + 1,
          dt_prazo: data.dtPrazo,
        })
        .eq("id", evento.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert({
          id_fila_evento: evento.id,
          id_contato: data.idContato,
          dt_escalonamento: new Date().toISOString(),
          dt_prazo: data.dtPrazo,
          nivel: (evento.nivel_escalonamento || 0) + 1,
          observacao: data.observacao,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      toast({ title: "Evento escalado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao escalar evento", variant: "destructive" });
    },
  });

  if (!evento) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    escalarEvento.mutate({ idContato: Number(idContato), dtPrazo, observacao });
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
            <Select value={idContato} onValueChange={setIdContato} required>
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
              value={dtPrazo}
              onChange={(e) => setDtPrazo(e.target.value)}
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
            <Button type="submit" disabled={escalarEvento.isPending}>
              {escalarEvento.isPending ? "Escalando..." : "Escalar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}