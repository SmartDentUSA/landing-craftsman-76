import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Youtube, Globe } from "lucide-react";

interface TestResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  details?: any;
}

export const ConnectionTestPanel = () => {
  const [youtubeTest, setYoutubeTest] = useState<TestResult>({ status: 'idle' });
  const [googleTest, setGoogleTest] = useState<TestResult>({ status: 'idle' });

  const testYouTubeConnection = async () => {
    setYoutubeTest({ status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('test-youtube-connection', {
        body: {}
      });

      if (error) throw error;

      if (data?.success) {
        setYoutubeTest({
          status: 'success',
          message: `✅ YouTube API conectada com sucesso!`,
          details: data
        });
      } else {
        setYoutubeTest({
          status: 'error',
          message: data?.error || 'Falha na conexão',
          details: data
        });
      }
    } catch (error: any) {
      setYoutubeTest({
        status: 'error',
        message: error.message || 'Erro ao testar conexão YouTube',
        details: error
      });
    }
  };

  const testGoogleBusinessConnection = async () => {
    setGoogleTest({ status: 'loading' });
    
    try {
      const { data, error } = await supabase.functions.invoke('test-google-business-connection', {
        body: {}
      });

      if (error) throw error;

      if (data?.success) {
        setGoogleTest({
          status: 'success',
          message: `✅ Google Business API conectada com sucesso!`,
          details: data
        });
      } else {
        setGoogleTest({
          status: 'error',
          message: data?.error || 'Falha na conexão',
          details: data
        });
      }
    } catch (error: any) {
      setGoogleTest({
        status: 'error',
        message: error.message || 'Erro ao testar conexão Google Business',
        details: error
      });
    }
  };

  const renderTestStatus = (test: TestResult, icon: React.ReactNode) => {
    if (test.status === 'idle') {
      return <Badge variant="outline">Não testado</Badge>;
    }
    if (test.status === 'loading') {
      return <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Testando...</Badge>;
    }
    if (test.status === 'success') {
      return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Erro</Badge>;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔌 Teste de Conexões API
        </CardTitle>
        <CardDescription>
          Verifique se as credenciais OAuth estão configuradas corretamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* YouTube API Test */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Youtube className="h-5 w-5 text-red-600" />
            <div>
              <h3 className="font-medium">YouTube Data API v3</h3>
              <p className="text-sm text-muted-foreground">Extração de legendas e captions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {renderTestStatus(youtubeTest, <Youtube />)}
            <Button
              onClick={testYouTubeConnection}
              disabled={youtubeTest.status === 'loading'}
              size="sm"
            >
              {youtubeTest.status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar'
              )}
            </Button>
          </div>
        </div>

        {youtubeTest.status !== 'idle' && youtubeTest.status !== 'loading' && (
          <Alert variant={youtubeTest.status === 'success' ? 'default' : 'destructive'}>
            <AlertDescription>
              <p className="font-medium">{youtubeTest.message}</p>
              {youtubeTest.details && (
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(youtubeTest.details, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Google Business API Test */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium">Google Business Profile API</h3>
              <p className="text-sm text-muted-foreground">Extração de reviews e avaliações</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {renderTestStatus(googleTest, <Globe />)}
            <Button
              onClick={testGoogleBusinessConnection}
              disabled={googleTest.status === 'loading'}
              size="sm"
            >
              {googleTest.status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar'
              )}
            </Button>
          </div>
        </div>

        {googleTest.status !== 'idle' && googleTest.status !== 'loading' && (
          <Alert variant={googleTest.status === 'success' ? 'default' : 'destructive'}>
            <AlertDescription>
              <p className="font-medium">{googleTest.message}</p>
              {googleTest.details && (
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify(googleTest.details, null, 2)}
                </pre>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t">
          <Button
            onClick={() => {
              testYouTubeConnection();
              testGoogleBusinessConnection();
            }}
            variant="outline"
            className="w-full"
            disabled={youtubeTest.status === 'loading' || googleTest.status === 'loading'}
          >
            Testar Todas as Conexões
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
