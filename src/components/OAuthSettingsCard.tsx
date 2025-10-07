import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { OAuthProvider } from "@/lib/oauth";
import { useOAuth } from "@/hooks/useOAuth";
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";

interface OAuthSettingsCardProps {
  provider: OAuthProvider;
  title: string;
  icon: React.ReactNode;
  testFunctionName: string;
}

type ConnectionStatus = "connected" | "error" | "not_configured" | "checking";

interface OAuthConfig {
  id: string;
  client_id: string;
}

export function OAuthSettingsCard({ 
  provider, 
  title, 
  icon, 
  testFunctionName 
}: OAuthSettingsCardProps) {
  const { toast } = useToast();
  const location = useLocation();
  const { start, exchange } = useOAuth(provider);

  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [configId, setConfigId] = useState<string>("");
  const [configs, setConfigs] = useState<OAuthConfig[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("not_configured");
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthCode, setOauthCode] = useState("");
  const [isExchanging, setIsExchanging] = useState(false);

  // Carregar configurações existentes
  useEffect(() => {
    loadConfigs();
  }, [provider]);

  // Detectar retorno do OAuth callback
  useEffect(() => {
    const state = location.state as any;
    if (state?.openOAuthModal && state?.provider === provider && state?.code) {
      console.log(`✅ Código OAuth detectado para ${provider}:`, state.code.slice(0, 10) + "...");
      setOauthCode(state.code);
      setShowOAuthModal(true);
      if (configId) {
        handleExchange(state.code);
      }
      // Limpar state do location
      window.history.replaceState({}, document.title);
    }
  }, [location.state, provider, configId]);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from("oauth_client_configs")
        .select("id, client_id")
        .eq("provider", provider);

      if (error) throw error;

      setConfigs(data || []);
      if (data && data.length > 0) {
        const firstConfig = data[0];
        setConfigId(firstConfig.id);
        setClientId(firstConfig.client_id);
        await testConnection();
      }
    } catch (err) {
      console.error("Erro ao carregar configs:", err);
    }
  };

  const handleSave = async () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha Client ID e Client Secret",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data, error } = await supabase
        .from("oauth_client_configs")
        .upsert({
          owner_user_id: user.id,
          provider,
          client_id: clientId,
          client_secret: clientSecret,
        }, { onConflict: "owner_user_id,provider" })
        .select()
        .single();

      if (error) throw error;

      setConfigId(data.id);
      await loadConfigs();
      
      toast({
        title: "✅ Configuração salva",
        description: "Credenciais armazenadas com segurança",
      });

    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateToken = async () => {
    if (!configId) {
      toast({
        title: "Salve as credenciais primeiro",
        description: "Configure Client ID e Secret antes de gerar o token",
        variant: "destructive",
      });
      return;
    }

    try {
      await start(configId);
    } catch (err) {
      toast({
        title: "Erro ao iniciar OAuth",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const handleExchange = async (code: string) => {
    if (!configId) {
      toast({
        title: "Configuração não encontrada",
        description: "Salve as credenciais primeiro",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExchanging(true);

      await exchange(code, configId);

      setShowOAuthModal(false);
      toast({
        title: "✅ Token gerado com sucesso",
        description: "Credenciais OAuth configuradas",
      });

      await testConnection();

    } catch (err) {
      toast({
        title: "Erro na troca do código",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsExchanging(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsTesting(true);
      setStatus("checking");

      const { data, error } = await supabase.functions.invoke(testFunctionName);

      if (error) throw error;

      if (data?.ok) {
        setStatus("connected");
        toast({
          title: "✅ Conexão estabelecida",
          description: `${title} conectado com sucesso`,
        });
      } else {
        setStatus("error");
        toast({
          title: "❌ Falha na conexão",
          description: data?.error || "Não foi possível conectar",
          variant: "destructive",
        });
      }
    } catch (err) {
      setStatus("error");
      toast({
        title: "Erro ao testar conexão",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      await supabase
        .from("oauth_credentials")
        .delete()
        .eq("user_id", user.id)
        .eq("provider", provider);

      setStatus("not_configured");
      toast({
        title: "Desconectado",
        description: "Credenciais OAuth removidas",
      });

    } catch (err) {
      toast({
        title: "Erro ao desconectar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      case "checking":
        return <Badge variant="outline"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Verificando...</Badge>;
      default:
        return <Badge variant="secondary">Não configurado</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              <CardTitle>{title}</CardTitle>
            </div>
            {getStatusBadge()}
          </div>
          <CardDescription>
            Configure as credenciais OAuth para integração com {title}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Configuração */}
          {configs.length > 0 && (
            <div className="space-y-2">
              <Label>Configuração Existente</Label>
              <Select value={configId} onValueChange={setConfigId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma configuração" />
                </SelectTrigger>
                <SelectContent>
                  {configs.map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.id}>
                      {cfg.client_id.slice(-20)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`${provider}-client-id`}>Client ID</Label>
            <Input
              id={`${provider}-client-id`}
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abc.apps.googleusercontent.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${provider}-client-secret`}>Client Secret</Label>
            <Input
              id={`${provider}-client-secret`}
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-..."
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleSave}
              disabled={isSaving || !clientId || !clientSecret}
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Configuração
            </Button>

            <Button
              onClick={handleGenerateToken}
              disabled={!configId}
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Gerar Token
            </Button>

            {status === "connected" && (
              <>
                <Button
                  onClick={testConnection}
                  disabled={isTesting}
                  variant="secondary"
                >
                  {isTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Testar Conexão
                </Button>

                <Button
                  onClick={handleDisconnect}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Desconectar
                </Button>
              </>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Modal para processar código OAuth */}
      <Dialog open={showOAuthModal} onOpenChange={setShowOAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Token OAuth</DialogTitle>
            <DialogDescription>
              Trocando código por refresh token...
            </DialogDescription>
          </DialogHeader>

          {isExchanging ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código OAuth</Label>
                <Input
                  value={oauthCode}
                  onChange={(e) => setOauthCode(e.target.value)}
                  placeholder="4/..."
                />
              </div>

              <Button
                onClick={() => handleExchange(oauthCode)}
                disabled={!oauthCode}
                className="w-full"
              >
                Confirmar Troca
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
