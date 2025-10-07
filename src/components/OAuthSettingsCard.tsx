import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OAuthProvider } from "@/lib/oauth";
import { Loader2, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
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

  // ✅ Detectar login via Google
  if (session?.provider_token) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle>{title}</CardTitle>
            </div>
            <Badge className="bg-green-500">
              <CheckCircle className="w-3 h-3 mr-1" /> Conectado via Google
            </Badge>
          </div>
          <CardDescription>
            Seu acesso às APIs do YouTube e Google Business está configurado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Integração Ativa</AlertTitle>
            <AlertDescription>
              <strong>Scopes ativos:</strong> YouTube, Google Business Profile
              <br />
              <strong>Email:</strong> {session.user.email}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  const { data, error } = await supabase.functions.invoke('refresh-google-token');
                  if (error) throw error;
                  toast({ 
                    title: "✅ Token renovado", 
                    description: "Access token atualizado com sucesso" 
                  });
                } catch (err: any) {
                  toast({ 
                    title: "❌ Erro ao renovar", 
                    description: err.message, 
                    variant: "destructive" 
                  });
                } finally {
                  setIsRefreshing(false);
                }
              }}
              variant="outline"
              disabled={isRefreshing}
            >
              {isRefreshing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Renovar Token
            </Button>

            <Button
              onClick={async () => {
                setIsTesting(true);
                try {
                  const { data, error } = await supabase.functions.invoke(testFunctionName);
                  if (error) throw error;
                  toast({ 
                    title: "✅ Conexão OK", 
                    description: `${title} funcionando corretamente` 
                  });
                } catch (err: any) {
                  toast({ 
                    title: "❌ Erro na conexão", 
                    description: err.message, 
                    variant: "destructive" 
                  });
                } finally {
                  setIsTesting(false);
                }
              }}
              variant="secondary"
              disabled={isTesting}
            >
              {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Testar Conexão
            </Button>

            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                toast({ 
                  title: "Desconectado", 
                  description: "Sessão Google encerrada" 
                });
              }}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ❌ Não conectado via Google
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          Faça login com sua conta Google para habilitar integrações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não Conectado</AlertTitle>
          <AlertDescription>
            Para usar {title}, você precisa fazer login com sua conta Google.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={() => navigate("/auth")} 
          className="w-full mt-4"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Fazer Login com Google
        </Button>
      </CardContent>
    </Card>
  );
}
