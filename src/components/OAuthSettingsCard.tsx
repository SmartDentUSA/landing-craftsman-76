import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OAuthProvider } from "@/lib/oauth";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OAuthSettingsCardProps {
  provider: OAuthProvider;
  title: string;
  icon: React.ReactNode;
  testFunctionName: string;
}

export function OAuthSettingsCard({ 
  provider, 
  title, 
  icon, 
  testFunctionName 
}: OAuthSettingsCardProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isCheckingCredentials, setIsCheckingCredentials] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Check for OAuth credentials in oauth_credentials table
  useEffect(() => {
    const checkCredentials = async () => {
      try {
        setIsCheckingCredentials(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setHasCredentials(false);
          return;
        }

        const { data, error } = await supabase
          .from('oauth_credentials')
          .select('refresh_token')
          .eq('user_id', user.id)
          .eq('provider', provider)
          .maybeSingle();

        if (error) {
          console.error('Error checking credentials:', error);
          setHasCredentials(false);
          return;
        }

        setHasCredentials(!!data?.refresh_token);
      } catch (error) {
        console.error('Error checking credentials:', error);
        setHasCredentials(false);
      } finally {
        setIsCheckingCredentials(false);
      }
    };

    checkCredentials();
  }, [provider, session]);

  // Determine badge state based on credentials
  const getBadgeState = () => {
    if (isCheckingCredentials) return { variant: 'secondary' as const, text: 'Verificando...' };
    if (hasCredentials) return { variant: 'default' as const, text: 'Conectado', className: 'bg-green-500' };
    if (session?.provider_token) return { variant: 'secondary' as const, text: 'Login Google (sem credenciais API)' };
    return { variant: 'destructive' as const, text: 'Não Conectado' };
  };

  const badgeState = getBadgeState();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>
          Gerenciar integração OAuth
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant={badgeState.variant} className={badgeState.className}>
            {badgeState.text}
          </Badge>
        </div>

        {session?.user?.email && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{hasCredentials ? 'API Configurada' : 'Quase lá 😉'}</AlertTitle>
            <AlertDescription>
              {hasCredentials 
                ? `Credenciais OAuth configuradas para ${session.user.email}` 
                : `Você já está logado. Para ativar esta integração, informe o Client ID, Client Secret e gere o Refresh Token. Leva menos de 1 minuto — clique em "Configurar ${title}".`
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 flex-wrap">
          {hasCredentials && (
            <>
              <Button
                variant="outline"
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    const { error } = await supabase.auth.refreshSession();
                    if (error) throw error;
                    toast({
                      title: "Token renovado",
                      description: "Sua sessão foi renovada com sucesso.",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Erro ao renovar token",
                      description: error.message,
                      variant: "destructive",
                    });
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
              >
                {isRefreshing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Renovar Token
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  setIsTesting(true);
                  try {
                    const { data, error } = await supabase.functions.invoke(testFunctionName);
                    
                    if (error) throw error;

                    toast({
                      title: "Teste bem-sucedido",
                      description: data.message || "Conexão funcionando corretamente",
                    });
                  } catch (error: any) {
                    toast({
                      title: "Erro no teste",
                      description: error.message,
                      variant: "destructive",
                    });
                  } finally {
                    setIsTesting(false);
                  }
                }}
                disabled={isTesting}
              >
                {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Testar Conexão
              </Button>
            </>
          )}

          {!hasCredentials && (
            <Button
              onClick={() => {
                const configPath = provider === 'googleBusiness' 
                  ? '/google-business-settings' 
                  : '/youtube-settings';
                navigate(configPath);
              }}
            >
              Configurar {title}
            </Button>
          )}

          {session && (
            <Button
              variant="destructive"
              onClick={async () => {
                await supabase.auth.signOut();
                toast({
                  title: "Desconectado",
                  description: "Você foi desconectado com sucesso.",
                });
              }}
            >
              Desconectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
