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
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Info, Copy, ChevronDown, Store, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopNavigation } from '@/components/TopNavigation';
import { Switch } from '@/components/ui/switch';
import { launchGoogleOAuth } from '@/lib/oauth-launcher';
import { getRedirectUri } from '@/lib/oauth';

const STORAGE_KEYS = {
  CLIENT_ID: 'google_business_client_id',
  CLIENT_SECRET: 'google_business_client_secret',
  REFRESH_TOKEN: 'google_business_refresh_token',
};

const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/business.manage openid email profile';

type ConnectionStatus = 'connected' | 'error' | 'not_configured' | 'checking';

export default function GoogleBusinessOAuthSettings() {
  console.log('🏢 GoogleBusinessOAuthSettings component mounted');
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('not_configured');
  const [accountInfo, setAccountInfo] = useState<{ name: string; count: number } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showGcpGuide, setShowGcpGuide] = useState(false);
  const [oauthCode, setOauthCode] = useState('');
  const [isClientIdValid, setIsClientIdValid] = useState(false);
  const [showDiagnosticCard, setShowDiagnosticCard] = useState(false);
  const [showFormatWarning, setShowFormatWarning] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [exchangeSuccess, setExchangeSuccess] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [dbCredentials, setDbCredentials] = useState<{
    token: string;
    updatedAt: string;
  } | null>(null);

  const REDIRECT_URI = getRedirectUri();

  // 🔒 Carregar credenciais apenas do banco (RLS-protegido). Nunca usar localStorage para segredos.
  useEffect(() => {
    // Migração de segurança: remover quaisquer credenciais legadas do localStorage
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));

    const loadDbCredentials = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: dbCreds } = await supabase
        .from('oauth_credentials')
        .select('client_id, client_secret, refresh_token, updated_at')
        .eq('user_id', userData.user.id)
        .eq('provider', 'google_business')
        .maybeSingle();

      if (dbCreds) {
        const cid = dbCreds.client_id || '';
        const csec = dbCreds.client_secret || '';
        const rtok = dbCreds.refresh_token || '';
        setClientId(cid);
        setClientSecret(csec);
        setRefreshToken(rtok);
        setIsClientIdValid(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(cid));
        setDbCredentials({
          token: rtok,
          updatedAt: dbCreds.updated_at || '',
        });

        if (cid && csec && rtok &&
            /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(cid) &&
            csec.trim().length >= 10 &&
            !rtok.startsWith('GOCSPX-') &&
            !rtok.includes('.apps.googleusercontent.com')) {
          testConnection();
        }
      }
    };

    loadDbCredentials();
  }, [toast]);

  // Detectar retorno do OAuth callback
  useEffect(() => {
    const state = location.state as any;
    if (state?.openOAuthModal && state?.code) {
      console.log("✅ OAuth callback detectado - abrindo modal com código pré-preenchido");
      
      // Sempre abrir o modal com o código
      setOauthCode(state.code);
      setShowOAuthModal(true);
      
      // Trocar automaticamente se NÃO estiver em modo manual
      if (!manualMode) {
        setIsExchanging(true);
        
        toast({
          title: "🔄 Trocando código automaticamente...",
          description: "Aguarde enquanto convertemos 4/... em 1//...",
        });
        
        handleOAuthCode(state.code)
          .then(() => {
            setExchangeSuccess(true);
          })
          .catch((error) => {
            console.error("Auto exchange failed:", error);
            setIsExchanging(false);
            toast({
              title: "⚠️ Troca automática falhou",
              description: "Clique em 'Trocar por Token' para tentar novamente.",
              variant: "destructive",
            });
          });
      } else {
        toast({
          title: "📋 Código OAuth recebido",
          description: "Modo manual ativo. Clique em 'Trocar por Token' quando estiver pronto.",
        });
      }
      
      // Limpar state para evitar reprocessar
      window.history.replaceState({}, document.title);
    }
  }, [location, manualMode]);

  // Validar formato do refresh token em tempo real e auto-abrir modal se detectar "4/"
  useEffect(() => {
    if (refreshToken) {
      const isInvalidSecret = refreshToken.startsWith("GOCSPX-");
      const isInvalidClientId = refreshToken.includes(".apps.googleusercontent.com");
      const isAuthCode = refreshToken.startsWith("4/");
      
      setShowFormatWarning(isInvalidSecret || isInvalidClientId);
      
      if (isInvalidSecret) {
        console.error("❌ Client Secret detectado no campo Refresh Token!");
        toast({
          title: "❌ Campo errado",
          description: "Você colou o Client Secret (GOCSPX-...) no campo de Refresh Token. Use o botão 'Gerar Token' para obter o token correto.",
          variant: "destructive"
        });
      }
      
      if (isInvalidClientId) {
        console.error("❌ Client ID detectado no campo Refresh Token!");
        toast({
          title: "❌ Campo errado",
          description: "Você colou o Client ID (.apps.googleusercontent.com) no campo de Refresh Token. Use o botão 'Gerar Token' para obter o token correto.",
          variant: "destructive"
        });
      }
      
      // Auto-abrir modal OAuth se detectar código de autorização "4/"
      if (isAuthCode && clientId && isClientIdValid && !showOAuthModal) {
        console.log("🔄 Código de autorização detectado (4/). Abrindo modal para troca...");
        setOauthCode(refreshToken);
        setShowOAuthModal(true);
        toast({
          title: "🔄 Código 4/ detectado",
          description: "Detectamos um código temporário. Clique em 'Trocar por Token' para gerar o Refresh Token (1//).",
        });
      }
    } else {
      setShowFormatWarning(false);
    }
  }, [refreshToken, clientId, isClientIdValid, toast, showOAuthModal]);

  const testConnection = async (useFormData = false) => {
    setIsTesting(true);
    setStatus('checking');
    
    console.log('🧪 Testando conexão com Google Business API...');
    
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
        .eq('provider', 'google_business')
        .maybeSingle();

      const hasDbCredentials = dbCreds?.refresh_token && dbCreds?.client_id && dbCreds?.client_secret;
      const hasLocalCredentials = clientId && clientSecret && refreshToken;

      console.log('📡 Status das credenciais:', {
        DATABASE: hasDbCredentials ? '✅ Salvo' : '❌ Vazio',
        LOCALSTORAGE: hasLocalCredentials ? '⚠️ Cache apenas' : '❌ Vazio',
        PRIORITY: hasDbCredentials ? 'BANCO (seguro)' : hasLocalCredentials ? 'CACHE (inseguro)' : 'NENHUM',
      });

      // Atualizar status visual de credenciais do banco
      if (hasDbCredentials) {
        setClientId(dbCreds.client_id || '');
        setClientSecret(dbCreds.client_secret || '');
        setRefreshToken(dbCreds.refresh_token || '');
        setDbCredentials({
          token: dbCreds.refresh_token,
          updatedAt: dbCreds.updated_at,
        });
      } else {
        setDbCredentials(null);
      }

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
      const body = useFormData ? {
        clientId,
        clientSecret,
        refreshToken,
      } : undefined;

      const { data, error } = await supabase.functions.invoke('test-google-business-connection', {
        body,
      });
      
      if (error) throw error;

      console.log('📊 Resposta do teste:', data);

      if (data?.ok) {
        setStatus('connected');
        setAccountInfo({ name: data.accountName, count: data.accountCount });
        const source = data.credentialSource === 'database' ? '🟢 Banco de dados' : data.credentialSource === 'form' ? '🟡 Formulário (cache)' : 'environment';
        const accounts = data.accountCount || 0;
        toast({
          title: "✅ Conectado",
          description: `${source}. ${accounts > 0 ? `${accounts} conta(s) disponível(is).` : data.accountName}`,
        });
      } else {
        setStatus('error');
        setAccountInfo(null);
        
        if (data?.error === "client_secret_in_refresh") {
          setShowDiagnosticCard(true);
          toast({
            title: "⚠️ Credencial incorreta detectada",
            description: "Client Secret foi detectado no campo Refresh Token. Use o botão 'Limpar Tudo' abaixo.",
            variant: "destructive",
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
      setAccountInfo(null);
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

    // Validar formato do Client ID
    if (!isClientIdValid || !clientId.includes('.apps.googleusercontent.com')) {
      toast({
        title: "⚠️ Client ID inválido",
        description: "Formato esperado: 123456789-abc.apps.googleusercontent.com",
        variant: "destructive"
      });
      return;
    }

    // Validar formato do Client Secret
    if (!clientSecret.startsWith('GOCSPX-')) {
      toast({
        title: "⚠️ Client Secret inválido",
        description: "Client Secret deve começar com GOCSPX-",
        variant: "destructive"
      });
      return;
    }

    // Validar formato do Refresh Token - SOMENTE aceitar "1//"
    if (refreshToken.startsWith('GOCSPX-')) {
      toast({
        title: "⚠️ Refresh Token inválido",
        description: "Você colou o Client Secret no campo Refresh Token. Gere um token válido via OAuth.",
        variant: "destructive"
      });
      return;
    }

    if (refreshToken.startsWith('4/')) {
      toast({
        title: "⚠️ Código de autorização detectado",
        description: "Você colou um código OAuth (4/...). Use o botão 'Trocar por Token' no modal para obter o Refresh Token válido (1//).",
        variant: "destructive"
      });
      return;
    }

    if (!refreshToken.startsWith('1//')) {
      toast({
        title: "⚠️ Refresh Token inválido",
        description: "Refresh Token deve começar com 1//. Use o botão 'Gerar Token' para obter via OAuth.",
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

      console.log(`[OAuth Save] Saving credentials for user: ${userData.user.id}, provider: google_business`);
      
      const { data: saved, error: dbError } = await supabase
        .from('oauth_credentials')
        .upsert(
          {
            user_id: userData.user.id,
            provider: 'google_business',
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
          },
          {
            onConflict: 'user_id,provider',
          }
        )
        .select()
        .maybeSingle();

      if (dbError) {
        console.error('[OAuth Save] Database error:', dbError);
        toast({
          title: "❌ Erro ao salvar no banco",
          description: dbError.message || "Verifique suas permissões e tente novamente.",
          variant: "destructive",
        });
        return;
      }
      
      if (saved) {
        console.log(`[OAuth Save] ✅ Credentials saved successfully with ID: ${saved.id}`);
        setDbCredentials({
          token: refreshToken,
          updatedAt: new Date().toISOString(),
        });
      } else {
        console.warn('[OAuth Save] No data returned from upsert');
      }
      
      {
        console.log('✅ Saved to database:', saved);
      }

      // Update database credentials status
      setDbCredentials({
        token: refreshToken,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Credenciais salvas automaticamente",
        description: "Google Business OAuth configurado no banco de dados. Pronto para usar!",
      });

      // Auto-test after saving (using database values)
      await testConnection(false);

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

  const openOAuthFlow = async () => {
    if (!clientId || !isClientIdValid) {
      toast({
        title: "⚠️ Client ID inválido",
        description: "Corrija o Client ID antes de gerar o token.",
        variant: "destructive",
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
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', 'google-business');
    
    // Sugerir e-mail do usuário logado
    if (user?.email) {
      authUrl.searchParams.set('login_hint', user.email);
    }

    console.log('🚀 Abrindo OAuth Google Business:', {
      clientIdLast6: clientId.slice(-6),
      redirectUri: REDIRECT_URI,
      loginHint: user?.email || 'nenhum',
    });
    
    const fallbackOrigin = new URL(REDIRECT_URI).origin;

    // Usar utilitário que detecta iframe
    launchGoogleOAuth({
      authUrl: authUrl.toString(),
      source: 'google-business',
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
      const { data } = await supabase.functions.invoke('exchange-google-business-code', {
        body: {
          code: code.trim(),
          clientId,
          clientSecret,
          redirectUri: REDIRECT_URI,
        },
      });

      if (!data?.success) {
        // Tratamento específico para invalid_grant
        if (data?.error === 'invalid_grant') {
          setShowDiagnosticCard(true);
          toast({
            title: "❌ Erro: invalid_grant",
            description: "Código inválido, expirado ou redirect URI incorreto. Verifique o card de diagnóstico abaixo.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no OAuth",
            description: data?.error_description || "Erro desconhecido",
            variant: "destructive",
          });
        }

        console.error("OAuth exchange failed", {
          error: data?.error,
          error_description: data?.error_description,
          probable_cause: data?.probable_cause,
          details: data?.details,
          redirectUri: REDIRECT_URI,
        });
        return;
      }

      // Sucesso - salvar refresh token
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
          provider: 'google_business',
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
        } catch {}
        
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

  const handleDeleteFromDatabase = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData.user) {
      toast({
        title: "❌ Erro de autenticação",
        description: "Você precisa estar autenticado",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      "Tem certeza que deseja apagar as credenciais do banco de dados?"
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("oauth_credentials")
        .delete()
        .eq("user_id", userData.user.id)
        .eq("provider", "google_business");

      if (error) {
        toast({
          title: "❌ Erro ao apagar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setDbCredentials(null);
      toast({
        title: "✅ Credenciais apagadas",
        description: "Credenciais removidas do banco de dados",
      });
    } catch (error: any) {
      toast({
        title: "❌ Erro",
        description: error.message,
        variant: "destructive",
      });
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
          .eq("provider", "google_business");
      }

      // Resetar estado
      setClientId("");
      setClientSecret("");
      setRefreshToken("");
      setStatus("not_configured");
      setAccountInfo(null);
      setDbCredentials(null);

      toast({
        title: "🧹 Tudo limpo!",
        description: "Todas as credenciais Google Business foram removidas.",
      });
    } catch (error: any) {
      console.error("Clear all error:", error);
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao apagar credenciais",
        variant: "destructive",
      });
    }
  };

  const handleClearCredentials = handleClearAll;

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
            <h1 className="text-3xl font-bold">Google Business OAuth 2.0</h1>
            <p className="text-muted-foreground mt-2">
              Configure credenciais para extrair reviews do Google Business Profile
            </p>
          </div>
          {getStatusBadge()}
        </div>

      {accountInfo && status === 'connected' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Conta conectada:</strong> {accountInfo.name} ({accountInfo.count} conta(s))
          </AlertDescription>
        </Alert>
      )}

      {/* Checklist Pré-voo */}
      <Card className="p-4 space-y-2 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <p className="font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          ✅ Checklist Pré-voo OAuth Google Business
        </p>
        <ul className="list-none pl-6 text-sm space-y-1">
          <li>{clientId && isClientIdValid ? '✅' : '❌'} Client ID formatado: {clientId ? `...${clientId.slice(-15)}` : 'não configurado'}</li>
          <li>✅ Redirect URI: <code className="text-xs">{REDIRECT_URI}</code></li>
          <li>✅ Escopo: <code className="text-xs">{REQUIRED_SCOPE}</code></li>
          <li>
            <a 
              href="https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              📌 Ativar My Business Business Information API
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>
            <a 
              href="https://console.cloud.google.com/apis/library/businessprofileperformance.googleapis.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              📌 Ativar Business Profile Performance API
              <ExternalLink className="w-3 h-3" />
            </a>
          </li>
        </ul>
      </Card>

      {/* Card de Diagnóstico invalid_grant */}
      {showDiagnosticCard && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>🔧 Diagnóstico: Erro invalid_grant</AlertTitle>
          <AlertDescription>
            <p className="text-sm mb-2">Verifique estes itens na ordem:</p>
            <ol className="list-decimal pl-5 text-sm space-y-1">
              <li>O código OAuth foi usado <strong>apenas uma vez</strong>? (expira em ~10min)</li>
              <li>O Redirect URI no GCP é <strong>exatamente</strong>: <code className="text-xs bg-muted px-1 rounded">{REDIRECT_URI}</code></li>
              <li>O escopo <code className="text-xs bg-muted px-1 rounded">{REQUIRED_SCOPE}</code> está adicionado no OAuth Consent Screen?</li>
              <li>As APIs <strong>My Business Business Information</strong> e <strong>Business Profile Performance</strong> estão ativadas?</li>
              <li>Você está logado com o mesmo email cadastrado como <strong>Test User</strong> no GCP?</li>
            </ol>
            <div className="flex gap-2 flex-wrap mt-3">
              <Button
                onClick={async () => {
                  await handleClearCredentials();
                  toast({
                    title: "✅ Limpeza concluída",
                    description: "Agora refaça o fluxo: 1) Preencha Client ID e Secret, 2) Gere Token, 3) Cole o código.",
                  });
                }}
                variant="default"
                size="sm"
              >
                🔧 Limpar e Reconfigurar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowDiagnosticCard(false)}
              >
                Fechar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                onClick={() => copyToClipboard(REDIRECT_URI, 'Redirect URI')}
              >
                <Copy className="w-4 h-4 mr-1" />
                Copiar
              </Button>
            </div>
            <code className="text-xs break-all block bg-background p-2 rounded border">
              {REDIRECT_URI}
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
            <Label htmlFor="clientId" className="flex items-center gap-2">
              Client ID
              {clientId && (
                isClientIdValid
                  ? <span className="text-green-600 text-xs ml-2">✓ Válido</span>
                  : <span className="text-red-600 text-xs ml-2">✗ Formato incorreto</span>
              )}
              <span className="text-xs text-muted-foreground font-normal">
                (termina com .apps.googleusercontent.com)
              </span>
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
                if (isValid) localStorage.setItem(STORAGE_KEYS.CLIENT_ID, v);
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
            <Label htmlFor="clientSecret" className="flex items-center gap-2">
              Client Secret
              <span className="text-xs text-muted-foreground font-normal">
                (começa com GOCSPX-)
              </span>
            </Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="GOCSPX-xxxxxxxxxxxxx"
              value={clientSecret}
              onChange={(e) => {
                const v = e.target.value.trim();
                setClientSecret(v);
                localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, v);
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
                disabled={!clientId || !isClientIdValid || isExchanging}
                title={!clientId || !isClientIdValid ? "Configure o Client ID primeiro" : ""}
              >
                Gerar Token
              </Button>
            </div>
            {showFormatWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ <strong>Campo errado detectado!</strong> O Refresh Token deve começar com <code>1//</code>.<br />
                  Use o botão "Gerar Token" acima para obter via OAuth.
                </AlertDescription>
              </Alert>
            )}
            {refreshToken.startsWith('4/') && !showOAuthModal && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  🔄 <strong>Código 4/ detectado.</strong> Clique em "Trocar por Token" no modal para gerar o Refresh Token (1//).
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Database Status */}
          {dbCredentials && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Status no Banco de Dados</AlertTitle>
              <AlertDescription className="space-y-1">
                <div className="text-sm">
                  <strong>Token:</strong>{" "}
                  {dbCredentials.token.startsWith("1//") ? (
                    <Badge variant="default" className="ml-1">✓ Refresh Token (1//...)</Badge>
                  ) : dbCredentials.token.startsWith("4/") ? (
                    <Badge variant="destructive" className="ml-1">✗ Código de Autorização (4/...)</Badge>
                  ) : (
                    <Badge variant="secondary" className="ml-1">Outro formato</Badge>
                  )}
                </div>
                <div className="text-sm">
                  <strong>Atualizado:</strong>{" "}
                  {new Date(dbCredentials.updatedAt).toLocaleString("pt-BR")}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-4 flex-wrap">
            <Button
              onClick={handleSave}
              disabled={isSaving || !clientId || !clientSecret || !refreshToken || showFormatWarning || !refreshToken.startsWith('1//')}
              className="flex-1"
              title={
                !refreshToken.startsWith('1//') && refreshToken
                  ? "Refresh Token inválido. Deve começar com 1//"
                  : undefined
              }
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar e Testar (com banco)'
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => testConnection(true)}
              disabled={
                isTesting ||
                !clientId ||
                !clientSecret ||
                !refreshToken ||
                showFormatWarning ||
                !refreshToken.startsWith("1//")
              }
              title={
                !refreshToken.startsWith("1//") && refreshToken
                  ? "Refresh Token inválido. Deve começar com 1//"
                  : undefined
              }
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar Agora (com formulário)'
              )}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteFromDatabase}
              disabled={!dbCredentials}
              className="flex-1"
            >
              Apagar do Banco
            </Button>

            <Button
              onClick={handleClearAll}
              variant="destructive"
              size="sm"
              className="flex-1"
            >
              🧹 Limpar Tudo
            </Button>
            <Button
              onClick={handleDeleteFromDatabase}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              🗑️ Deletar do Banco
            </Button>
          </div>
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
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Criar projeto GCP + Ativar Google My Business API</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Crie um novo projeto no Google Cloud Console e ative a API do Google Business
                      </p>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2"
                        asChild
                      >
                        <a
                          href="https://console.cloud.google.com/apis/library/mybusiness.googleapis.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ativar Google My Business API
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>

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

                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">Criar OAuth Client ID (Web application)</h4>
                       <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                         <li>Tipo: Web application</li>
                         <li>Nome: Google Business OAuth Client</li>
                         <li>Adicionar URI de redirecionamento autorizado:</li>
                       </ul>
                       <code className="text-xs break-all block bg-muted p-2 rounded border mt-2">
                         {REDIRECT_URI}
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardHeader>
      </Card>

      <Dialog open={showOAuthModal} onOpenChange={(open) => {
        setShowOAuthModal(open);
        if (!open) {
          setIsExchanging(false);
          setExchangeSuccess(false);
          setOauthCode('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isExchanging ? "🔄 Trocando código..." : exchangeSuccess ? "✅ Refresh Token gerado!" : "Código de Autorização"}
            </DialogTitle>
            <DialogDescription>
              {isExchanging 
                ? "Aguarde enquanto trocamos o código 4/ por um Refresh Token 1//..." 
                : exchangeSuccess
                ? "Seu Refresh Token foi gerado e salvo com sucesso!"
                : "Cole o código que começa com 4/... Ele será trocado por um Refresh Token (1//...) automaticamente."}
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
                    console.log('🔘 Botão "Copiar Token" clicado');
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
                <Button
                  variant="outline"
                  onClick={() => setShowOAuthModal(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}

          {!isExchanging && !exchangeSuccess && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1 text-sm">
                    <div><strong>Modo Manual:</strong></div>
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        id="manual-mode"
                        checked={manualMode}
                        onCheckedChange={setManualMode}
                      />
                      <Label htmlFor="manual-mode" className="cursor-pointer">
                        Desabilitar troca automática
                      </Label>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Input
                type="text"
                placeholder="4/0AfJoh..."
                value={oauthCode}
                onChange={(e) => setOauthCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSaving && oauthCode) {
                    handleOAuthCode(oauthCode);
                  }
                }}
                autoFocus
                disabled={isSaving}
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => handleOAuthCode(oauthCode)}
                  disabled={isSaving || !oauthCode}
                  className="flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Trocando...
                    </>
                  ) : (
                    'Trocar por Token'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOAuthModal(false);
                    setOauthCode('');
                  }}
                  disabled={isSaving}
                >
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
