import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";
import { QueryProvider } from "@/contexts/QueryProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          {isLoginPage ? (
            <Component {...pageProps} />
          ) : (
            <div className="flex h-screen overflow-hidden bg-background">
              <AppSidebar
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed((c) => !c)}
              />
              <main
                className={`flex-1 overflow-auto p-6 transition-all duration-300 ${
                  sidebarCollapsed ? "ml-12" : "ml-[220px]"
                }`}
              >
                <Component {...pageProps} />
              </main>
            </div>
          )}
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
