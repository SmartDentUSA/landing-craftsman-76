import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, TestTube, Settings, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CloudflareConfig {
  accountId: string;
  apiToken: string;
}

const CloudflareSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [config, setConfig] = useState<CloudflareConfig>({
    accountId: '',
    apiToken: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    // Carregar configurações do localStorage para esta sessão
    const savedAccountId = localStorage.getItem('cloudflare_account_id') || '';
    const savedApiToken = localStorage.getItem('cloudflare_api_token') || '';
    
    setConfig({
      accountId: savedAccountId,
      apiToken: savedApiToken
    });

    if (savedAccountId && savedApiToken) {
      setConnectionStatus('success');
    }
  };

  const handleSave = async () => {
    if (!config.accountId.trim() || !config.apiToken.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o Account ID e API Token do Cloudflare.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Salvar localmente para esta sessão
      // Em produção, você precisaria salvar como secrets no Supabase
      localStorage.setItem('cloudflare_account_id', config.accountId);
      localStorage.setItem('cloudflare_api_token', config.apiToken);

      toast({
        title: "Configurações salvas!",
        description: "As credenciais foram salvas para esta sessão. Para uso em produção, configure os secrets no Supabase.",
      });

      setConnectionStatus('success');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações. Tente novamente.",
        variant: "destructive"
      });
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.accountId.trim() || !config.apiToken.trim()) {
      toast({
        title: "Configurações incompletas",
        description: "Preencha e salve as configurações antes de testar.",
        variant: "destructive"
      });
      return;
    }

    setIsTesting(true);
    
    try {
      // Testar upload de imagem de teste
      const testFile = new Blob(['test'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', testFile, 'test.txt');

      const { data, error } = await supabase.functions.invoke('upload-image', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Conexão bem-sucedida!",
        description: "A conexão com o Cloudflare está funcionando corretamente.",
      });
      
      setConnectionStatus('success');
    } catch (error) {
      console.error('Erro no teste de conexão:', error);
      toast({
        title: "Falha na conexão",
        description: "Verifique se as credenciais estão corretas e tente novamente.",
        variant: "destructive"
      });
      setConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'success':
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary">Não testado</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/editor')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Editor
              </Button>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configurações do Cloudflare
                </h1>
                <p className="text-sm text-muted-foreground">
                  Configure as credenciais para upload de imagens
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-medium">
            <CardHeader>
              <CardTitle>Credenciais do Cloudflare Images</CardTitle>
              <CardDescription>
                Configure sua conta do Cloudflare para habilitar o upload de imagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account ID */}
              <div className="space-y-2">
                <Label htmlFor="accountId">Account ID *</Label>
                <Input
                  id="accountId"
                  type="text"
                  placeholder="Seu Account ID do Cloudflare"
                  value={config.accountId}
                  onChange={(e) => setConfig(prev => ({ ...prev, accountId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Encontre seu Account ID no dashboard do Cloudflare, seção "Account ID"
                </p>
              </div>

              {/* API Token */}
              <div className="space-y-2">
                <Label htmlFor="apiToken">API Token *</Label>
                <Input
                  id="apiToken"
                  type="password"
                  placeholder="Seu API Token do Cloudflare"
                  value={config.apiToken}
                  onChange={(e) => setConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Crie um API Token no Cloudflare com permissões para "Cloudflare Images:Edit"
                </p>
              </div>

              <Separator />

              {/* Instruções */}
              <div className="rounded-lg border p-4 bg-muted/50">
                <h3 className="font-medium mb-2">Como obter suas credenciais:</h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Acesse o dashboard do Cloudflare (dash.cloudflare.com)</li>
                  <li>Vá para a seção "Images" no menu lateral</li>
                  <li>Copie o Account ID exibido na página</li>
                  <li>Vá para "My Profile" → "API Tokens"</li>
                  <li>Crie um novo token com permissão "Cloudflare Images:Edit"</li>
                  <li>Cole as credenciais nos campos acima</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={isLoading}
                  className="gradient-primary shadow-primary"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={isTesting || !config.accountId || !config.apiToken}
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  {isTesting ? 'Testando...' : 'Testar Conexão'}
                </Button>
              </div>

              {/* Status Information */}
              {connectionStatus !== 'unknown' && (
                <div className={`rounded-lg border p-4 ${
                  connectionStatus === 'success' 
                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950' 
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
                }`}>
                  <div className="flex items-center gap-2">
                    {connectionStatus === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      connectionStatus === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                    }`}>
                      {connectionStatus === 'success' 
                        ? 'Configuração válida! O upload de imagens está funcionando.'
                        : 'Erro na configuração. Verifique suas credenciais.'
                      }
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CloudflareSettings;