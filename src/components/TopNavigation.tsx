import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminStatusBadge } from "@/components/AdminStatusBadge";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface TopNavigationProps {
  showBreadcrumb?: boolean;
}

export function TopNavigation({ showBreadcrumb = true }: TopNavigationProps) {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data?.session?.user ?? null);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      navigate("/auth", { replace: true });

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro ao sair",
        description: "Não foi possível fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="w-full border-b bg-card shadow-soft sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        {showBreadcrumb && <BreadcrumbNavigation />}

        <div className="flex items-center gap-3 ml-auto">
          {user && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.email}
              </span>
              <AdminStatusBadge />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
