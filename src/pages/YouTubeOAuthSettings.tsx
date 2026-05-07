import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Info, Copy, ChevronDown, Check } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { TopNavigation } from '@/components/TopNavigation';
import { Switch } from '@/components/ui/switch';
import { launchGoogleOAuth } from '@/lib/oauth-launcher';
import { getRedirectUri } from '@/lib/oauth';

const STORAGE_KEYS = {
  CLIENT_ID: 'youtube_client_id',
  CLIENT_SECRET: 'youtube_client_secret',
  REFRESH_TOKEN: 'youtube_refresh_token',
};

const DEFAULT_CLIENT_ID = '616806868683-cvgcj38j5jr3ojhvelafmiorlc4ipiro.apps.googleusercontent.com';
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

type ConnectionStatus = 'connected' | 'error' | 'not_configured' | 'checking';

export default function YouTubeOAuthSettings() {
  console.log('🎬 YouTubeOAuthSettings component mounted');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('not_configured');
  const [channelInfo, setChannelInfo] = useState<{ name: string; count: number } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showGcpGuide, setShowGcpGuide] = useState(false);
  const [oauthCode, setOauthCode] = useState('');
  const [isClientIdValid, setIsClientIdValid] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeSuccess, setExchangeSuccess] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const REDIRECT_URI = getRedirectUri();

  // 🔒 Carregar credenciais do banco (RLS-protegido). Nunca usar localStorage para segredos.
  useEffect(() => {
    // Limpar quaisquer credenciais legadas de localStorage (migração de segurança)
    const legacyKeys = [
      STORAGE_KEYS.CLIENT_ID,
      STORAGE_KEYS.CLIENT_SECRET,
      STORAGE_KEYS.REFRESH_TOKEN,
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_REFRESH_TOKEN',
      'youtube_oauth_client_id',
      'youtube_oauth_client_secret',
      'youtube_oauth_refresh_token',
    ];
    legacyKeys.forEach((k) => localStorage.removeItem(k));

    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: dbCreds } = await supabase
        .from('oauth_credentials')
        .select('client_id, client_secret, refresh_token')
        .eq('user_id', userData.user.id)
        .eq('provider', 'youtube')
        .maybeSingle();
      if (dbCreds) {
        setClientId(dbCreds.client_id || '');
        setClientSecret(dbCreds.client_secret || '');
        setRefreshToken(dbCreds.refresh_token || '');
        setIsClientIdValid(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(dbCreds.client_id || ''));
        if (dbCreds.client_id && dbCreds.client_secret && dbCreds.refresh_token) {
          testConnection();
        }
      }
    })();
  }, [toast]);

  // Detectar retorno do OAuth callback (igual ao Google Business)
  useEffect(() => {
    const code = location.state?.code;
    
    if (code && !manualMode) {
      console.log("✅ Código OAuth detectado:", code.substring(0, 10) + "...");
      
      // 🔒 VALIDAR SESSÃO LOVABLE ANTES DE PROCESSAR OAUTH
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) {
          console.error("❌ Sessão Lovable expirada");
          toast({
            title: "❌ Sessão expirada",
            description: "Faça login novamente no Lovable",
            variant: "destructive"
          });
          navigate('/auth');
          return;
        }
        
        console.log("✅ Sessão Lovable válida:", session.user.email);
        setOauthCode(code);
        setShowOAuthModal(true);
        setIsExchanging(true);
        
        toast({
          title: "🔄 Trocando código...",
          description: "Convertendo código OAuth em refresh token",
        });
        
        handleOAuthCode(code)
          .then(() => {
            setExchangeSuccess(true);
          })
          .catch((error) => {
            console.error("❌ Erro ao trocar código:", error);
            setIsExchanging(false);
            toast({
              title: "⚠️ Erro ao trocar código",
              description: error.message || 'Erro desconhecido',
              variant: "destructive",
            });
          })
          .finally(() => {
            setIsExchanging(false);
          });
      });
    }
  }, [location.state, manualMode, navigate]);

  const testConnection = async () => {
    setIsTesting(true);
    setStatus('checking');
    
    console.log('🧪 Testando conexão com YouTube API...');
    
    try {
      // ✅ CRITICAL: Verificar banco de dados PRIMEIRO
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Não autenticado");
      }

      const { data: dbCreds } = await supabase
        .from('oauth_credentials')
        .select('client_id, client_secret, refresh_token, updated_at')
        .eq('user_id', userData.user.id)
        .eq('provider', 'youtube')
        .maybeSingle();

      const hasDbCredentials = dbCreds?.refresh_token && dbCreds?.client_id && dbCreds?.client_secret;
      const hasLocalCredentials = clientId && clientSecret && refreshToken;

      console.log('📡 Status das credenciais:', {
        DATABASE: hasDbCredentials ? '✅ Salvo' : '❌ Vazio',
        LOCALSTORAGE: hasLocalCredentials ? '⚠️ Cache apenas' : '❌ Vazio',
        PRIORITY: hasDbCredentials ? 'BANCO (seguro)' : hasLocalCredentials ? 'CACHE (inseguro)' : 'NENHUM',
      });

      // Se não tem no banco, mas tem no localStorage, alertar
      if (!hasDbCredentials && hasLocalCredentials) {
        toast({
          title: "⚠️ Credenciais não salvas",
          description: "Você tem credenciais no cache do navegador, mas não no banco de dados. Clique em 'Salvar' para garantir persistência.",
          variant: "destructive",
        });
        setStatus('error');
        return;
      }

      // Se não tem credenciais, mostrar erro
      if (!hasDbCredentials) {
        toast({
          title: "❌ Sem credenciais",
          description: "Configure Client ID, Secret e Refresh Token primeiro.",
          variant: "destructive",
        });
        setStatus('not_configured');
        return;
      }

      // Testar conexão usando credenciais do BANCO
      const { data, error } = await supabase.functions.invoke('test-youtube-connection');
      
      if (error) throw error;

      console.log('📊 Resposta do teste:', data);

      if (data?.ok) {
        setStatus('connected');
        setChannelInfo({ name: data.channelName, count: data.channelCount });
        toast({
          title: "✅ Conectado via Banco",
          description: `Canal: ${data.channelName} (credenciais persistidas)`,
        });
      } else {
        setStatus('error');
        setChannelInfo(null);
        
        if (data?.missing?.includes('YOUTUBE_REFRESH_TOKEN')) {
          toast({
            title: "⚠️ Secret não configurado",
            description: "Configure YOUTUBE_REFRESH_TOKEN no Supabase Dashboard > Edge Functions > Secrets",
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "❌ Erro na conexão",
            description: data?.error || 'Credenciais inválidas no banco',
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      setStatus('error');
      setChannelInfo(null);
      toast({
        title: "❌ Erro",
        description: error.message || 'Falha ao testar conexão',
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!clientId || !clientSecret || !refreshToken) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha Client ID, Client Secret e Refresh Token",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      // 🔒 Credenciais salvas apenas no banco (RLS-protegido); nunca em localStorage.

      // Save to database automatically
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        toast({
          title: "❌ Erro de autenticação",
          description: "Você precisa estar logado para salvar as credenciais",
          variant: "destructive"
        });
        return;
      }

      const { data: saved, error: dbError } = await supabase
        .from('oauth_credentials')
        .upsert({
          user_id: userData.user.id,
          provider: 'youtube',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database save error:', dbError);
        toast({
          title: "⚠️ Erro ao salvar no banco",
          description: dbError.message || "Salvo localmente apenas.",
          variant: "destructive",
        });
      } else {
        console.log('✅ Saved to database:', saved);
        toast({
          title: "✅ Credenciais salvas automaticamente",
          description: "YouTube OAuth configurado no banco de dados. Pronto para usar!",
        });
      }

      // Auto-test after saving
      await testConnection();

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "❌ Erro ao salvar",
        description: error.message || 'Tente novamente',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    try {
      // Limpar localStorage
      localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
      localStorage.removeItem(STORAGE_KEYS.CLIENT_SECRET);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);

      // Limpar banco de dados
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("oauth_credentials")
          .delete()
          .eq("user_id", user.id)
          .eq("provider", "youtube");
      }

      // Resetar estado
      setClientId("");
      setClientSecret("");
      setRefreshToken("");
      setStatus("not_configured");
      setChannelInfo(null);

      toast({
        title: "🧹 Tudo limpo!",
        description: "Todas as credenciais YouTube foram removidas.",
      });
    } catch (error: any) {
      console.error("Clear all error:", error);
      toast({
        title: "❌ Erro ao limpar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openOAuthFlow = async () => {
    if (!clientId || !isClientIdValid) {
      toast({
        title: "⚠️ Client ID inválido",
        description: "Corrija o Client ID antes de gerar o token.",
        variant: "destructive",
      });
      return;
    }

    // Validar se está usando Client ID padrão
    if (clientId === DEFAULT_CLIENT_ID) {
      toast({
        title: "❌ Credenciais padrão não permitidas",
        description: "Você precisa criar suas próprias credenciais no Google Cloud Console",
        variant: "destructive"
      });
      return;
    }

    // ✅ NOVO: Validar Client Secret ANTES de abrir OAuth
    if (!clientSecret || clientSecret.trim().length < 10) {
      toast({
        title: "⚠️ Client Secret obrigatório",
        description: "Preencha o Client Secret antes de iniciar o fluxo OAuth.",
        variant: "destructive",
      });
      return;
    }

    // Carregar e-mail do usuário para login_hint
    const { data: { user } } = await supabase.auth.getUser();

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', REQUIRED_SCOPE);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent select_account');
    authUrl.searchParams.set('state', 'youtube');
    
    // Sugerir e-mail do usuário logado
    if (user?.email) {
      authUrl.searchParams.set('login_hint', user.email);
    }

    console.log('🚀 Abrindo OAuth YouTube:', {
      clientIdLast6: clientId.slice(-6),
      redirectUri: REDIRECT_URI,
      loginHint: user?.email || 'nenhum',
    });
    
    const fallbackOrigin = new URL(REDIRECT_URI).origin;

    // Usar utilitário que detecta iframe
    launchGoogleOAuth({
      authUrl: authUrl.toString(),
      source: 'youtube',
      fallbackOrigin,
      onBlocked: () => {
        toast({
          title: "⚠️ Popup bloqueado",
          description: "Se a nova aba não abriu, permita pop-ups neste site e tente novamente.",
          variant: "destructive"
        });
      }
    });
  };

  const handleOAuthCode = async (code: string) => {
    if (!code || !clientId || !clientSecret) {
      toast({
        title: "⚠️ Dados incompletos",
        description: "Preencha Client ID, Client Secret e Código OAuth.",
        variant: "destructive"
      });
      setIsExchanging(false);
      return;
    }

    console.log('🔍 Dados enviados para Edge Function:', {
      codePreview: code.slice(0, 10) + '...',
      clientIdLast6: clientId.slice(-6),
      clientIdLength: clientId.length,
      clientIdValid: /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(clientId),
      clientSecretLength: clientSecret.length,
      redirectUri: REDIRECT_URI,
    });

    setIsSaving(true);
    setIsExchanging(true);
    setExchangeSuccess(false);

    try {
      const { data } = await supabase.functions.invoke('exchange-youtube-code', {
        body: {
          code: code.trim(),
          clientId,
          clientSecret,
          redirectUri: REDIRECT_URI,
        },
      });

      // ⚠️ Trata payload estruturado (success true/false)
      if (!data?.success) {
        let errorMessage = data?.error_description || "Erro desconhecido";
        
        switch (data?.error) {
          case "redirect_uri_mismatch":
            errorMessage = `❌ Redirect URI incorreto!\n\nAdicione EXATAMENTE esta URL no Google Cloud Console:\n${REDIRECT_URI}`;
            break;
          case "invalid_grant":
            errorMessage =
              "❌ Código expirado ou já usado!\n\nO código OAuth expira em ~10 minutos e só pode ser usado uma vez.\n\nOUTRO MOTIVO COMUM: Email salvo no localStorage como Client ID. Abra 'Limpar Cache' para resolver.\n\nRedirecionando para o fluxo OAuth novamente...";
            
            // Limpar cache e sugerir refazer fluxo
            setTimeout(() => {
              localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
              localStorage.removeItem(STORAGE_KEYS.CLIENT_SECRET);
              localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
              window.location.reload();
            }, 5000);
            break;
          case "deleted_client":
            errorMessage =
              "❌ Credenciais inválidas!\n\nO Client ID/Secret foi deletado ou desativado no Google Cloud. Crie novas credenciais e atualize aqui.";
            break;
          case "invalid_client":
            errorMessage = "❌ Client ID ou Secret incorretos!\n\nVerifique se copiou corretamente do Google Cloud Console.";
            break;
          default:
            if (!data?.refresh_token) {
              errorMessage =
                "❌ Nenhum Refresh Token recebido!\n\nGaranta que a URL de autorização contém access_type=offline e prompt=consent (já aplicado pelo app).";
            }
        }

        toast({
          title: "Erro no OAuth",
          description: errorMessage,
          variant: "destructive",
        });

        console.error("OAuth exchange failed", {
          error: data?.error,
          error_description: data?.error_description,
          details: data?.details,
          redirectUri: REDIRECT_URI,
        });
        return;
      }

      // ✅ Sucesso - salvar refresh token
      console.log("✅ Token recebido com sucesso:", data.refresh_token.substring(0, 20) + "...");
      const newRefreshToken = data.refresh_token;
      setRefreshToken(newRefreshToken);
      // 🔒 Refresh token persistido apenas no banco abaixo, nunca em localStorage.

      // Save to database automatically
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData.user) {
        toast({
          title: "⚠️ Aviso",
          description: "Token obtido mas você não está logado. Salve manualmente com o botão Salvar.",
          variant: "destructive",
        });
        setShowOAuthModal(false);
        return;
      }

      const { data: saved, error: dbError } = await supabase
        .from('oauth_credentials')
        .upsert({
          user_id: userData.user.id,
          provider: 'youtube',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: newRefreshToken,
        })
        .select()
        .single();

      if (dbError) {
        console.error("Database save error:", dbError);
        toast({
          title: "⚠️ Erro ao salvar no banco",
          description: dbError.message || "Token salvo apenas localmente.",
          variant: "destructive",
        });
        setExchangeSuccess(false);
      } else {
        console.log('✅ Token saved to database:', saved);
        setExchangeSuccess(true);
        
        // Copiar token para clipboard automaticamente
        try {
          await navigator.clipboard.writeText(newRefreshToken);
          console.log('✅ Token copiado automaticamente para área de transferência');
        } catch (error) {
          console.warn('⚠️ Cópia automática falhou (permissão negada ou bloqueada):', error);
          // Não mostrar toast aqui para não ser intrusivo
        }
        
        toast({
          title: "✅ Refresh Token (1//) gerado e salvo!",
          description: "Copiado para área de transferência. Testando conexão...",
        });
        
        // Auto-test connection
        setTimeout(() => {
          testConnection();
        }, 1000);
      }
      
      setOauthCode("");
      
    } catch (err) {
      console.error("OAuth exchange exception", err);
      setExchangeSuccess(false);
      toast({
        title: "❌ Erro no OAuth",
        description: "Falha inesperada. Veja o console para detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setIsExchanging(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "✅ Copiado",
        description: `${label} copiado para a área de transferência`,
      });
    } catch (error) {
      toast({
        title: "❌ Erro ao copiar",
        description: "Tente copiar manualmente",
        variant: "destructive"
      });
    }
  };

  const getGcpConsentScreenUrl = () => {
    if (!clientId) return 'https://console.cloud.google.com/apis/credentials/consent';
    
    // Extrair project number do Client ID (formato: PROJECT_NUMBER-xxxxx.apps.googleusercontent.com)
    const match = clientId.match(/^(\d+)-/);
    if (match && match[1]) {
      return `https://console.cloud.google.com/apis/credentials/consent?project=${match[1]}`;
    }
    
    return 'https://console.cloud.google.com/apis/credentials/consent';
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      case 'checking':
        return (
          <Badge variant="outline">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Verificando...
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            Não Configurado
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">YouTube OAuth 2.0</h1>
            <p className="text-muted-foreground mt-2">
              Configure credenciais para extrair legendas de vídeos do seu canal
            </p>
          </div>
          {getStatusBadge()}
        </div>

      {clientId === DEFAULT_CLIENT_ID && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ Credenciais padrão detectadas!</strong>
            <br />
            Você não pode usar estas credenciais porque não tem acesso ao projeto GCP delas.
            <br />
            Crie suas próprias credenciais seguindo o guia abaixo.
          </AlertDescription>
        </Alert>
      )}

      {channelInfo && status === 'connected' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Canal conectado:</strong> {channelInfo.name} ({channelInfo.count} canal(is))
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta: Refresh Token precisa ser configurado manualmente */}
      {refreshToken && status !== 'connected' && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Secret YOUTUBE_REFRESH_TOKEN não configurado</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <p className="mb-2">
              O Refresh Token foi gerado e salvo localmente, mas você precisa configurá-lo manualmente nos Secrets do Supabase.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                onClick={() => copyToClipboard(refreshToken, "Refresh Token")}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copiar Token
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                asChild
              >
                <a 
                  href="https://supabase.com/dashboard/project/pgfgripuanuwwolmtknn/settings/functions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir Secrets
                </a>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>🔍 Configuração Esperada no GCP</AlertTitle>
        <AlertDescription>
          <p className="text-sm mb-2">Certifique-se de que você adicionou no Google Cloud Console:</p>
          <ul className="list-none space-y-1 text-xs font-mono bg-muted p-2 rounded">
            <li>✅ Redirect URI: <code className="text-green-600">{REDIRECT_URI}</code></li>
            <li>✅ Client ID termina com: <code className="text-blue-600">...{clientId?.slice(-6) || "------"}</code></li>
            <li>✅ Scope: <code>youtube.force-ssl</code></li>
          </ul>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais OAuth</CardTitle>
          <CardDescription>
            Obtenha estas credenciais no{' '}
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              Google Cloud Console
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Helper: Redirect URI */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Redirect URI (use no GCP)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(getRedirectUri(), 'Redirect URI')}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copiar
              </Button>
            </div>
            <code className="text-xs break-all block bg-background p-2 rounded border">
              {getRedirectUri()}
            </code>
          </div>

          {/* Helper: Required Scope */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Escopo necessário (OAuth Consent Screen)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(REQUIRED_SCOPE, 'Escopo')}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copiar
              </Button>
            </div>
            <code className="text-xs break-all block bg-background p-2 rounded border">
              {REQUIRED_SCOPE}
            </code>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientId">
              Client ID
              {clientId && (
                isClientIdValid
                  ? <span className="text-green-600 text-xs ml-2">✓ Válido</span>
                  : <span className="text-red-600 text-xs ml-2">✗ Formato incorreto</span>
              )}
            </Label>
            <Input
              id="clientId"
              type="text"
              placeholder="616806868683-xxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => {
                const v = e.target.value.trim();
                setClientId(v);
                const isValid = /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(v);
                setIsClientIdValid(isValid);
                // 🔒 Não persistir em localStorage; salvo no banco ao clicar em "Salvar".
              }}
              className={clientId && !isClientIdValid ? 'border-red-500' : ''}
              autoComplete="off"
              data-form-type="other"
            />
            {clientId && !isClientIdValid && (
              <p className="text-xs text-red-600 mt-1">
                Deve terminar com .apps.googleusercontent.com
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="GOCSPX-xxxxxxxxxxxxx"
              value={clientSecret}
              onChange={(e) => {
                const v = e.target.value.trim();
                setClientSecret(v);
                // 🔒 Não persistir secret em localStorage; salvo no banco ao clicar em "Salvar".
              }}
              autoComplete="new-password"
            />
          </div>

          {/* Alert de diferença entre 4/ e 1// */}
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>📋 Entenda a diferença:</strong><br />
              • <code>4/...</code> = código temporário (expira em 10 min)<br />
              • <code>1//...</code> = Refresh Token permanente (o que você precisa)
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="refreshToken" className="flex items-center gap-2">
              Refresh Token
              <span className="text-xs text-green-600 font-normal">
                ✓ O token válido começa com 1//
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="refreshToken"
                type="password"
                placeholder="Será preenchido após a troca do código 4/ pelo botão Gerar Token"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="flex-1"
                readOnly={isExchanging}
              />
              <Button
                variant="outline"
                onClick={openOAuthFlow}
                disabled={isExchanging}
              >
                Gerar Token
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !clientId || !clientSecret || !refreshToken}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e Testar'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={isTesting || !clientId || !clientSecret || !refreshToken}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar Agora'
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            className="w-full"
          >
            🧹 Limpar Tudo
          </Button>
        </CardContent>
      </Card>

      {/* GCP Setup Guide */}
      <Card>
        <CardHeader>
          <Collapsible open={showGcpGuide} onOpenChange={setShowGcpGuide}>
            <CollapsibleTrigger className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                <CardTitle>⚙️ Guia de Configuração no Google Cloud</CardTitle>
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${showGcpGuide ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4">
              <CardDescription className="mb-4">
                Siga este checklist para criar suas credenciais OAuth no GCP
              </CardDescription>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Criar projeto GCP + Ativar YouTube Data API v3</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Crie um novo projeto no Google Cloud Console e ative a API do YouTube
                      </p>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        asChild
                      >
                        <a
                          href="https://console.cloud.google.com/apis/library/youtube.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ativar YouTube Data API v3
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Configurar OAuth Consent Screen (External)</h4>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                        <li>Selecione "External" como tipo de usuário</li>
                        <li>Preencha nome do app e email de suporte</li>
                        <li><strong>IMPORTANTE:</strong> Adicione seu email (<code>smartdentcadcam@gmail.com</code>) como "Test User"</li>
                        <li>Adicione o escopo: <code className="text-xs bg-muted px-1 rounded">{REQUIRED_SCOPE}</code></li>
                      </ul>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        asChild
                      >
                        <a
                          href={getGcpConsentScreenUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Configurar OAuth Consent Screen
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Criar OAuth Client ID (Web application)</h4>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                        <li>Tipo: Web application</li>
                        <li>Nome: YouTube OAuth Client (ou qualquer nome)</li>
                        <li>Adicionar URI de redirecionamento autorizado:</li>
                      </ul>
                      <code className="text-xs break-all block bg-muted p-2 rounded border mt-2">
                        {getRedirectUri()}
                      </code>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        asChild
                      >
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Criar OAuth Client ID
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Copiar Client ID e Client Secret</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Após criar o OAuth Client ID, copie as credenciais e cole nos campos acima
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Documentação completa:</strong> Para mais detalhes, consulte o{' '}
                  <a 
                    href="/docs/YOUTUBE_OAUTH_SETUP.md" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    guia passo a passo completo
                  </a>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>

      <Dialog open={showOAuthModal} onOpenChange={(open) => {
        setShowOAuthModal(open);
        if (!open) { setIsExchanging(false); setExchangeSuccess(false); setOauthCode(''); }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isExchanging ? "🔄 Trocando código..." : exchangeSuccess ? "✅ Refresh Token gerado!" : "Código de Autorização"}
            </DialogTitle>
            <DialogDescription>
              {isExchanging ? "Aguarde enquanto trocamos o código 4/ por um Refresh Token 1//..." : exchangeSuccess ? "Seu Refresh Token foi gerado e salvo com sucesso!" : "Cole o código que começa com 4/... Ele será trocado por um Refresh Token (1//...) automaticamente."}
            </DialogDescription>
          </DialogHeader>
          
          {isExchanging && (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {exchangeSuccess && (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                <Check className="w-6 h-6 text-green-600 mr-2" />
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Refresh Token (1//...) salvo com sucesso!
                </span>
              </div>
              
              {/* Campo de texto para cópia manual */}
              <div className="space-y-2">
                <Label htmlFor="token-manual-copy">Refresh Token (para cópia manual)</Label>
                <Input
                  id="token-manual-copy"
                  value={refreshToken}
                  readOnly
                  className="font-mono text-xs"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    console.log('🔘 Botão "Copiar Token" clicado (YouTube)');
                    console.log('📋 refreshToken disponível?', !!refreshToken);
                    console.log('📋 refreshToken (primeiros 10 chars):', refreshToken?.substring(0, 10));
                    
                    if (!refreshToken) {
                      toast({
                        title: "❌ Token não encontrado",
                        description: "O Refresh Token não está disponível",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    try {
                      await navigator.clipboard.writeText(refreshToken);
                      console.log('✅ Token copiado com sucesso');
                      toast({
                        title: "✅ Copiado!",
                        description: "Refresh Token copiado para área de transferência"
                      });
                    } catch (error) {
                      console.error('❌ Erro ao copiar:', error);
                      toast({
                        title: "❌ Erro ao copiar",
                        description: `Tente copiar manualmente do campo acima: ${error instanceof Error ? error.message : 'Permissão negada'}`,
                        variant: "destructive"
                      });
                    }
                  }}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Token
                </Button>
                <Button variant="outline" onClick={() => setShowOAuthModal(false)}>Fechar</Button>
              </div>
            </div>
          )}

          {!isExchanging && !exchangeSuccess && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <Switch id="manual-mode" checked={manualMode} onCheckedChange={setManualMode} />
                    <Label htmlFor="manual-mode">Modo manual</Label>
                  </div>
                </AlertDescription>
              </Alert>

              <Input
                type="text"
                placeholder="4/0AfJoh..."
                value={oauthCode}
                onChange={(e) => setOauthCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isSaving && oauthCode && handleOAuthCode(oauthCode)}
                autoFocus
                disabled={isSaving}
              />

              <div className="flex gap-2">
                <Button onClick={() => handleOAuthCode(oauthCode)} disabled={isSaving || !oauthCode} className="flex-1">
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Trocando...</> : 'Trocar por Token'}
                </Button>
                <Button variant="outline" onClick={() => { setShowOAuthModal(false); setOauthCode(''); }} disabled={isSaving}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
