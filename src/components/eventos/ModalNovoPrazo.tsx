import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Evento = {
  id: string;
  id_tipo_evento: number;
  nm_tipo_evento?: string;
  nivel_escalonamento: number;
};

type Contato = {
  id: number;
  nm_pessoa: string;
  turno?: string;
};

type ModalNovoPrazoProps = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalNovoPrazo({ evento, open, onOpenChange }: ModalNovoPrazoProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [novoPrazo, setNovoPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [contatoSelecionado, setContatoSelecionado] = useState<string>("");

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

  const definirNovoPrazo = useMutation({
    mutationFn: async () => {
      if (!evento) return;

      const novoNivel = (evento.nivel_escalonamento ?? 0) + 1;
      const contatoId = contatoSelecionado ? Number(contatoSelecionado) : null;
      const contato = contatos?.find((c) => c.id === contatoId);

      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          dt_prazo: novoPrazo,
          nivel_escalonamento: novoNivel,
          prazo_vencido: false,
        })
        .eq("id", evento.id);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert({
          id_fila_evento: evento.id,
          nivel: novoNivel,
          dt_prazo: novoPrazo,
          id_usuario: profile?.id ?? null,
          nm_contato: contato?.nm_pessoa ?? null,
          observacao: justificativa || null,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      setNovoPrazo("");
      setJustificativa("");
      setContatoSelecionado("");
      toast({ title: "Novo prazo definido com sucesso" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao definir novo prazo",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  if (!evento) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPrazo || !justificativa || !contatoSelecionado) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    definirNovoPrazo.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Novo Prazo</DialogTitle>
          <DialogDescription>Evento atrasado — rescalone com novo prazo</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Contato Acionado *</Label>
            <Select value={contatoSelecionado} onValueChange={setContatoSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contato" />
              </SelectTrigger>
              <SelectContent>
                {contatos?.map((contato) => (
                  <SelectItem key={contato.id} value={String(contato.id)}>
                    {contato.nm_pessoa}{contato.turno ? ` (${contato.turno})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Novo Prazo *</Label>
            <Input
              type="datetime-local"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Justificativa * (máx 280 caracteres)</Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value.slice(0, 280))}
              rows={3}
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{justificativa.length}/280</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={definirNovoPrazo.isPending}>
              {definirNovoPrazo.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
