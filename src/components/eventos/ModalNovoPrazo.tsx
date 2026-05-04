import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

type Evento = {
  id: string;
  id_tipo_evento: number;
  nm_tipo_evento: string;
  criticidade: string;
  status: string;
  dt_prazo: string;
  prazo_vencido: boolean;
  id_equipamento: string;
  nm_equipamento: string;
  nivel_escalonamento: number;
  vl_tempo_duracao_max: number;
  criado_em: string;
};

type Props = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalNovoPrazo({ evento, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [novoPrazo, setNovoPrazo] = useState("");

  const updateEvento = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase.from("fila_evento").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      queryClient.invalidateQueries({ queryKey: ["eventos-encerrados-hoje"] });
      onOpenChange(false);
      toast({ title: "Novo prazo definido com sucesso" });
    },
    onError: () => toast({ title: "Erro ao atualizar prazo", variant: "destructive" }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evento) return;

    const novaData = new Date(novoPrazo);
    
    await updateEvento.mutateAsync({
      id: evento.id,
      data: {
        dt_prazo: novaData.toISOString(),
        prazo_vencido: false,
      },
    });

    setNovoPrazo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir Novo Prazo</DialogTitle>
          <DialogDescription>
            {evento?.nm_tipo_evento || "Evento"} — Evento atrasado
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="novoPrazo">Nova Data/Hora de Prazo*</Label>
            <Input
              id="novoPrazo"
              type="datetime-local"
              value={novoPrazo}
              onChange={(e) => setNovoPrazo(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={updateEvento.isPending || !novoPrazo}>
              {updateEvento.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}