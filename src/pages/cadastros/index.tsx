import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, AlertCircle, Folder, List, Users, Tractor, Layers, Wrench, User, Briefcase, Building } from "lucide-react";

const CADASTROS = [
  { path: "/cadastros/tipos-evento", icon: AlertCircle, title: "Tipos de Evento", description: "Configurar tipos de eventos operacionais" },
  { path: "/cadastros/motivos", icon: FileText, title: "Motivos", description: "Motivos de eventos e encerramentos" },
  { path: "/cadastros/categorias", icon: Folder, title: "Categorias", description: "Categorias de eventos" },
  { path: "/cadastros/subcategorias", icon: List, title: "Subcategorias", description: "Subcategorias por categoria" },
  { path: "/cadastros/escalation", icon: Users, title: "Escalation List", description: "Contatos para escalonamento" },
  { path: "/cadastros/equipamentos", icon: Tractor, title: "Equipamentos", description: "Cadastro de equipamentos" },
  { path: "/cadastros/grupos-equipamento", icon: Layers, title: "Grupos de Equipamento", description: "Grupos de equipamentos" },
  { path: "/cadastros/tipos-equipamento", icon: Wrench, title: "Tipos de Equipamento", description: "Tipos de equipamentos" },
  { path: "/cadastros/operadores", icon: User, title: "Operadores", description: "Operadores de equipamentos" },
  { path: "/cadastros/operacoes", icon: Briefcase, title: "Operações", description: "Operações agrícolas" },
  { path: "/cadastros/unidades", icon: Building, title: "Unidades", description: "Unidades operacionais" },
];

export default function Cadastros() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Cadastros</h1>
        <p className="text-muted-foreground">
          Gerencie os cadastros básicos do sistema
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CADASTROS.map((cadastro) => {
          const Icon = cadastro.icon;
          return (
            <Link key={cadastro.path} href={cadastro.path}>
              <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-primary" />
                    {cadastro.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {cadastro.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}