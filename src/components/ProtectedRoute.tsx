import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedProfiles?: string[];
  requiredPermission?: string;
}

export function ProtectedRoute({
  children,
  allowedProfiles,
  requiredPermission,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (loading) return;

    // Not authenticated - redirect to login
    if (!user) {
      router.push("/login");
      return;
    }

    // Admin has unrestricted access - skip all checks
    if (profile?.perfil === "admin") return;

    // Check profile-based access for non-admin users
    if (allowedProfiles && !allowedProfiles.includes(profile?.perfil || "")) {
      router.push("/dashboard");
      return;
    }

    // Check permission-based access for non-admin users
    if (requiredPermission && profile) {
      // TODO: Implement permission check with cfg_permissao_perfil
      // For now, allow access
    }
  }, [user, profile, loading, router, allowedProfiles, requiredPermission]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user) return null;

  // Admin bypasses all checks
  if (profile?.perfil === "admin") {
    return <>{children}</>;
  }

  // Check profile access for non-admin
  if (allowedProfiles && !allowedProfiles.includes(profile?.perfil || "")) {
    return null;
  }

  return <>{children}</>;
}