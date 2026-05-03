import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings, Database, Shield } from "lucide-react";

type EventoRegra = {
  id: string;
  fonte_evento: string;
  codigo_externo: string;
  id_tipo_evento: string;
  nm_tipo_evento?: string;
  ativo: boolean;
};

type FonteDados = {
  id: string;
  nome: string;
  tipo_conexao: string;
  ativo: boolean;
};

type Permissao = {
  id?: string;
  perfil: string;
  recurso: string;
  permitido: boolean;
};

const RECURSOS_AVANCADO = [
  { key: "cadastrar_tipos_evento", label: "Cadastrar tipos de evento" },
  { key: "cadastrar_motivos", label: "Cadastrar motivos" },
  { key: "cadastrar_categorias", label: "Cadastrar categorias/subcategorias" },
  { key: "cadastrar_escalation", label: "Cadastrar escalation list" },
  { key: "editar_equipamentos", label: "Editar equipamentos" },
  { key: "editar_operadores", label: "Editar operadores" },
  { key: "ver_relatorios", label: "Ver relatórios" },
  { key: "exportar_dados", label: "Exportar dados" },
];

const RECURSOS_BASICO = [
  { key: "ver_historico_equipamentos", label: "Ver histórico de equipamentos" },
  { key: "ver_relatorios", label: "Ver relatórios" },
  { key: "exportar_dados", label: "Exportar dados" },
];

