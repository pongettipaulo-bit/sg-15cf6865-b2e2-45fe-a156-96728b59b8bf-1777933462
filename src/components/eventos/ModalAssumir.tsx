import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Evento = {
  id: string;
  id_tipo_evento: string;
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

type Motivo = {
  id: number;
  nm_motivo: string;
};

type ModalAssumirProps = {
  evento: Evento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ModalAssumir({ evento, open, onOpenChange }: ModalAssumirProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [observacao, setObservacao] = useState("");

  const { data: motivos, isLoading: loadingMotivos } = useQuery({
    queryKey: ["motivos-evento", evento?.id_tipo_evento],
    queryFn: async () => {
      if (!evento?.id_tipo_evento) {
        console.log("ModalAssumir: id_tipo_evento está vazio", evento);
        return [];
      }

      console.log("ModalAssumir: Buscando motivos para id_tipo_evento:", evento.id_tipo_evento);

      const { data, error } = await supabase
        .from("dim_motivo_evento")
        .select("id, nm_motivo")
        .eq("id_tipo_evento", evento.id_tipo_evento)
        .eq("ativo", true)
        .order("nm_motivo");

      if (error) {
        console.error("Erro ao buscar motivos:", error);
        throw error;
      }

      console.log("ModalAssumir: Motivos encontrados:", data);
      return data as Motivo[];
    },
    enabled: !!evento?.id_tipo_evento && open,
  });

  const assumirMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("fila_evento").update(data).eq("id", evento!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      toast({ title: "Evento assumido com sucesso" });
      onOpenChange(false);
      setObservacao("");
    },
    onError: () => toast({ title: "Erro ao assumir evento", variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evento) return;

    assumirMutation.mutate({
      status: "em_andamento",
      dt_inicio: new Date().toISOString(),
      observacao_inicio: observacao || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assumir Evento</DialogTitle>
          <DialogDescription>
            {evento?.nm_tipo_evento || "Evento"} — Preencha os dados para assumir
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva ações tomadas..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assumirMutation.isPending}>
              {assumirMutation.isPending ? "Assumindo..." : "Assumir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}