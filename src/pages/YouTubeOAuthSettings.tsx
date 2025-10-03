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
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Info, Copy, ChevronDown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TopNavigation } from '@/components/TopNavigation';

const STORAGE_KEYS = {
  CLIENT_ID: 'youtube_client_id',
  CLIENT_SECRET: 'youtube_client_secret',
  REFRESH_TOKEN: 'youtube_refresh_token',
};

const DEFAULT_CLIENT_ID = '616806868683-cvgcj38j5jr3ojhvelafmiorlc4ipiro.apps.googleusercontent.com';
const REQUIRED_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';

type ConnectionStatus = 'connected' | 'error' | 'not_configured' | 'checking';

export default function YouTubeOAuthSettings() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  
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

  const redirectUri = useMemo(
    () => `https://landing-craftsman-76.lovable.app/oauth2/callback`,
    []
  );

  // 🧹 Limpar chaves inválidas e carregar valores
  useEffect(() => {
    const oldKeys = [
      'YOUTUBE_CLIENT_ID',
      'YOUTUBE_CLIENT_SECRET',
      'YOUTUBE_REFRESH_TOKEN',
      'youtube_oauth_client_id',
      'youtube_oauth_client_secret',
      'youtube_oauth_refresh_token',
    ];
    let foundInvalid = false;

    oldKeys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val && !val.includes('apps.googleusercontent.com') && !val.startsWith('GOCSPX-')) {
        console.warn(`⚠️ Removendo chave inválida: ${key} = ${val.slice(-10)}`);
        localStorage.removeItem(key);
        foundInvalid = true;
      }
    });

    if (foundInvalid) {
      toast({
        title: '🧹 Cache limpo',
        description: 'Valores inválidos foram removidos.',
      });
    }

    const cid = localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || '';
    const csec = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET) || '';
    const rtok = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '';
    setClientId(cid);
    setClientSecret(csec);
    setRefreshToken(rtok);

    setIsClientIdValid(/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/.test(cid));

    // Auto-test connection if all credentials exist
    if (cid && csec && rtok) {
      testConnection();
    }
  }, [toast]);

  // Detectar retorno do OAuth callback
  useEffect(() => {
    const state = location.state as any;
    if (state?.openOAuthModal && state?.code) {
      console.log("OAuth callback detected, opening modal with code");
      setOauthCode(state.code);
      setShowOAuthModal(true);
      
      // Limpar state para evitar reabrir modal
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const testConnection = async () => {
    setIsTesting(true);
    setStatus('checking');
    
    console.log('🧪 Testando conexão com YouTube API...');
    console.log('📡 Credenciais configuradas:', {
      CLIENT_ID: clientId ? '✅ Sim' : '❌ Não',
      CLIENT_SECRET: clientSecret ? '✅ Sim' : '❌ Não',
      REFRESH_TOKEN: refreshToken ? '✅ Sim' : '❌ Não',
    });
    
    try {
      const { data, error } = await supabase.functions.invoke('test-youtube-connection');
      
      if (error) throw error;

      if (data?.ok) {
        setStatus('connected');
        setChannelInfo({ name: data.channelName, count: data.channelCount });
        toast({
          title: "✅ Conectado",
          description: `Canal: ${data.channelName}`,
        });
      } else {
        setStatus('error');
        setChannelInfo(null);
        toast({
          title: "❌ Erro na conexão",
          description: data?.error || 'Credenciais inválidas',
          variant: "destructive"
        });
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
      // Save to localStorage
      localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
      localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, clientSecret);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      // Save to Supabase secrets (batch)
      const { data, error } = await supabase.functions.invoke('update-secret', {
        body: {
          secrets: {
            YOUTUBE_CLIENT_ID: clientId,
            YOUTUBE_CLIENT_SECRET: clientSecret,
            YOUTUBE_REFRESH_TOKEN: refreshToken,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "✅ Credenciais salvas",
        description: "YouTube OAuth configurado com sucesso! Configure os secrets no Supabase Dashboard.",
      });

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

  const openOAuthFlow = () => {
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

    const scope = REQUIRED_SCOPE;
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    console.log('🚀 Abrindo OAuth:', {
      clientIdLast6: clientId.slice(-6),
      redirectUri,
    });

    setShowOAuthModal(true);
    
    // 🚀 Abrir em nova aba segura
    const newWindow = window.open(authUrl.toString(), "_blank", "noopener,noreferrer");
    
    // ⚠️ Caso o popup seja bloqueado
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
      redirectUri,
    });

    setIsSaving(true);

    try {
      const { data } = await supabase.functions.invoke('exchange-youtube-code', {
        body: {
          code: code.trim(),
          clientId,
          clientSecret,
          redirectUri,
        },
      });

      // ⚠️ Trata payload estruturado (success true/false)
      if (!data?.success) {
        let errorMessage = data?.error_description || "Erro desconhecido";
        
        switch (data?.error) {
          case "redirect_uri_mismatch":
            errorMessage = `❌ Redirect URI incorreto!\n\nAdicione EXATAMENTE esta URL no Google Cloud Console:\n${redirectUri}`;
            break;
          case "invalid_grant":
            errorMessage =
              "❌ Código expirado ou já usado!\n\nO código OAuth expira em ~10 minutos e só pode ser usado uma vez. Refaça o fluxo e clique em 'Trocar por Token' rapidamente.";
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
          redirectUri,
        });
        return;
      }

      // ✅ Sucesso - salvar no localStorage
      console.log("✅ Token recebido com sucesso");
      setRefreshToken(data.refresh_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
      
      toast({
        title: "⏳ Salvando credenciais...",
        description: "Configurando secrets no Supabase",
      });

      // 🆕 Salvar nos Supabase Secrets
      try {
        const { error: secretError } = await supabase.functions.invoke('update-secret', {
          body: {
            secrets: {
              YOUTUBE_CLIENT_ID: clientId,
              YOUTUBE_CLIENT_SECRET: clientSecret,
              YOUTUBE_REFRESH_TOKEN: data.refresh_token,
            }
          }
        });

        if (secretError) {
          console.error('❌ Erro ao salvar secrets:', secretError);
          toast({
            title: "⚠️ Secrets salvos parcialmente",
            description: "Configure manualmente no Supabase Dashboard",
            variant: "destructive",
          });
        } else {
          console.log("✅ Secrets salvos no Supabase com sucesso");
          toast({
            title: "✅ Credenciais salvas!",
            description: "Secrets configurados no Supabase",
          });
        }
      } catch (secretError: any) {
        console.error('❌ Exceção ao salvar secrets:', secretError);
      }
      
      setShowOAuthModal(false);
      setOauthCode("");

      // 🆕 Testar conexão automaticamente
      console.log("🧪 Iniciando teste de conexão automático...");
      await testConnection();
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

  const getRedirectUri = () => `${window.location.origin}/oauth2/callback`;
  
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
    <div className="min-h-screen bg-background">
      <TopNavigation />
      
      <div className="container mx-auto p-6 max-w-4xl space-y-6">
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

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertTitle>🔍 Configuração Esperada no GCP</AlertTitle>
        <AlertDescription>
          <p className="text-sm mb-2">Certifique-se de que você adicionou no Google Cloud Console:</p>
          <ul className="list-none space-y-1 text-xs font-mono bg-muted p-2 rounded">
            <li>✅ Redirect URI: <code className="text-green-600">{redirectUri}</code></li>
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
            <Label htmlFor="clientSecret">Client Secret</Label>
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
            <Label htmlFor="refreshToken">Refresh Token</Label>
            <div className="flex gap-2">
              <Input
                id="refreshToken"
                type="password"
                placeholder="1//0xxxxxxxxxxxxx"
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={openOAuthFlow}
              >
                Gerar Token
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em "Gerar Token" para obter via fluxo OAuth
            </p>
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
            onClick={() => {
              localStorage.clear();
              setClientId('');
              setClientSecret('');
              setRefreshToken('');
              window.location.reload();
            }}
            className="w-full"
          >
            🧹 Limpar Cache e Recarregar
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
