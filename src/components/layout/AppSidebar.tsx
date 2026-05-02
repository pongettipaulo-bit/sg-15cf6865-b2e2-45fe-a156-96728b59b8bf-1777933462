import { Home, Bell, Tractor, TrendingUp, Settings, FileText, User, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  requiredPermission?: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Fila de Eventos", href: "/eventos", icon: Bell, requiredPermission: "eventos" },
  { title: "Equipamentos", href: "/equipamentos", icon: Tractor, requiredPermission: "equipamentos" },
  { title: "Relatórios", href: "/relatorios", icon: TrendingUp, requiredPermission: "relatorios" },
  { title: "Configurações", href: "/configuracoes", icon: Settings, requiredPermission: "configuracoes" },
  { title: "Cadastros", href: "/cadastros", icon: FileText, requiredPermission: "cadastros" },
  { title: "Usuários", href: "/usuarios", icon: User, requiredPermission: "usuarios" },
];

export function AppSidebar() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!item.requiredPermission) return true;
    if (!profile) return false;
    
    if (profile.perfil === "admin") return true;
    
    if (item.requiredPermission === "usuarios" || item.requiredPermission === "configuracoes") {
      return false;
    }
    
    const advancedResources = ["eventos", "equipamentos", "relatorios", "cadastros"];
    const basicResources = ["eventos", "equipamentos"];
    
    if (profile.perfil === "avancado") {
      return advancedResources.includes(item.requiredPermission);
    }
    
    if (profile.perfil === "basico") {
      return basicResources.includes(item.requiredPermission);
    }
    
    return false;
  });

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-semibold text-sidebar-primary-foreground">
          FieldOS
        </h1>
        <p className="text-xs text-sidebar-foreground/60 mt-1">
          Gestão de Eventos Operacionais
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.title}</span>
              {item.badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-semibold text-sm">
              {profile.nome.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.nome}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">
                Perfil {profile.perfil}
              </p>
            </div>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </aside>
  );
}