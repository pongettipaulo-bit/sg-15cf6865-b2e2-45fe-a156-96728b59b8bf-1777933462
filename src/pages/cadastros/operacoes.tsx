import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Edit } from "lucide-react";

type Operacao = {
  id: string;
  cd_operacao: string;
  nm_operacao: string;
};

export default function Operacoes() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Operacao | null>(null);
  const [formData, setFormData] = useState({ cd_operacao: "", nm_operacao: "" });

  const { data: operacoes, isLoading } = useQuery({
    queryKey: ["operacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_operacao")
        .select("*")
        .order("cd_operacao");
      if (error) throw error;
      return data as Operacao[];
    },
  });

  const salvar = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editando) {
        const { error } = await supabase
          .from("dim_operacao")
          .update(data)
          .eq("id", editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("dim_operacao")
          .insert(data);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operacoes"] });
      toast({ title: editando ? "Operação atualizada" : "Operação criada" });
      fecharModal();
    },
  });

  const abrirModal = (op?: Operacao) => {
    if (op) {
      setEditando(op);
      setFormData({ cd_operacao: op.cd_operacao, nm_operacao: op.nm_operacao });
    } else {
      setEditando(null);
      setFormData({ cd_operacao: "", nm_operacao: "" });
    }
    setModalOpen(true);
  };

  const fecharModal = () => {
    setModalOpen(false);
    setEditando(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    salvar.mutate(formData);
  };

  const filtrados = operacoes?.filter((o) =>
    o.cd_operacao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.nm_operacao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.perfil !== "admin" && profile?.perfil !== "avancado") {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Acesso restrito</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Operações</h1>
          <p className="text-muted-foreground">Tipos de operações agrícolas</p>
        </div>
        <Button onClick={() => abrirModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Operação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar operações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrados && filtrados.length > 0 ? (
                    filtrados.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell className="font-mono">{op.cd_operacao}</TableCell>
                        <TableCell>{op.nm_operacao}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => abrirModal(op)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhuma operação encontrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Operação" : "Nova Operação"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cd_operacao">Código *</Label>
              <Input
                id="cd_operacao"
                value={formData.cd_operacao}
                onChange={(e) => setFormData({ ...formData, cd_operacao: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="nm_operacao">Descrição *</Label>
              <Input
                id="nm_operacao"
                value={formData.nm_operacao}
                onChange={(e) => setFormData({ ...formData, nm_operacao: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={fecharModal}>
                Cancelar
              </Button>
              <Button type="submit" disabled={salvar.isPending}>
                {salvar.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}