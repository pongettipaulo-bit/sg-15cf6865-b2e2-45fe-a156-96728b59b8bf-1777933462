import { Home, Bell, Tractor, TrendingUp, Settings, FileText, User, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/dashboard", icon: Home, label: "Dashboard" },
  { path: "/eventos", icon: Bell, label: "Fila de Eventos" },
  { path: "/equipamentos", icon: Tractor, label: "Equipamentos" },
  { path: "/relatorios", icon: TrendingUp, label: "Relatórios" },
  { path: "/configuracoes", icon: Settings, label: "Configurações", adminOnly: true },
  { path: "/cadastros", icon: FileText, label: "Cadastros" },
  { path: "/usuarios", icon: User, label: "Usuários", adminOnly: true },
];

type AppSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!profile) return true;
    if (profile.perfil === "admin") return true;
    if (item.adminOnly) return false;
    return true;
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-white border-r border-sidebar/20 transition-all duration-300 flex flex-col z-40",
        collapsed ? "w-12" : "w-[220px]"
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-sidebar/20 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-semibold text-primary-light">FieldOS</h1>
            <p className="text-xs text-white/60">Gestão Operacional</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="text-white hover:bg-sidebar/20 ml-auto"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            router.pathname === item.path ||
            router.pathname.startsWith(item.path + "/");

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-white",
                  collapsed ? "justify-center" : "",
                  isActive ? "bg-primary" : "hover:bg-sidebar/20"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar/20">
        {profile && !collapsed && (
          <div className="mb-3 px-3 py-2 bg-sidebar/20 rounded-lg">
            <p className="text-sm font-medium text-white truncate">
              {profile.nm_usuario}
            </p>
            <p className="text-xs text-white/60 capitalize">{profile.perfil}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className={cn(
            "w-full text-white hover:bg-sidebar/20",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
