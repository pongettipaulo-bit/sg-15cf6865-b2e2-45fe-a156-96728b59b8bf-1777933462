import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search } from "lucide-react";

type Usuario = {
  id: string;
  auth_uid: string;
  nm_usuario: string;
  email: string;
  perfil: "admin" | "avancado" | "basico";
  ativo: boolean;
  criado_em: string;
};

const perfilLabel: Record<string, string> = {
  admin: "Administrador",
  avancado: "Avançado",
  basico: "Básico",
};

const perfilVariant = (perfil: string) => {
  if (perfil === "admin") return "destructive";
  if (perfil === "avancado") return "default";
  return "secondary";
};

export default function Usuarios() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nm_usuario: "",
    email: "",
    senha: "",
    perfil: "basico",
  });

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dim_usuario_sistema")
        .select("id, auth_uid, nm_usuario, email, perfil, ativo, criado_em")
        .order("nm_usuario");
      if (error) throw error;
      return data as Usuario[];
    },
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("dim_usuario_sistema")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast({ title: "Status atualizado" });
    },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const criarUsuario = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.senha,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Falha ao criar usuário na autenticação");

      const { error: insertError } = await supabase
        .from("dim_usuario_sistema")
        .insert({
          auth_uid: authData.user.id,
          nm_usuario: data.nm_usuario,
          email: data.email,
          perfil: data.perfil,
          ativo: true,
        });
      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      toast({ title: "Usuário criado. Um e-mail de confirmação foi enviado ao usuário." });
      setModalOpen(false);
      setFormData({ nm_usuario: "", email: "", senha: "", perfil: "basico" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error?.message || "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  const filteredUsuarios = (usuarios || []).filter((u) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      u.nm_usuario.toLowerCase().includes(t) ||
      u.email.toLowerCase().includes(t)
    );
  });

  if (profile?.perfil !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Usuários</h1>
          <p className="text-muted-foreground">Gestão de usuários do sistema</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsuarios.length > 0 ? (
                    filteredUsuarios.map((usuario) => (
                      <TableRow key={usuario.id}>
                        <TableCell className="font-medium">{usuario.nm_usuario}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {usuario.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={perfilVariant(usuario.perfil) as any}>
                            {perfilLabel[usuario.perfil] || usuario.perfil}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={usuario.ativo}
                            onCheckedChange={(checked) =>
                              toggleAtivo.mutate({ id: usuario.id, ativo: checked })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado
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
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              criarUsuario.mutate(formData);
            }}
            className="space-y-4"
          >
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nm_usuario}
                onChange={(e) => setFormData({ ...formData, nm_usuario: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Senha temporária *</Label>
              <Input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <Label>Perfil *</Label>
              <Select
                value={formData.perfil}
                onValueChange={(v) => setFormData({ ...formData, perfil: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="avancado">Avançado</SelectItem>
                  <SelectItem value="basico">Básico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criarUsuario.isPending}>
                {criarUsuario.isPending ? "Criando..." : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
