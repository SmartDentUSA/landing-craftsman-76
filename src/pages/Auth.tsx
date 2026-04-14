import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuthReady } from "@/hooks/useAuthReady";

const PUBLISHED_URL = "https://landing-craftsman-76.lovable.app";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { authStatus, user, clearSession } = useAuthReady();

  const isPreview = window.self !== window.top;

  // Redirect if already authenticated
  useEffect(() => {
    if (authStatus === 'ready' && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [authStatus, user, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error('Login error:', error);
        toast({
          variant: "destructive",
          title: "Erro no Login",
          description: error.message
        });
      } else if (data.session) {
        toast({ title: "Login realizado com sucesso" });
        // Explicit navigate as fallback — onAuthStateChange should also handle this
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Unexpected login error:', error);
      toast({
        variant: "destructive",
        title: "Erro inesperado",
        description: error?.message || "Tente novamente em alguns segundos"
      });
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      toast({ variant: "destructive", title: "Erro", description: "As senhas não coincidem" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
    });

    if (error) {
      toast({ variant: "destructive", title: "Erro no cadastro", description: error.message });
    } else {
      toast({ title: "Sucesso", description: "Verifique seu email para o link de confirmação" });
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const inIframe = window.self !== window.top;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: { access_type: "offline", prompt: "consent" },
          scopes: [
            "openid", "email", "profile",
            "https://www.googleapis.com/auth/youtube.force-ssl",
            "https://www.googleapis.com/auth/business.manage"
          ].join(" "),
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('URL de autorização não retornada');

      if (inIframe) {
        const launchUrl = `${window.location.origin}/auth/launch?target=${encodeURIComponent(data.url)}`;
        const newTab = window.open(launchUrl, "_blank", "noopener,noreferrer");
        if (!newTab) {
          toast({ title: "Bloqueio de popup", description: "Permita popups e tente novamente", variant: "destructive" });
        }
      } else {
        window.location.assign(data.url);
      }
    } catch (error: any) {
      toast({ title: "Erro no login com Google", description: error.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/password-reset`
    });

    if (error) {
      toast({ variant: "destructive", title: "Erro ao enviar email", description: error.message });
    } else {
      toast({ title: "Email enviado", description: "Verifique sua caixa de entrada" });
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await clearSession();
    navigate("/", { replace: true });
  };

  // Already logged in
  if (authStatus === 'ready' && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle>✅ Você já está logado</CardTitle>
            <CardDescription>Conectado como: <strong>{user.email}</strong></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => navigate('/dashboard', { replace: true })} className="w-full" size="lg">
              Acessar Dashboard
            </Button>
            <Button onClick={handleSignOut} className="w-full" variant="outline">
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Bem-vindo</CardTitle>
          <CardDescription>Entre na sua conta ou crie uma nova</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Preview warning */}
          {isPreview && (
            <div className="mb-4 p-3 bg-muted rounded-md border text-sm text-muted-foreground">
              <p className="font-medium mb-1">⚠️ Ambiente de Preview</p>
              <p className="mb-2">A autenticação pode não funcionar no Preview. Use o site publicado:</p>
              <a href={`${PUBLISHED_URL}/auth`} target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" size="sm" className="w-full">Abrir site publicado</Button>
              </a>
            </div>
          )}

          <Button onClick={handleGoogleSignIn} variant="outline" className="w-full mb-4" disabled={loading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#4285F4" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#34A853" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </Button>

          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou continue com email</span>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              <TabsTrigger value="forgot">Esqueci</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" name="email" type="email" placeholder="seu@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <Input id="signin-password" name="password" type="password" placeholder="Sua senha" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="seu@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input id="signup-password" name="password" type="password" placeholder="Escolha uma senha" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirmar Senha</Label>
                  <Input id="signup-confirm" name="confirmPassword" type="password" placeholder="Confirme sua senha" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar Conta"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot">
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" name="email" type="email" placeholder="seu@email.com" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar Link de Reset"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Clear session button */}
          <div className="mt-4 pt-4 border-t">
            <Button
              onClick={async () => { await clearSession(); toast({ title: "Sessão limpa", description: "Tente fazer login novamente" }); }}
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground"
            >
              Problemas para entrar? Limpar sessão local
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
