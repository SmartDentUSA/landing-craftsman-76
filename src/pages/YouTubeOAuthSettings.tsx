import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle, AlertCircle, ExternalLink, Info } from 'lucide-react';

const STORAGE_KEYS = {
  CLIENT_ID: 'youtube_oauth_client_id',
  CLIENT_SECRET: 'youtube_oauth_client_secret',
  REFRESH_TOKEN: 'youtube_oauth_refresh_token',
};

type ConnectionStatus = 'connected' | 'error' | 'not_configured' | 'checking';

export default function YouTubeOAuthSettings() {
  const { toast } = useToast();
  
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('not_configured');
  const [channelInfo, setChannelInfo] = useState<{ name: string; count: number } | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedClientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID) || 
      '616806868683-cvgcj38j5jr3ojhvelafmiorlc4ipiro.apps.googleusercontent.com';
    const savedClientSecret = localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET) || 
      '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';
    const savedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) || '';
    
    // Save defaults to localStorage if not present
    if (!localStorage.getItem(STORAGE_KEYS.CLIENT_ID)) {
      localStorage.setItem(STORAGE_KEYS.CLIENT_ID, savedClientId);
    }
    if (!localStorage.getItem(STORAGE_KEYS.CLIENT_SECRET)) {
      localStorage.setItem(STORAGE_KEYS.CLIENT_SECRET, savedClientSecret);
    }
    
    setClientId(savedClientId);
    setClientSecret(savedClientSecret);
    setRefreshToken(savedRefreshToken);

    // Auto-test connection if all credentials exist
    if (savedClientId && savedClientSecret && savedRefreshToken) {
      testConnection();
    }
  }, []);

  const testConnection = async () => {
    setIsTesting(true);
    setStatus('checking');
    
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
    if (!clientId) {
      toast({
        title: "⚠️ Client ID obrigatório",
        description: "Preencha o Client ID primeiro",
        variant: "destructive"
      });
      return;
    }

    const redirectUri = `${window.location.origin}/oauth2/callback`;
    const scope = 'https://www.googleapis.com/auth/youtube.force-ssl';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

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
        description: "Código OAuth ou credenciais faltando",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const redirectUri = `${window.location.origin}/oauth2/callback`;
      
      const { data, error } = await supabase.functions.invoke('exchange-youtube-code', {
        body: {
          code,
          clientId,
          clientSecret,
          redirectUri
        }
      });

      if (error) throw error;

      if (data?.success && data?.refresh_token) {
        setRefreshToken(data.refresh_token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
        
        toast({
          title: "✅ Refresh Token obtido",
          description: "Agora clique em 'Salvar Credenciais'",
        });
        
        setShowOAuthModal(false);
      } else {
        throw new Error(data?.error || 'Falha ao obter refresh_token');
      }
    } catch (error: any) {
      console.error('OAuth exchange error:', error);
      toast({
        title: "❌ Erro no OAuth",
        description: error.message || 'Falha ao trocar código',
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
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

      {channelInfo && status === 'connected' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Canal conectado:</strong> {channelInfo.name} ({channelInfo.count} canal(is))
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
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientId">Client ID</Label>
            <Input
              id="clientId"
              type="text"
              placeholder="123456789.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientSecret">Client Secret</Label>
            <Input
              id="clientSecret"
              type="password"
              placeholder="GOCSPX-xxxxxxxxxxxxx"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
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
                disabled={!clientId}
              >
                Gerar Token
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Clique em "Gerar Token" para obter via fluxo OAuth
            </p>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Instruções completas:</strong>{' '}
              <a 
                href="https://github.com/seu-repo/docs/YOUTUBE_OAUTH_SETUP.md" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Guia de configuração passo a passo
              </a>
            </AlertDescription>
          </Alert>

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
                'Salvar Credenciais'
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
                'Testar Conexão'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showOAuthModal} onOpenChange={setShowOAuthModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fluxo OAuth do YouTube</DialogTitle>
            <DialogDescription>
              Cole o código de autorização após autorizar no navegador
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                1. Autorize a aplicação na janela que abriu<br />
                2. Após o redirecionamento, copie o parâmetro <code>code=</code> da URL<br />
                3. Cole abaixo e clique em "Trocar por Token"
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="oauthCode">Código de Autorização</Label>
              <Input
                id="oauthCode"
                type="text"
                placeholder="4/0AfJoh..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget as HTMLInputElement;
                    handleOAuthCode(input.value);
                  }
                }}
              />
            </div>

            <Button
              onClick={() => {
                const input = document.getElementById('oauthCode') as HTMLInputElement;
                handleOAuthCode(input.value);
              }}
              disabled={isSaving}
              className="w-full"
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