export default function Configuracoes() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [modalRegra, setModalRegra] = useState(false);
  const [modalFonte, setModalFonte] = useState(false);
  const [editandoRegra, setEditandoRegra] = useState<EventoRegra | null>(null);
  const [editandoFonte, setEditandoFonte] = useState<FonteDados | null>(null);

  // Queries
  const { data: regras, isLoading: loadingRegras } = useQuery({
    queryKey: ["evento_regras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cfg_evento_regra")
        .select("*, nm_tipo_evento:dim_tipo_evento(nm_tipo_evento)")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data.map((r: any) => ({
        ...r,
        nm_tipo_evento: r.nm_tipo_evento?.nm_tipo_evento || "—",
      })) as EventoRegra[];
    },
  });

  const { data: fontes, isLoading: loadingFontes } = useQuery({
    queryKey: ["fontes_dados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cfg_fonte_dados")
        .select("*")
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return data as FonteDados[];
    },
  });

  const { data: permissoesAvancado } = useQuery({
    queryKey: ["permissoes", "avancado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cfg_permissao_perfil")
        .select("*")
        .eq("perfil", "avancado");
      if (error) throw error;
      return data as Permissao[];
    },
  });

  const { data: permissoesBasico } = useQuery({
    queryKey: ["permissoes", "basico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cfg_permissao_perfil")
        .select("*")
        .eq("perfil", "basico");
      if (error) throw error;
      return data as Permissao[];
    },
  });

  // Mutations
  const toggleRegraAtiva = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("cfg_evento_regra")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evento_regras"] });
      toast({ title: "Regra atualizada" });
    },
  });

  const toggleFonteAtiva = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("cfg_fonte_dados")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fontes_dados"] });
      toast({ title: "Fonte de dados atualizada" });
    },
  });

  const togglePermissao = useMutation({
    mutationFn: async ({
      perfil,
      recurso,
      permitido,
    }: {
      perfil: string;
      recurso: string;
      permitido: boolean;
    }) => {
      const { data: existing } = await supabase
        .from("cfg_permissao_perfil")
        .select("id")
        .eq("perfil", perfil)
        .eq("recurso", recurso)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("cfg_permissao_perfil")
          .update({ permitido })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cfg_permissao_perfil")
          .insert({ perfil, recurso, permitido });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["permissoes", variables.perfil] });
      toast({ title: "Permissão atualizada" });
    },
  });

  const getPermissaoAtual = (perfil: string, recurso: string): boolean => {
    const permissoes = perfil === "avancado" ? permissoesAvancado : permissoesBasico;
    const perm = permissoes?.find((p) => p.recurso === recurso);
    return perm?.permitido || false;
  };

  // Admin has unrestricted access
  if (profile?.perfil !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Sem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie motor de regras, fontes de dados e permissões
        </p>
      </div>

      <Tabs defaultValue="regras">
        <TabsList>
          <TabsTrigger value="regras">
            <Settings className="w-4 h-4 mr-2" />
            Motor de Regras
          </TabsTrigger>
          <TabsTrigger value="fontes">
            <Database className="w-4 h-4 mr-2" />
            Fontes de Dados
          </TabsTrigger>
          <TabsTrigger value="permissoes">
            <Shield className="w-4 h-4 mr-2" />
            Perfis e Permissões
          </TabsTrigger>
        </TabsList>

        {/* Motor de Regras */}
        <TabsContent value="regras">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Regras de Eventos</CardTitle>
              <Button onClick={() => setModalRegra(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Regra
              </Button>
            </CardHeader>
            <CardContent>
              {loadingRegras ? (
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
                        <TableHead>Fonte</TableHead>
                        <TableHead>Código Externo</TableHead>
                        <TableHead>Tipo de Evento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regras?.map((regra) => (
                        <TableRow key={regra.id}>
                          <TableCell>{regra.fonte_evento}</TableCell>
                          <TableCell className="font-mono text-sm">
                            {regra.codigo_externo}
                          </TableCell>
                          <TableCell>{regra.nm_tipo_evento}</TableCell>
                          <TableCell>
                            <Switch
                              checked={regra.ativo}
                              onCheckedChange={(checked) =>
                                toggleRegraAtiva.mutate({ id: regra.id, ativo: checked })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fontes de Dados */}
        <TabsContent value="fontes">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Fontes de Dados</CardTitle>
              <Button onClick={() => setModalFonte(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Fonte
              </Button>
            </CardHeader>
            <CardContent>
              {loadingFontes ? (
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
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo de Conexão</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fontes?.map((fonte) => (
                        <TableRow key={fonte.id}>
                          <TableCell>{fonte.nome}</TableCell>
                          <TableCell>{fonte.tipo_conexao}</TableCell>
                          <TableCell>
                            <Switch
                              checked={fonte.ativo}
                              onCheckedChange={(checked) =>
                                toggleFonteAtiva.mutate({ id: fonte.id, ativo: checked })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Perfis e Permissões */}
        <TabsContent value="permissoes">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Perfil Avançado */}
            <Card>
              <CardHeader>
                <CardTitle>Perfil Avançado (Operador)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {RECURSOS_AVANCADO.map((recurso) => (
                    <div
                      key={recurso.key}
                      className="flex items-center justify-between py-2 border-b"
                    >
                      <Label htmlFor={`avancado-${recurso.key}`} className="cursor-pointer">
                        {recurso.label}
                      </Label>
                      <Switch
                        id={`avancado-${recurso.key}`}
                        checked={getPermissaoAtual("avancado", recurso.key)}
                        onCheckedChange={(checked) =>
                          togglePermissao.mutate({
                            perfil: "avancado",
                            recurso: recurso.key,
                            permitido: checked,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Perfil Básico */}
            <Card>
              <CardHeader>
                <CardTitle>Perfil Básico (Analista)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {RECURSOS_BASICO.map((recurso) => (
                    <div
                      key={recurso.key}
                      className="flex items-center justify-between py-2 border-b"
                    >
                      <Label htmlFor={`basico-${recurso.key}`} className="cursor-pointer">
                        {recurso.label}
                      </Label>
                      <Switch
                        id={`basico-${recurso.key}`}
                        checked={getPermissaoAtual("basico", recurso.key)}
                        onCheckedChange={(checked) =>
                          togglePermissao.mutate({
                            perfil: "basico",
                            recurso: recurso.key,
                            permitido: checked,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}