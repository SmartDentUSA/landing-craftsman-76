import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AdminStatusBadge } from "@/components/AdminStatusBadge";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthReady } from "@/hooks/useAuthReady";

interface TopNavigationProps {
  showBreadcrumb?: boolean;
}

export function TopNavigation({ showBreadcrumb = true }: TopNavigationProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, clearSession } = useAuthReady();

  const handleSignOut = async () => {
    try {
      await clearSession();

      navigate("/auth", { replace: true });

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (err) {
      toast({
        title: "Erro ao sair",
        description: "Não foi possível limpar a sessão local. Tente novamente.",
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
