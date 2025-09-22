import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react";

interface PublicationSettings {
  ftp_host: string;
  ftp_user: string;
  ftp_password_encrypted: string;
  ftp_protocol: string;
  ftp_port: number;
  ftp_remote_path: string;
  wordpress_url: string;
  wordpress_user: string;
  wordpress_app_password_encrypted: string;
}

export default function PublicationSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PublicationSettings>({
    ftp_host: "",
    ftp_user: "",
    ftp_password_encrypted: "",
    ftp_protocol: "sftp",
    ftp_port: 22,
    ftp_remote_path: "public_html/blog",
    wordpress_url: "",
    wordpress_user: "",
    wordpress_app_password_encrypted: "",
  });
  const [loading, setLoading] = useState(false);
  const [testingFtp, setTestingFtp] = useState(false);
  const [testingWordPress, setTestingWordPress] = useState(false);
  const [ftpStatus, setFtpStatus] = useState<"idle" | "success" | "error">("idle");
  const [wpStatus, setWpStatus] = useState<"idle" | "success" | "error">("idle");
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from("publication_settings")
        .select("*")
        .eq('user_id', user.user.id)
        .maybeSingle();

      if (error) throw error;

      console.log("📊 Dados carregados do Supabase:", data);

      if (data) {
        // Limpar campos vazios para null
        const cleanData = {
          ftp_host: data.ftp_host || "",
          ftp_user: data.ftp_user || "",
          ftp_password_encrypted: data.ftp_password_encrypted || "",
          ftp_protocol: data.ftp_protocol || "sftp",
          ftp_port: data.ftp_port || 22,
          ftp_remote_path: data.ftp_remote_path || "public_html/blog",
          wordpress_url: data.wordpress_url || "",
          wordpress_user: data.wordpress_user || "",
          wordpress_app_password_encrypted: data.wordpress_app_password_encrypted || "",
        };
        
        console.log("🧹 Dados limpos:", cleanData);
        setSettings(cleanData);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar configurações:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações existentes.",
        variant: "destructive",
      });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("publication_settings")
        .upsert({
          user_id: user.user.id,
          ...settings,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações de publicação foram salvas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testFtpConnection = async () => {
    // Validate fields first
    if (!settings.ftp_host.trim() || !settings.ftp_user.trim() || !settings.ftp_password_encrypted.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do FTP antes de testar.",
        variant: "destructive",
      });
      return;
    }

    setTestingFtp(true);
    setFtpStatus("idle");
    
    console.log("🔄 Iniciando teste FTP com dados:", {
      host: settings.ftp_host,
      user: settings.ftp_user,
      password: settings.ftp_password_encrypted ? "***" : "vazio"
    });
    
    try {
      const { data, error } = await supabase.functions.invoke("test-ftp-connection", {
        body: {
          host: settings.ftp_host,
          user: settings.ftp_user,
          password: settings.ftp_password_encrypted,
          port: settings.ftp_port,
          remotePath: settings.ftp_remote_path,
        },
      });

      console.log("📡 Resposta da função FTP:", { data, error });

      if (error) {
        console.error("❌ Erro na invocação da função:", error);
        throw error;
      }

      if (data?.success) {
        setFtpStatus("success");
        toast({
          title: "Conexão FTP testada",
          description: "Conexão FTP estabelecida com sucesso!",
        });
      } else {
        setFtpStatus("error");
        toast({
          title: "Erro na conexão FTP",
          description: data?.error || "Não foi possível conectar ao servidor FTP.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Erro no teste FTP:", error);
      setFtpStatus("error");
      toast({
        title: "Erro no teste FTP",
        description: `Erro ao testar a conexão FTP: ${error}`,
        variant: "destructive",
      });
    } finally {
      setTestingFtp(false);
    }
  };

  // Helper function to sanitize WordPress URL
  const sanitizeWordPressUrl = (url: string): string => {
    if (!url) return "";
    
    let sanitized = url.trim();
    
    // Add https if no protocol
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      sanitized = `https://${sanitized}`;
    }
    
    // Remove paths like /wp-admin, /blog, etc. - keep only origin
    try {
      const urlObj = new URL(sanitized);
      sanitized = `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      // If URL parsing fails, just remove common paths manually
      sanitized = sanitized.replace(/\/wp-admin.*$/, '');
      sanitized = sanitized.replace(/\/blog.*$/, '');
      sanitized = sanitized.replace(/\/+$/, '');
    }
    
    return sanitized;
  };

  const testWordPressConnection = async () => {
    // Validate fields first
    if (!settings.wordpress_url.trim() || !settings.wordpress_user.trim() || !settings.wordpress_app_password_encrypted.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos do WordPress antes de testar.",
        variant: "destructive",
      });
      return;
    }

    setTestingWordPress(true);
    setWpStatus("idle");
    
    const sanitizedUrl = sanitizeWordPressUrl(settings.wordpress_url);
    
    console.log("🔄 Iniciando teste WordPress com dados:", {
      originalUrl: settings.wordpress_url,
      sanitizedUrl: sanitizedUrl,
      user: settings.wordpress_user,
      password: settings.wordpress_app_password_encrypted ? "***" : "vazio"
    });
    
    try {
      const { data, error } = await supabase.functions.invoke("test-wordpress-connection", {
        body: {
          url: sanitizedUrl,
          user: settings.wordpress_user,
          password: settings.wordpress_app_password_encrypted,
        },
      });

      console.log("📡 Resposta da função WordPress:", { data, error });

      if (error) {
        console.error("❌ Erro na invocação da função:", error);
        throw error;
      }

      if (data?.success) {
        setWpStatus("success");
        toast({
          title: "Conexão WordPress testada",
          description: "Conexão WordPress estabelecida com sucesso!",
        });
      } else {
        setWpStatus("error");
        
        // Mensagens específicas baseadas no tipo de erro
        let title = "Erro na conexão WordPress";
        let description = data?.details || data?.error || "Não foi possível conectar ao WordPress.";
        
        if (data?.error === 'invalid_credentials') {
          title = "Credenciais inválidas";
          description = "Use seu username do WordPress (não email) e gere um Application Password em: WP Admin → Users → Your Profile → Application Passwords";
        } else if (data?.error === 'auth_blocked') {
          title = "Authorization bloqueado";
          description = "Seu servidor está bloqueando headers de Authorization. Contate seu provedor de hospedagem para habilitar Basic Authentication.";
        } else if (data?.error === 'connection_error') {
          title = "Erro de conexão";
          description = "Verifique se a URL está correta e se o site está acessível.";
        }
        
        toast({
          title,
          description,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("❌ Erro no teste WordPress:", error);
      setWpStatus("error");
      toast({
        title: "Erro no teste WordPress",
        description: `Erro ao testar a conexão WordPress: ${error}`,
        variant: "destructive",
      });
    } finally {
      setTestingWordPress(false);
    }
  };

  const getStatusIcon = (status: "idle" | "success" | "error") => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "error":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Configurações de Publicação</h1>
            <p className="text-muted-foreground mt-2">
              Configure as credenciais para publicação automática em FTP e WordPress.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configurações FTP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              SFTP (eodonto.com)
              {getStatusIcon(ftpStatus)}
            </CardTitle>
            <CardDescription>
              Configurações para publicação via SFTP no site eodonto.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ftp_host">Host SFTP</Label>
              <Input
                id="ftp_host"
                type="text"
                placeholder="eodonto.com"
                value={settings.ftp_host}
                onChange={(e) => setSettings(prev => ({ ...prev, ftp_host: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Apenas o domínio ou IP do servidor
              </p>
            </div>
            <div>
              <Label htmlFor="ftp_user">Usuário SFTP</Label>
              <Input
                id="ftp_user"
                type="text"
                placeholder="u976305328"
                value={settings.ftp_user}
                onChange={(e) => setSettings(prev => ({ ...prev, ftp_user: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ftp_password">Senha SFTP</Label>
              <Input
                id="ftp_password"
                type="password"
                placeholder="••••••••"
                value={settings.ftp_password_encrypted}
                onChange={(e) => setSettings(prev => ({ ...prev, ftp_password_encrypted: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="ftp_port">Porta</Label>
                <Input
                  id="ftp_port"
                  type="number"
                  placeholder="22"
                  min="1"
                  max="65535"
                  value={settings.ftp_port}
                  onChange={(e) => setSettings(prev => ({ ...prev, ftp_port: parseInt(e.target.value) || 22 }))}
                />
              </div>
              <div>
                <Label htmlFor="ftp_protocol">Protocolo</Label>
                <Input
                  id="ftp_protocol"
                  type="text"
                  placeholder="sftp"
                  value={settings.ftp_protocol}
                  onChange={(e) => setSettings(prev => ({ ...prev, ftp_protocol: e.target.value }))}
                  disabled
                />
              </div>
            </div>
            <div>
              <Label htmlFor="ftp_remote_path">Caminho remoto</Label>
              <Input
                id="ftp_remote_path"
                type="text"
                placeholder="public_html/blog"
                value={settings.ftp_remote_path}
                onChange={(e) => setSettings(prev => ({ ...prev, ftp_remote_path: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pasta onde os arquivos serão salvos no servidor
              </p>
            </div>
            <Button
              onClick={testFtpConnection}
              disabled={testingFtp}
              variant="outline"
              className="w-full"
            >
              {testingFtp ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar SFTP"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Configurações WordPress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              WordPress (dentala.com.br)
              {getStatusIcon(wpStatus)}
            </CardTitle>
            <CardDescription>
              Configurações para publicação via API no WordPress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="wordpress_url">URL do WordPress</Label>
              <Input
                id="wordpress_url"
                type="text"
                placeholder="https://dentala.com.br"
                value={settings.wordpress_url}
                onChange={(e) => setSettings(prev => ({ ...prev, wordpress_url: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use apenas o domínio, sem /wp-admin. Ex.: https://dentala.com.br
              </p>
            </div>
            <div>
              <Label htmlFor="wordpress_user">Usuário WordPress</Label>
              <Input
                id="wordpress_user"
                type="text"
                placeholder="admin"
                value={settings.wordpress_user}
                onChange={(e) => setSettings(prev => ({ ...prev, wordpress_user: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="wordpress_password">Application Password</Label>
              <Input
                id="wordpress_password"
                type="password"
                placeholder="••••••••••••••••••••"
                value={settings.wordpress_app_password_encrypted}
                onChange={(e) => setSettings(prev => ({ ...prev, wordpress_app_password_encrypted: e.target.value }))}
              />
            </div>
            <Button
              onClick={testWordPressConnection}
              disabled={testingWordPress}
              variant="outline"
              className="w-full"
            >
              {testingWordPress ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                "Testar Conexão WordPress"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </div>
    </div>
  );
}