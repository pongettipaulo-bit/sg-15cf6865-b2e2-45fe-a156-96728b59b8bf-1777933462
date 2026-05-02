import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryProvider } from "@/contexts/QueryProvider";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const isLoginPage = router.pathname === "/login";

  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          {isLoginPage ? (
            <Component {...pageProps} />
          ) : (
            <div className="flex min-h-screen bg-background">
              <AppSidebar />
              <main className="flex-1 ml-64 p-8">
                <Component {...pageProps} />
              </main>
            </div>
          )}
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}