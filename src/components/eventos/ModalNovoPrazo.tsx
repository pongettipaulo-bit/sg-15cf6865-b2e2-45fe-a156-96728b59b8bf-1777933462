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
  nivel_escalonamento: number;
};

type Contato = {
  id: number;
  nm_pessoa: string;
  contato: string;
};

export function ModalNovoPrazo({
  evento,
  open,
  onOpenChange,
}: {
  evento: Evento;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [novoPrazo, setNovoPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [contatoSelecionado, setContatoSelecionado] = useState<string>("");

  const { data: contatos } = useQuery({
    queryKey: ["escalation-contatos", evento.id_tipo_evento],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_escalation_list")
        .select("*")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as Contato[];
    },
    enabled: open && !!evento.id_tipo_evento,
  });

  const definirNovoPrazo = useMutation({
    mutationFn: async () => {
      console.log("🚀 Iniciando mutação de novo prazo");

      const novoNivel = (evento.nivel_escalonamento ?? 0) + 1;

      // Update fila_evento
      const { error: updateError } = await supabase
        .from("fila_evento")
        .update({
          status: "escalado",
          dt_prazo: novoPrazo,
          nivel_escalonamento: novoNivel,
          prazo_vencido: false,
        })
        .eq("id", evento.id);

      if (updateError) {
        console.error("❌ Erro ao atualizar fila_evento:", updateError);
        throw new Error(`Erro ao atualizar evento: ${updateError.message}`);
      }

      console.log("✅ Evento atualizado com sucesso");

      // Insert log_escalonamento
      const contatoId = contatoSelecionado ? Number(contatoSelecionado) : null;
      const contato = contatos?.find(c => c.id === contatoId);

      const logData = {
        id_fila_evento: evento.id,
        nivel: novoNivel,
        dt_prazo: novoPrazo,
        id_usuario: profile?.id ?? null,
        nm_contato: contato?.nm_pessoa ?? null,
        observacao: justificativa || null,
      };

      console.log("📝 Inserindo log_escalonamento:", logData);

      const { error: logError } = await supabase
        .from("log_escalonamento")
        .insert(logData);

      if (logError) {
        console.error("❌ Erro ao inserir log:", logError);
        throw new Error(`Erro ao registrar log: ${logError.message}`);
      }

      console.log("✅ Log de escalonamento inserido");
    },
    onSuccess: () => {
      console.log("✅ Mutação concluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      setNovoPrazo("");
      setJustificativa("");
      setContatoSelecionado("");
      toast({ title: "Novo prazo definido com sucesso" });
    },
    onError: (error: any) => {
      console.error("❌ Erro completo na mutação:", error);
      toast({
        title: "Erro ao definir novo prazo",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPrazo || !justificativa || !contatoSelecionado) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
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
            <Label htmlFor="contato">Contato Acionado*</Label>
            <Select value={contatoSelecionado} onValueChange={setContatoSelecionado}>
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
            <Label htmlFor="novoPrazo">Novo Prazo*</Label>
            <Input
              id="novoPrazo"
              type="datetime-local"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="justificativa">Justificativa* (máx 280 caracteres)</Label>
            <Textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value.slice(0, 280))}
              rows={3}
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {justificativa.length}/280
            </p>
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