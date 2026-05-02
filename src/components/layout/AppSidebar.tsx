import { Home, Bell, Tractor, TrendingUp, Settings, FileText, User, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Dashboard" },
  { path: "/eventos", icon: Bell, label: "Fila de Eventos" },
  { path: "/equipamentos", icon: Tractor, label: "Equipamentos" },
  { path: "/relatorios", icon: TrendingUp, label: "Relatórios" },
  { path: "/configuracoes", icon: Settings, label: "Configurações", adminOnly: true },
  { path: "/cadastros", icon: FileText, label: "Cadastros" },
  { path: "/usuarios", icon: User, label: "Usuários", adminOnly: true },
];

export function AppSidebar() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter((item) => {
    // Se não tem perfil carregado ainda, mostra todos os itens
    if (!profile) return true;
    
    // Admin vê tudo
    if (profile.perfil === "admin") return true;
    
    // Itens marcados como adminOnly são só para admin
    if (item.adminOnly) return false;
    
    // Outros perfis veem todos os itens não-admin
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-white border-r border-sidebar/20 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar/20 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-semibold text-primary-light">FieldOS</h1>
            <p className="text-xs text-sidebar/60">Gestão Operacional</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-sidebar/20"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.path || router.pathname.startsWith(item.path + "/");

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-primary text-white"
                    : "text-sidebar/80 hover:bg-sidebar/20 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar/20">
        {profile && !collapsed && (
          <div className="mb-3 px-3 py-2 bg-sidebar/20 rounded-lg">
            <p className="text-sm font-medium text-white">{profile.nome}</p>
            <p className="text-xs text-sidebar/60 capitalize">{profile.perfil}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full text-white hover:bg-sidebar/20 justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {!collapsed && "Sair"}
        </Button>
      </div>
    </aside>
  );
}