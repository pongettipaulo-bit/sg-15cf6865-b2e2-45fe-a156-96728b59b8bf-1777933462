import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({
  children,
  requiredPermission,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  if (requiredPermission && !hasPermission(profile, requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md px-6">
          <h2 className="text-2xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground mb-6">
            Você não tem permissão para acessar esta página.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-primary hover:text-primary-dark underline"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function hasPermission(
  profile: { perfil: string },
  resource: string
): boolean {
  if (profile.perfil === "admin") return true;

  const advancedResources = [
    "eventos",
    "equipamentos",
    "relatorios",
    "configuracoes",
    "cadastros",
  ];
  const basicResources = ["eventos", "equipamentos"];

  if (profile.perfil === "avancado") {
    return advancedResources.includes(resource);
  }

  if (profile.perfil === "basico") {
    return basicResources.includes(resource);
  }

  return false;
}