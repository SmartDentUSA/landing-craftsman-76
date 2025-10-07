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
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Info, Copy, ChevronDown, Store } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopNavigation } from '@/components/TopNavigation';

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
  const [dbCredentials, setDbCredentials] = useState<{
    token: string;
    updatedAt: string;
  } | null>(null);

  const REDIRECT_URI = `${window.location.origin}/oauth2/callback`;

  // Limpar chaves inválidas e carregar valores
  useEffect(() => {
    console.log('🔍 Verificando localStorage do Google Business OAuth...');
    
    // Limpar valores inválidos (similar ao YouTube OAuth)
    const cleanupInvalidKeys = () => {
      let cleanedCount = 0;
      
      Object.values(STORAGE_KEYS).forEach((key) => {
        const value = localStorage.getItem(key);
        if (!value) return;

        // Limpar se não for string válida
        if (typeof value !== 'string' || value === 'undefined' || value === 'null') {
          console.log(`🧹 Removendo valor inválido de ${key}`);
          localStorage.removeItem(key);
          cleanedCount++;
          return;
        }

        // Validações específicas
        if (key === STORAGE_KEYS.CLIENT_ID) {
          // Client ID deve ser formato: 123456789-abc.apps.googleusercontent.com
          if (!value.includes('.apps.googleusercontent.com') || value.startsWith('GOCSPX-')) {
            console.log(`🧹 Removendo Client ID inválido (formato incorreto): ${value.slice(0, 20)}...`);
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } else if (key === STORAGE_KEYS.CLIENT_SECRET) {
          // Client Secret deve começar com GOCSPX-
          if (!value.startsWith('GOCSPX-')) {
            console.log(`🧹 Removendo Client Secret inválido: ${value.slice(0, 10)}...`);
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } else if (key === STORAGE_KEYS.REFRESH_TOKEN) {
          // Refresh Token deve começar com 1// ou 4/ (não GOCSPX-)
          if (value.startsWith('GOCSPX-')) {
            console.log(`🧹 Removendo Refresh Token inválido (Client Secret detectado): ${value.slice(0, 20)}...`);
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      });

      if (cleanedCount > 0) {
        toast({
          title: "🧹 Cache limpo",
          description: `${cleanedCount} valor(es) inválido(s) removido(s)`,
        });
      }
    };

    cleanupInvalidKeys();

    const cid = localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || '';
    const csec = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET) || '';
    const rtok = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '';
    
    console.log('📊 Credenciais carregadas:', {
      clientId: cid ? `${cid.slice(0, 20)}...${cid.slice(-20)}` : 'vazio',
      clientSecret: csec ? `${csec.slice(0, 10)}...` : 'vazio',
      refreshToken: rtok ? `${rtok.slice(0, 10)}...` : 'vazio',
      clientIdValid: /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(cid),
      clientSecretValid: csec.startsWith('GOCSPX-'),
      refreshTokenValid: rtok && (rtok.startsWith('1//') || rtok.startsWith('4/')) && !rtok.startsWith('GOCSPX-'),
    });

    setClientId(cid);
    setClientSecret(csec);
    setRefreshToken(rtok);

    setIsClientIdValid(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(cid));

    // Load database credentials for status display
    const loadDbCredentials = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: dbCreds } = await supabase
        .from('google_business_oauth_credentials')
        .select('refresh_token, updated_at')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (dbCreds) {
        setDbCredentials({
          token: dbCreds.refresh_token || '',
          updatedAt: dbCreds.updated_at || '',
        });
      }
    };

    loadDbCredentials();

    // Auto-test connection if all credentials exist and are valid format
    if (cid && csec && rtok && 
        /^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(cid) &&
        csec.trim().length >= 10 &&
        !rtok.startsWith('GOCSPX-') &&
        !rtok.includes('.apps.googleusercontent.com')) {
      testConnection();
    }
  }, [toast]);

  // Detectar retorno do OAuth callback
  useEffect(() => {
    const state = location.state as any;
    if (state?.openOAuthModal && state?.code) {
      console.log("OAuth callback detected, automatically exchanging code");
      
      // Trocar código automaticamente
      toast({
        title: "🔄 Trocando código automaticamente...",
        description: "Aguarde enquanto convertemos o código OAuth em Refresh Token.",
      });
      
      handleOAuthCode(state.code).catch((error) => {
        console.error("Auto exchange failed:", error);
        // Se falhar, abrir modal para retry manual
        setOauthCode(state.code);
        setShowOAuthModal(true);
      });
      
      // Limpar state para evitar reprocessar
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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
          title: "❌ Erro de campo",
          description: "Você colou o Client Secret no campo Refresh Token. Use o campo correto acima.",
          variant: "destructive"
        });
      }
      
      if (isInvalidClientId) {
        console.error("❌ Client ID detectado no campo Refresh Token!");
        toast({
          title: "❌ Erro de campo",
          description: "Você colou o Client ID no campo Refresh Token. Use o campo correto acima.",
          variant: "destructive"
        });
      }
      
      // Auto-abrir modal OAuth se detectar código de autorização "4/"
      if (isAuthCode && clientId && isClientIdValid) {
        console.log("🔄 Código de autorização detectado (4/). Abrindo modal para troca...");
        setOauthCode(refreshToken);
        setShowOAuthModal(true);
        toast({
          title: "🔄 Código OAuth detectado",
          description: "Clique em 'Trocar por Token' para obter o Refresh Token válido.",
        });
      }
    } else {
      setShowFormatWarning(false);
    }
  }, [refreshToken, clientId, isClientIdValid, toast]);

  const testConnection = async (useFormData = false) => {
    setIsTesting(true);
    setStatus('checking');
    
    console.log('🧪 Testando conexão com Google Business API...');
    console.log('📡 Credenciais configuradas:', {
      CLIENT_ID: clientId ? '✅ Sim' : '❌ Não',
      CLIENT_SECRET: clientSecret ? '✅ Sim' : '❌ Não',
      REFRESH_TOKEN: refreshToken ? '✅ Sim' : '❌ Não',
      SOURCE: useFormData ? 'FORMULÁRIO' : 'BANCO DE DADOS',
    });
    
    try {
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
        const source = data.credentialSource === 'form' ? 'formulário' : data.credentialSource === 'database' ? 'banco de dados' : 'environment';
        toast({
          title: "✅ Conectado",
          description: `Conta: ${data.accountName} (Fonte: ${source})`,
        });
      } else {
        setStatus('error');
        setAccountInfo(null);
        
        // Se detectar client_secret no refresh_token, auto-abrir diagnóstico
        if (data?.error === "client_secret_in_refresh") {
          setShowDiagnosticCard(true);
          toast({
            title: "⚠️ Credencial incorreta detectada",
            description: "Client Secret foi detectado no campo Refresh Token. Use o botão 'Limpar e Reconfigurar' abaixo.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "❌ Erro na conexão",
            description: data?.error || 'Credenciais inválidas',
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
      // Save to localStorage for quick access
      localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
      localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, clientSecret);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

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

      const { error: dbError } = await supabase
        .from('google_business_oauth_credentials')
        .upsert({
          user_id: userData.user.id,
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        });

      if (dbError) {
        console.error('Database save error:', dbError);
        throw new Error('Erro ao salvar no banco de dados');
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

  const openOAuthFlow = () => {
    if (!clientId || !isClientIdValid) {
      toast({
        title: "⚠️ Client ID inválido",
        description: "Corrija o Client ID antes de gerar o token.",
        variant: "destructive",
      });
      return;
    }

    const scope = REQUIRED_SCOPE;
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('state', 'google-business');

    console.log('🚀 Abrindo OAuth:', {
      clientIdLast6: clientId.slice(-6),
      redirectUri: REDIRECT_URI,
    });

    setShowOAuthModal(true);
    
    const newWindow = window.open(authUrl.toString(), "_blank", "noopener,noreferrer");
    
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      toast({
        title: "⚠️ Popup bloqueado",
        description: "Permita popups neste site e tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleOAuthCode = async (code: string) => {
    if (!code || !clientId || !clientSecret) {
      toast({
        title: "⚠️ Dados incompletos",
        description: "Preencha Client ID, Client Secret e Código OAuth.",
        variant: "destructive"
      });
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
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

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

      const { error: dbError } = await supabase
        .from('google_business_oauth_credentials')
        .upsert({
          user_id: userData.user.id,
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: newRefreshToken,
        });

      if (dbError) {
        console.error("Database save error:", dbError);
        toast({
          title: "⚠️ Token obtido",
          description: "Token salvo localmente, mas erro ao salvar no banco. Use o botão Salvar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Configuração completa!",
          description: "Credenciais salvas automaticamente no banco de dados. Pronto para usar!",
        });
      }
      
      setShowOAuthModal(false);
      setOauthCode("");
      
      // Auto-test connection
      setTimeout(() => testConnection(), 500);
    } catch (err) {
      console.error("OAuth exchange exception", err);
      toast({
        title: "❌ Erro no OAuth",
        description: "Falha inesperada. Veja o console para detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
        .from("google_business_oauth_credentials")
        .delete()
        .eq("user_id", userData.user.id);

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
        description: error.message || "Erro ao apagar credenciais",
        variant: "destructive",
      });
    }
  };

  const handleClearCredentials = async () => {
    const confirmed = window.confirm(
      "Tem certeza que deseja limpar o formulário E apagar do banco de dados?"
    );

    if (!confirmed) return;

    console.log('🧹 Limpando TODOS os dados do Google Business OAuth...');
    
    localStorage.removeItem(STORAGE_KEYS.CLIENT_ID);
    localStorage.removeItem(STORAGE_KEYS.CLIENT_SECRET);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('google_business_oauth_credentials')
        .delete()
        .eq('user_id', user.id);
    }
    
    setClientId('');
    setClientSecret('');
    setRefreshToken('');
    setStatus('not_configured');
    setAccountInfo(null);
    setShowDiagnosticCard(false);
    setIsClientIdValid(false);
    setDbCredentials(null);
    setShowFormatWarning(false);
    
    toast({ 
      title: "🧹 Cache limpo completamente", 
      description: "Todos os dados foram removidos. Configure as credenciais novamente." 
    });
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

          <div className="space-y-2">
            <Label htmlFor="refreshToken" className="flex items-center gap-2">
              Refresh Token
              <span className="text-xs text-muted-foreground font-normal">
                (gerado via OAuth, deve começar com 1//)
              </span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="refreshToken"
                type="password"
                placeholder="Gerado pelo botão 'Gerar Token' (deve começar com 1//)"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={openOAuthFlow}
                disabled={!clientId || !isClientIdValid}
                title={!clientId || !isClientIdValid ? "Configure o Client ID primeiro" : ""}
              >
                Gerar Token
              </Button>
            </div>
            {showFormatWarning && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ <strong>Client Secret detectado!</strong> O Refresh Token deve começar com <code>1//</code>, não com <code>GOCSPX-</code>.
                  <br />
                  Use o botão "Limpar Token e Refazer OAuth" abaixo.
                </AlertDescription>
              </Alert>
            )}
            {refreshToken.startsWith('4/') && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  ℹ️ Código de autorização detectado (4/...). Clique em "Trocar por Token" no modal que se abriu para obter o Refresh Token válido (1//).
                </AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground">
              💡 O Refresh Token válido sempre começa com <code>1//</code>. Use o botão "Gerar Token" para iniciar o fluxo OAuth.
            </p>
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
              variant="outline"
              size="sm"
              onClick={handleClearCredentials}
              className="flex-1"
            >
              🗑️ Limpar Tudo
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="flex-1"
            >
              🧹 Limpar Cache e Recarregar
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

      <Dialog open={showOAuthModal} onOpenChange={setShowOAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código de Autorização</DialogTitle>
            <DialogDescription>
              Cole o código OAuth recebido após autorização:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="4/0AfJoh..."
              value={oauthCode}
              onChange={(e) => setOauthCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleOAuthCode(oauthCode);
                }
              }}
              autoFocus
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
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
