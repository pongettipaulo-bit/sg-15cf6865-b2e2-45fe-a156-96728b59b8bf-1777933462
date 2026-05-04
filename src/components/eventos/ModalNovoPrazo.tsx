import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type ModalNovoPrazoProps = {
  evento: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Contato = {
  id: number;
  nm_pessoa: string;
  contato: string;
};

export function ModalNovoPrazo({ evento, open, onOpenChange }: ModalNovoPrazoProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [novoPrazo, setNovoPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [idContato, setIdContato] = useState("");

  const { data: contatos } = useQuery({
    queryKey: ["escalation-contatos", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento?.id_tipo_evento) return [];
      
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("id, nm_pessoa, contato")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("ordem");

      if (error) throw error;
      return data as Contato[];
    },
    enabled: !!evento?.id_tipo_evento,
  });

  const novoPrazoMutation = useMutation({
    mutationFn: async () => {
      if (!evento) return;

      const prazoDate = new Date(novoPrazo);
      const nivelEscalonamento = (evento.nivel_escalonamento || 0) + 1;

      // Update fila_evento - set status to 'escalado' and update prazo
      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          dt_prazo: prazoDate.toISOString(),
          nivel_escalonamento: nivelEscalonamento,
          justificativa,
        })
        .eq("id", evento.id);

      if (updateError) throw updateError;

      // Insert log_escalonamento
      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert({
          id_evento: evento.id,
          id_contato: Number(idContato),
          dt_escalonamento: new Date().toISOString(),
          dt_prazo: prazoDate.toISOString(),
          nivel: nivelEscalonamento,
          observacao: `Novo prazo definido: ${justificativa}`,
        });

      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      toast({ title: "Novo prazo definido com sucesso" });
      resetForm();
    },
    onError: (error) => {
      console.error("Erro ao definir novo prazo:", error);
      toast({ 
        title: "Erro ao definir novo prazo", 
        variant: "destructive" 
      });
    },
  });

  const resetForm = () => {
    setNovoPrazo("");
    setJustificativa("");
    setIdContato("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novoPrazo) {
      toast({ title: "Informe o novo prazo", variant: "destructive" });
      return;
    }

    if (!idContato) {
      toast({ title: "Selecione o contato acionado", variant: "destructive" });
      return;
    }

    if (!justificativa || justificativa.length < 10) {
      toast({ title: "Justificativa obrigatória (mín. 10 caracteres)", variant: "destructive" });
      return;
    }

    novoPrazoMutation.mutate();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Novo Prazo</DialogTitle>
          <DialogDescription>
            Evento atrasado — reescalone com novo prazo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="contato">Contato Acionado*</Label>
            <Select value={idContato} onValueChange={setIdContato}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contato" />
              </SelectTrigger>
              <SelectContent>
                {contatos?.map((contato) => (
                  <SelectItem key={contato.id} value={String(contato.id)}>
                    {contato.nm_pessoa} — {contato.contato}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="novo-prazo">Novo Prazo*</Label>
            <input
              id="novo-prazo"
              type="datetime-local"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <div>
            <Label htmlFor="justificativa">Justificativa* (máx 280 caracteres)</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              maxLength={280}
              rows={3}
              required
              placeholder="Justifique o novo prazo..."
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {justificativa.length}/280
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={novoPrazoMutation.isPending}
            >
              {novoPrazoMutation.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}