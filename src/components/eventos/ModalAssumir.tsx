import { useState } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Evento = {
  id: string;
  id_tipo_evento: number;
  nm_tipo_evento: string;
  [key: string]: any;
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
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [motivoId, setMotivoId] = useState("");
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

  const assumirEvento = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from("fila_evento")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-abertos"] });
      toast({ title: "Evento assumido com sucesso" });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Erro ao assumir evento:", error);
      toast({ title: "Erro ao assumir evento", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setMotivoId("");
    setObservacao("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evento || !profile) return;

    if (!motivoId) {
      toast({ title: "Selecione um motivo", variant: "destructive" });
      return;
    }

    await assumirEvento.mutateAsync({
      id: evento.id,
      data: {
        status: "em_andamento",
        dt_inicio: new Date().toISOString(),
        id_motivo: Number(motivoId),
        observacao_inicio: observacao || null,
        id_usuario_inicio: profile.id,
      },
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
            <Label htmlFor="motivo">Motivo *</Label>
            <Select value={motivoId} onValueChange={setMotivoId} required>
              <SelectTrigger>
                <SelectValue placeholder={loadingMotivos ? "Carregando..." : "Selecione o motivo"} />
              </SelectTrigger>
              <SelectContent>
                {motivos?.map((motivo) => (
                  <SelectItem key={motivo.id} value={String(motivo.id)}>
                    {motivo.nm_motivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              placeholder="Descreva ações tomadas..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              maxLength={280}
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {observacao.length}/280
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assumirEvento.isPending || !motivoId}>
              {assumirEvento.isPending ? "Assumindo..." : "Assumir"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}