import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type UserProfile = {
  id: string;
  auth_uid: string;
  nm_usuario: string;
  email: string;
  perfil: "admin" | "avancado" | "basico";
  ativo: boolean;
};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasPermission: (resource: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
        if (router.pathname !== "/login") {
          router.push("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function loadUserProfile(authUid: string) {
    try {
      const { data, error } = await supabase
        .from("dim_usuario_sistema")
        .select("*")
        .eq("auth_uid", authUid)
        .eq("ativo", true)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/login");
  }

  function hasPermission(resource: string): boolean {
    if (!profile) return false;
    if (profile.perfil === "admin") return true;

    // TODO: Query cfg_permissao_perfil for specific permissions
    // For now, return basic logic based on profile type
    const advancedResources = [
      "eventos",
      "equipamentos",
      "relatorios",
      "cadastros",
    ];
    const basicResources = ["eventos"];

    if (profile.perfil === "avancado") {
      return advancedResources.includes(resource);
    }

    if (profile.perfil === "basico") {
      return basicResources.includes(resource);
    }

    return false;
  }

  const value = {
    user,
    profile,
    loading,
    signOut,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}