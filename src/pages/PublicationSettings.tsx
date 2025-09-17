import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

interface PublicationSettings {
  ftp_host: string;
  ftp_user: string;
  ftp_password_encrypted: string;
  wordpress_url: string;
  wordpress_user: string;
  wordpress_app_password_encrypted: string;
}

export default function PublicationSettings() {
  const [settings, setSettings] = useState<PublicationSettings>({
    ftp_host: "",
    ftp_user: "",
    ftp_password_encrypted: "",
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
        toast({
          title: "Erro na conexão WordPress",
          description: data?.error || "Não foi possível conectar ao WordPress.",
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
      <div>
        <h1 className="text-3xl font-bold">Configurações de Publicação</h1>
        <p className="text-muted-foreground mt-2">
          Configure as credenciais para publicação automática em FTP e WordPress.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Configurações FTP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              FTP (eodonto.com)
              {getStatusIcon(ftpStatus)}
            </CardTitle>
            <CardDescription>
              Configurações para publicação via FTP no site eodonto.com
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ftp_host">Host FTP</Label>
              <Input
                id="ftp_host"
                type="text"
                placeholder="82.25.67.230"
                value={settings.ftp_host}
                onChange={(e) => setSettings(prev => ({ ...prev, ftp_host: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ftp_user">Usuário FTP</Label>
              <Input
                id="ftp_user"
                type="text"
                placeholder="u976305328.eodonto.com"
                value={settings.ftp_user}
                onChange={(e) => setSettings(prev => ({ ...prev, ftp_user: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="ftp_password">Senha FTP</Label>
              <Input
                id="ftp_password"
                type="password"
                placeholder="••••••••"
                value={settings.ftp_password_encrypted}
                onChange={(e) => setSettings(prev => ({ ...prev, ftp_password_encrypted: e.target.value }))}
              />
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
                "Testar Conexão FTP"
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