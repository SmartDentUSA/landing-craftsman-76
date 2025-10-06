# YouTube OAuth 2.0 - Código Completo

## 1. Backend - Edge Functions

### 1.1. exchange-youtube-code/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200, // ⬅️ SEMPRE 200
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, clientId, clientSecret, redirectUri } = await req.json();
    const effectiveRedirectUri =
      redirectUri || Deno.env.get("YOUTUBE_REDIRECT_URI") || "";

    if (!code || !clientId || !clientSecret || !effectiveRedirectUri) {
      return json({
        success: false,
        error: "missing_params",
        error_description: "Parâmetros obrigatórios ausentes",
        details: { clientIdLast6: clientId?.slice(-6), redirectUri: effectiveRedirectUri },
      });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: effectiveRedirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    // 🔎 Log estruturado (sem dados sensíveis)
    console.log("exchange-youtube-code", {
      ok: tokenRes.ok,
      status: tokenRes.status,
      google_error: tokenData?.error,
      google_error_description: tokenData?.error_description,
      clientIdLast6: clientId.slice(-6),
      redirectUri: effectiveRedirectUri,
      codePreview: String(code).slice(0, 6) + "...",
    });

    if (!tokenRes.ok || !tokenData?.refresh_token) {
      return json({
        success: false,
        error: tokenData?.error || "unknown_error",
        error_description:
          tokenData?.error_description || "Falha ao trocar código por token",
        details: {
          status: tokenRes.status,
          clientIdLast6: clientId.slice(-6),
          redirectUri: effectiveRedirectUri,
        },
      });
    }

    return json({
      success: true,
      refresh_token: tokenData.refresh_token,
    });
  } catch (err) {
    console.error("exchange-youtube-code exception", err);
    return json({
      success: false,
      error: "exception",
      error_description: "Erro inesperado na Edge Function",
    });
  }
});
```

### 1.2. test-youtube-connection/index.ts

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function logPreview(value: string, label: string = ''): void {
  const preview = value.length > 50 ? `${value.substring(0, 50)}...` : value;
  console.log(`${label}: ${preview}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('🔍 Checking YouTube OAuth credentials...');

    // Try to get user-specific credentials from database first
    let clientId, clientSecret, refreshToken;
    let credentialSource = 'environment';
    
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      
      if (user) {
        const { data: credsData } = await supabaseClient
          .from('youtube_oauth_credentials')
          .select('client_id, client_secret, refresh_token')
          .eq('user_id', user.id)
          .single();

        if (credsData) {
          clientId = credsData.client_id;
          clientSecret = credsData.client_secret;
          refreshToken = credsData.refresh_token;
          credentialSource = 'database';
          console.log('✅ Using credentials from database for user:', user.id);
        }
      }
    }

    // Fallback to environment variables if no user-specific credentials
    if (!clientId || !clientSecret || !refreshToken) {
      console.log('⚠️ Using credentials from environment variables');
      clientId = Deno.env.get('YOUTUBE_CLIENT_ID');
      clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
      refreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');
    }
    
    if (!clientId || !clientSecret || !refreshToken) {
      const missing = [];
      if (!clientId) missing.push('YOUTUBE_CLIENT_ID');
      if (!clientSecret) missing.push('YOUTUBE_CLIENT_SECRET');
      if (!refreshToken) missing.push('YOUTUBE_REFRESH_TOKEN');
      
      console.log('❌ Missing secrets:', missing.join(', '));
      
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: 'Missing YouTube OAuth credentials',
          missing 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logPreview(clientId, '✅ Client ID');
    logPreview(clientSecret, '✅ Client Secret');
    logPreview(refreshToken, '✅ Refresh Token');

    console.log('🔄 Exchanging refresh_token for access_token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('❌ Token refresh failed:', tokenData);
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: tokenData.error_description || 'Failed to refresh access token',
          details: tokenData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = tokenData.access_token;
    logPreview(accessToken, '✅ New Access Token');

    console.log('🧪 Testing YouTube API connection...');
    const youtubeResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const youtubeData = await youtubeResponse.json();

    if (!youtubeResponse.ok) {
      console.error('❌ YouTube API test failed:', youtubeData);
      return new Response(
        JSON.stringify({ 
          ok: false,
          error: youtubeData.error?.message || 'YouTube API test failed',
          details: youtubeData 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const channelTitle = youtubeData.items?.[0]?.snippet?.title || 'Unknown';
    const channelId = youtubeData.items?.[0]?.id || 'Unknown';
    
    console.log('✅ YouTube API connection successful!');
    console.log(`📺 Channel: ${channelTitle} (${channelId})`);

    return new Response(
      JSON.stringify({ 
        ok: true,
        channelTitle,
        channelId,
        credentialSource,
        message: `YouTube OAuth credentials are valid (Source: ${credentialSource})`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Error in test-youtube-connection:', error);
    
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: 'Failed to test YouTube connection',
        details: (error as Error).message 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

## 2. Frontend - React Component

### 2.1. src/pages/YouTubeOAuthSettings.tsx (Parte 1/3)

```typescript
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, Copy, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Storage keys
const STORAGE_KEYS = {
  CLIENT_ID: 'youtube_client_id',
  CLIENT_SECRET: 'youtube_client_secret',
  REFRESH_TOKEN: 'youtube_refresh_token',
  INVALID_KEY_PREFIX: 'youtube_oauth_'
} as const;

const DEFAULT_CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
const REQUIRED_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

export default function YouTubeOAuthSettings() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{ title: string; id: string } | null>(null);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [oauthCode, setOauthCode] = useState("");
  const [isExchanging, setIsExchanging] = useState(false);
  const [showFormatWarning, setShowFormatWarning] = useState(false);
  const { toast } = useToast();

  // Clean up any invalid localStorage keys on mount
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEYS.INVALID_KEY_PREFIX) && 
            !Object.values(STORAGE_KEYS).includes(key as any)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error cleaning localStorage:', error);
    }
  }, []);

  // Load existing credentials
  useEffect(() => {
    const loadCredentials = async () => {
      // Try localStorage first
      const storedClientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);
      const storedClientSecret = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET);
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

      if (storedClientId) setClientId(storedClientId);
      if (storedClientSecret) setClientSecret(storedClientSecret);
      if (storedRefreshToken) setRefreshToken(storedRefreshToken);

      // Try to load from database if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('youtube_oauth_credentials')
          .select('client_id, client_secret, refresh_token')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setClientId(data.client_id);
          setClientSecret(data.client_secret);
          setRefreshToken(data.refresh_token);
        }
      }
    };

    loadCredentials();
  }, []);

  // Auto-test connection if all credentials are present
  useEffect(() => {
    if (clientId && clientSecret && refreshToken && status === 'idle') {
      testConnection();
    }
  }, [clientId, clientSecret, refreshToken]);

  // Check if we're returning from OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      setOauthCode(code);
      setShowOAuthModal(true);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setStatus('testing');

    try {
      const { data, error } = await supabase.functions.invoke('test-youtube-connection', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      if (data.ok) {
        setStatus('success');
        setChannelInfo({ title: data.channelTitle, id: data.channelId });
        toast({
          title: "✅ Conexão estabelecida!",
          description: `Canal: ${data.channelTitle}`,
        });
      } else {
        setStatus('error');
        toast({
          title: "❌ Erro na conexão",
          description: data.error || "Verifique suas credenciais",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setStatus('error');
      toast({
        title: "❌ Erro ao testar conexão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!clientId || !clientSecret || !refreshToken) {
      toast({
        title: "⚠️ Campos obrigatórios",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    // Validate formats
    if (!clientId.includes('.apps.googleusercontent.com')) {
      toast({
        title: "❌ Client ID inválido",
        description: "Client ID deve terminar com .apps.googleusercontent.com",
        variant: "destructive",
      });
      return;
    }

    if (!clientSecret.startsWith('GOCSPX-')) {
      toast({
        title: "❌ Client Secret inválido",
        description: "Client Secret deve começar com GOCSPX-",
        variant: "destructive",
      });
      return;
    }

    if (!refreshToken.startsWith('1//')) {
      toast({
        title: "❌ Refresh Token inválido",
        description: "Use o botão 'Gerar Token' para obter um token válido (deve começar com 1//)",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
    localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, clientSecret);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

    // Save to database
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('youtube_oauth_credentials')
        .upsert({
          user_id: user.id,
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        });

      if (error) {
        toast({
          title: "❌ Erro ao salvar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "✅ Credenciais salvas",
      description: "Testando conexão...",
    });

    testConnection();
  };

  // Continue in Part 2...
```

### 2.2. src/pages/YouTubeOAuthSettings.tsx (Parte 2/3)

```typescript
  // ... continued from Part 1

  const openOAuthFlow = () => {
    if (!clientId) {
      toast({
        title: "⚠️ Client ID necessário",
        description: "Preencha o Client ID antes de gerar o token",
        variant: "destructive",
      });
      return;
    }

    if (!clientId.includes('.apps.googleusercontent.com')) {
      toast({
        title: "❌ Client ID inválido",
        description: "Formato esperado: XXXXX.apps.googleusercontent.com",
        variant: "destructive",
      });
      return;
    }

    const redirectUri = getRedirectUri();
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
    })}`;

    const authWindow = window.open(authUrl, 'YouTube OAuth', 'width=600,height=700');
    
    toast({
      title: "🔐 Autorizando...",
      description: "Complete a autorização na janela aberta",
    });

    setShowOAuthModal(true);
  };

  const handleOAuthCode = async (code: string) => {
    if (!code || !clientId || !clientSecret) {
      toast({
        title: "⚠️ Dados incompletos",
        description: "Certifique-se de ter Client ID e Secret preenchidos",
        variant: "destructive",
      });
      return;
    }

    setIsExchanging(true);

    try {
      const { data, error } = await supabase.functions.invoke('exchange-youtube-code', {
        body: {
          code: code.trim(),
          clientId,
          clientSecret,
          redirectUri: getRedirectUri(),
        },
      });

      if (error) throw error;

      if (!data.success) {
        let userMessage = data.error_description || data.error || "Erro desconhecido";
        let toastTitle = "❌ Erro ao trocar código";

        // Erros específicos do Google OAuth
        if (data.error === "redirect_uri_mismatch") {
          toastTitle = "❌ Redirect URI Incorreto";
          userMessage = `A URI configurada no GCP não corresponde. Configure exatamente: ${getRedirectUri()}`;
        } else if (data.error === "invalid_grant") {
          if (data.error_description?.includes("redirect_uri")) {
            toastTitle = "❌ Redirect URI Inválida";
            userMessage = "A redirect_uri usada para gerar o código é diferente da usada agora. Gere um novo código.";
          } else if (data.error_description?.includes("Bad Request")) {
            toastTitle = "⏰ Código Expirado";
            userMessage = "O código de autorização expirou ou já foi usado. Gere um novo código.";
          }
        } else if (data.error === "invalid_client") {
          toastTitle = "❌ Client ID/Secret Inválidos";
          userMessage = "Verifique se o Client ID e Client Secret estão corretos no Google Cloud Console.";
        }

        toast({
          title: toastTitle,
          description: userMessage,
          variant: "destructive",
        });
        return;
      }

      const newRefreshToken = data.refresh_token;
      setRefreshToken(newRefreshToken);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('youtube_oauth_credentials')
          .upsert({
            user_id: user.id,
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: newRefreshToken,
          });
      }

      setShowOAuthModal(false);
      setOauthCode("");

      toast({
        title: "✅ Token obtido com sucesso!",
        description: "Refresh Token salvo. Testando conexão...",
      });

      setTimeout(() => testConnection(), 500);

    } catch (error: any) {
      toast({
        title: "❌ Erro na troca de código",
        description: error.message || "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsExchanging(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "📋 Copiado!",
      description: `${label} copiado para área de transferência`,
    });
  };

  const getRedirectUri = () => {
    return window.location.origin + '/youtube-oauth';
  };

  const getGcpConsentScreenUrl = () => {
    return 'https://console.cloud.google.com/apis/credentials/consent';
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      case 'testing':
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testando...</Badge>;
      default:
        return <Badge variant="outline"><HelpCircle className="w-3 h-3 mr-1" />Não configurado</Badge>;
    }
  };

  // Continue in Part 3...
```

### 2.3. src/pages/YouTubeOAuthSettings.tsx (Parte 3/3 - UI Render)

```typescript
  // ... continued from Part 2

  return (
    <div className="container max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">YouTube OAuth 2.0</h1>
          <p className="text-muted-foreground">Configure suas credenciais do YouTube Data API</p>
        </div>
        {getStatusBadge()}
      </div>

      {clientId === DEFAULT_CLIENT_ID && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Você está usando o Client ID padrão. Substitua pelos seus próprios valores do Google Cloud Console.
          </AlertDescription>
        </Alert>
      )}

      {status === 'success' && channelInfo && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Conectado ao canal: <strong>{channelInfo.title}</strong> (ID: {channelInfo.id})
          </AlertDescription>
        </Alert>
      )}

      {refreshToken && !refreshToken.startsWith('1//') && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            O Refresh Token deve começar com <code>1//</code>. Use o botão "Gerar Token" para obter um token válido.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuração Esperada no GCP</CardTitle>
          <CardDescription>
            Certifique-se de que estas configurações estão corretas no Google Cloud Console
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Redirect URI (OAuth 2.0 Client)</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                {getRedirectUri()}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getRedirectUri(), 'Redirect URI')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">Escopo OAuth (OAuth Consent Screen)</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm">
                {REQUIRED_SCOPE}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(REQUIRED_SCOPE, 'Escopo')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => window.open(getGcpConsentScreenUrl(), '_blank')}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir GCP Console (OAuth Consent Screen)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credenciais OAuth</CardTitle>
          <CardDescription>
            Obtenha estas credenciais no Google Cloud Console → APIs & Services → Credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clientId">Client ID</Label>
              <span className="text-xs text-muted-foreground">
                Deve terminar com .apps.googleusercontent.com
              </span>
            </div>
            <Input
              id="clientId"
              placeholder="123456789-abc.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <span className="text-xs text-muted-foreground">
                Deve começar com GOCSPX-
              </span>
            </div>
            <Input
              id="clientSecret"
              type="password"
              placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxx"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="refreshToken">Refresh Token</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={openOAuthFlow}
                disabled={!clientId || showFormatWarning}
              >
                🔐 Gerar Token
              </Button>
            </div>
            <Input
              id="refreshToken"
              type="password"
              placeholder="Gerado pelo botão 'Gerar Token' (deve começar com 1//)"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              className="flex-1"
              disabled={!clientId || !clientSecret || !refreshToken || showFormatWarning || !refreshToken.startsWith('1//')}
            >
              💾 Salvar e Testar
            </Button>
            <Button 
              onClick={testConnection} 
              variant="outline"
              disabled={isTesting || !clientId || !clientSecret || !refreshToken}
            >
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : '🧪'} Testar Agora
            </Button>
            <Button 
              onClick={() => {
                localStorage.clear();
                setClientId("");
                setClientSecret("");
                setRefreshToken("");
                setStatus('idle');
                setChannelInfo(null);
                toast({ title: "🗑️ Cache limpo" });
              }}
              variant="destructive"
            >
              🗑️ Limpar Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            📖 Ver guia completo de configuração do GCP
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">1. Criar Projeto no GCP</h4>
                <p className="text-muted-foreground">
                  Acesse <a href="https://console.cloud.google.com" target="_blank" className="text-primary underline">Google Cloud Console</a> e crie um novo projeto.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Habilitar YouTube Data API v3</h4>
                <p className="text-muted-foreground">
                  Em "APIs & Services" → "Library", busque por "YouTube Data API v3" e habilite.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Configurar OAuth Consent Screen</h4>
                <p className="text-muted-foreground">
                  Em "OAuth consent screen", configure como "External" e adicione o escopo: <code className="bg-muted px-1">{REQUIRED_SCOPE}</code>
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. Criar Credenciais OAuth 2.0</h4>
                <p className="text-muted-foreground">
                  Em "Credentials" → "Create Credentials" → "OAuth client ID", escolha "Web application" e adicione a redirect URI: <code className="bg-muted px-1">{getRedirectUri()}</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={showOAuthModal} onOpenChange={setShowOAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🔐 Código de Autorização</DialogTitle>
            <DialogDescription>
              Cole o código que você recebeu após autorizar o aplicativo no Google
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Cole o código aqui (começa com 4/...)"
            value={oauthCode}
            onChange={(e) => setOauthCode(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOAuthModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => handleOAuthCode(oauthCode)}
              disabled={!oauthCode || isExchanging}
            >
              {isExchanging ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Trocar por Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

## 3. Database Schema

```sql
CREATE TABLE youtube_oauth_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- RLS Policies
ALTER TABLE youtube_oauth_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials" 
ON youtube_oauth_credentials FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials" 
ON youtube_oauth_credentials FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials" 
ON youtube_oauth_credentials FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" 
ON youtube_oauth_credentials FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_youtube_oauth_credentials_updated_at
BEFORE UPDATE ON youtube_oauth_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

## 4. Supabase Config

```toml
[functions.exchange-youtube-code]
verify_jwt = false

[functions.test-youtube-connection]
verify_jwt = false
```

## 5. Fluxo Completo

1. **Usuário preenche Client ID e Client Secret** no formulário
2. **Clica em "Gerar Token"** → Abre popup do Google OAuth
3. **Autoriza o aplicativo** no Google → Recebe código `4/...`
4. **Cola o código no modal** → Clica "Trocar por Token"
5. **Edge Function `exchange-youtube-code`** troca código por refresh token `1//...`
6. **Frontend salva** refresh token no localStorage + Supabase
7. **Clica "Salvar e Testar"** → Edge Function `test-youtube-connection` é chamada
8. **Edge Function obtém access token** via refresh token
9. **Testa API do YouTube** → Retorna informações do canal
10. **Frontend exibe sucesso** ✅ com nome do canal

## 6. Troubleshooting Comum

| Erro | Causa | Solução |
|------|-------|---------|
| `redirect_uri_mismatch` | URI não cadastrada no GCP | Adicionar `https://landing-craftsman-76.lovable.app/youtube-oauth` nas Authorized redirect URIs |
| `invalid_grant` (Bad Request) | Código expirado ou reutilizado | Gerar novo código OAuth |
| `authorization_code_in_refresh` | Usuário colou código `4/` no campo Refresh Token | Usar botão "Trocar por Token" para converter em `1//` |
| `Invalid Client ID format` | Client ID não termina com `.apps.googleusercontent.com` | Verificar credenciais no GCP Console |
| `Invalid Client Secret format` | Client Secret não começa com `GOCSPX-` | Verificar credenciais no GCP Console |
