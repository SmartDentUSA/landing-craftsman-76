import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, ArrowLeft, Plus, Trash2, Server } from "lucide-react";
import { TopNavigation } from "@/components/TopNavigation";

interface FTPProfile {
  id?: string;
  profile_name: string;
  ftp_host: string;
  ftp_user: string;
  ftp_password_encrypted: string;
  ftp_protocol: string;
  ftp_port: number;
  ftp_remote_path: string;
}

interface WordPressSettings {
  wordpress_url: string;
  wordpress_user: string;
  wordpress_app_password_encrypted: string;
}

const emptyFTPProfile: FTPProfile = {
  profile_name: "",
  ftp_host: "",
  ftp_user: "",
  ftp_password_encrypted: "",
  ftp_protocol: "ftp",
  ftp_port: 21,
  ftp_remote_path: "/public_html",
};

export default function PublicationSettings() {
  const navigate = useNavigate();
  const [ftpProfiles, setFtpProfiles] = useState<FTPProfile[]>([]);
  const [wpSettings, setWpSettings] = useState<WordPressSettings>({
    wordpress_url: "",
    wordpress_user: "",
    wordpress_app_password_encrypted: "",
  });
  const [loading, setLoading] = useState(false);
  const [testingFtp, setTestingFtp] = useState<string | null>(null);
  const [testingWordPress, setTestingWordPress] = useState(false);
  const [ftpStatuses, setFtpStatuses] = useState<Record<string, "idle" | "success" | "error">>({});
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
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const profiles: FTPProfile[] = data.map(d => ({
          id: d.id,
          profile_name: d.profile_name || "",
          ftp_host: d.ftp_host || "",
          ftp_user: d.ftp_user || "",
          ftp_password_encrypted: d.ftp_password_encrypted || "",
          ftp_protocol: d.ftp_protocol || "ftp",
          ftp_port: d.ftp_port || 21,
          ftp_remote_path: d.ftp_remote_path || "/public_html",
        }));
        setFtpProfiles(profiles);

        // WordPress settings from first record
        const first = data[0];
        setWpSettings({
          wordpress_url: first.wordpress_url || "",
          wordpress_user: first.wordpress_user || "",
          wordpress_app_password_encrypted: first.wordpress_app_password_encrypted || "",
        });
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

  const addProfile = () => {
    setFtpProfiles(prev => [...prev, { ...emptyFTPProfile }]);
  };

  const removeProfile = async (index: number) => {
    const profile = ftpProfiles[index];
    if (profile.id) {
      const { error } = await supabase
        .from("publication_settings")
        .delete()
        .eq("id", profile.id);
      if (error) {
        toast({ title: "Erro", description: "Erro ao remover perfil.", variant: "destructive" });
        return;
      }
    }
    setFtpProfiles(prev => prev.filter((_, i) => i !== index));
    toast({ title: "Perfil removido" });
  };

  const updateProfile = (index: number, field: keyof FTPProfile, value: string | number) => {
    setFtpProfiles(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      for (let idx = 0; idx < ftpProfiles.length; idx++) {
        const profile = ftpProfiles[idx];
        const baseFields = {
          profile_name: profile.profile_name || null,
          ftp_host: profile.ftp_host,
          ftp_user: profile.ftp_user,
          ftp_password_encrypted: profile.ftp_password_encrypted,
          ftp_protocol: profile.ftp_protocol,
          ftp_port: profile.ftp_port,
          ftp_remote_path: profile.ftp_remote_path,
          ...(idx === 0 ? wpSettings : {}),
        };

        if (profile.id) {
          const { error } = await supabase
            .from("publication_settings")
            .update(baseFields)
            .eq("id", profile.id);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("publication_settings")
            .insert({ ...baseFields, user_id: user.user.id })
            .select("id")
            .single();
          if (error) throw error;
          if (data) {
            const insertedIdx = idx;
            setFtpProfiles(prev => prev.map((p, i) =>
              i === insertedIdx ? { ...p, id: data.id } : p
            ));
          }
        }
      }

      toast({
        title: "Configurações salvas",
        description: "Todos os perfis foram salvos com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: `Erro ao salvar: ${(error as Error).message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testFtpConnection = async (index: number) => {
    const profile = ftpProfiles[index];
    if (!profile.ftp_host.trim() || !profile.ftp_user.trim() || !profile.ftp_password_encrypted.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha host, usuário e senha.", variant: "destructive" });
      return;
    }

    const key = profile.profile_name || String(index);
    setTestingFtp(key);
    setFtpStatuses(prev => ({ ...prev, [key]: "idle" }));

    try {
      const { data, error } = await supabase.functions.invoke("test-ftp-connection", {
        body: {
          host: profile.ftp_host,
          user: profile.ftp_user,
          password: profile.ftp_password_encrypted,
          port: profile.ftp_port,
          remotePath: profile.ftp_remote_path,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setFtpStatuses(prev => ({ ...prev, [key]: "success" }));
        toast({ title: "Conexão FTP testada", description: `Perfil "${profile.profile_name}" conectou com sucesso!` });
      } else {
        setFtpStatuses(prev => ({ ...prev, [key]: "error" }));
        toast({ title: "Erro na conexão FTP", description: data?.error || "Falha na conexão.", variant: "destructive" });
      }
    } catch (error) {
      setFtpStatuses(prev => ({ ...prev, [key]: "error" }));
      toast({ title: "Erro no teste FTP", description: `${error}`, variant: "destructive" });
    } finally {
      setTestingFtp(null);
    }
  };

  const sanitizeWordPressUrl = (url: string): string => {
    if (!url) return "";
    let sanitized = url.trim();
    if (!sanitized.startsWith('http://') && !sanitized.startsWith('https://')) {
      sanitized = `https://${sanitized}`;
    }
    try {
      const urlObj = new URL(sanitized);
      sanitized = `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      sanitized = sanitized.replace(/\/wp-admin.*$/, '').replace(/\/blog.*$/, '').replace(/\/+$/, '');
    }
    return sanitized;
  };

  const testWordPressConnection = async () => {
    if (!wpSettings.wordpress_url.trim() || !wpSettings.wordpress_user.trim() || !wpSettings.wordpress_app_password_encrypted.trim()) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos do WordPress.", variant: "destructive" });
      return;
    }

    setTestingWordPress(true);
    setWpStatus("idle");
    const sanitizedUrl = sanitizeWordPressUrl(wpSettings.wordpress_url);

    try {
      const { data, error } = await supabase.functions.invoke("test-wordpress-connection", {
        body: { url: sanitizedUrl, user: wpSettings.wordpress_user, password: wpSettings.wordpress_app_password_encrypted },
      });

      if (error) throw error;

      if (data?.success) {
        setWpStatus("success");
        toast({ title: "Conexão WordPress testada", description: "Conexão estabelecida com sucesso!" });
      } else {
        setWpStatus("error");
        toast({ title: "Erro WordPress", description: data?.error || "Falha na conexão.", variant: "destructive" });
      }
    } catch (error) {
      setWpStatus("error");
      toast({ title: "Erro no teste WordPress", description: `${error}`, variant: "destructive" });
    } finally {
      setTestingWordPress(false);
    }
  };

  const getStatusIcon = (status: "idle" | "success" | "error") => {
    switch (status) {
      case "success": return <CheckCircle className="h-4 w-4 text-success" />;
      case "error": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      
      <div className="container max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Configurações de Publicação</h1>
              <p className="text-muted-foreground mt-2">
                Configure as credenciais para publicação automática via FTP e WordPress.
              </p>
            </div>
          </div>
        </div>

        {/* FTP Profiles Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Server className="h-5 w-5" />
              Perfis FTP / SFTP
            </h2>
            <Button variant="outline" size="sm" onClick={addProfile}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Perfil
            </Button>
          </div>

          {ftpProfiles.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Server className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhum perfil FTP configurado.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={addProfile}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar primeiro perfil
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {ftpProfiles.map((profile, idx) => {
              const key = profile.profile_name || String(idx);
              const status = ftpStatuses[key] || "idle";
              
              return (
                <Card key={profile.id || idx}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="flex items-center gap-2">
                        {profile.profile_name ? (
                          <code className="text-sm bg-muted px-2 py-0.5 rounded">{profile.profile_name}</code>
                        ) : (
                          <span className="text-muted-foreground italic">Novo perfil</span>
                        )}
                        {getStatusIcon(status)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeProfile(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      {profile.ftp_host ? `${profile.ftp_protocol}://${profile.ftp_host}:${profile.ftp_port}` : 'Configure as credenciais FTP'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Nome do Perfil *</Label>
                      <Input
                        value={profile.profile_name}
                        onChange={(e) => updateProfile(idx, 'profile_name', e.target.value)}
                        placeholder="kinghost_smartdent"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Deve coincidir com o <code>ftp_profile</code> do domínio em seo_domains
                      </p>
                    </div>
                    <div>
                      <Label>Host</Label>
                      <Input
                        value={profile.ftp_host}
                        onChange={(e) => updateProfile(idx, 'ftp_host', e.target.value)}
                        placeholder="ftp.smartdent.com.br"
                      />
                    </div>
                    <div>
                      <Label>Usuário</Label>
                      <Input
                        value={profile.ftp_user}
                        onChange={(e) => updateProfile(idx, 'ftp_user', e.target.value)}
                        placeholder="ftp_user"
                      />
                    </div>
                    <div>
                      <Label>Senha</Label>
                      <Input
                        type="password"
                        value={profile.ftp_password_encrypted}
                        onChange={(e) => updateProfile(idx, 'ftp_password_encrypted', e.target.value)}
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Porta</Label>
                        <Input
                          type="number"
                          min="1"
                          max="65535"
                          value={profile.ftp_port}
                          onChange={(e) => updateProfile(idx, 'ftp_port', parseInt(e.target.value) || 21)}
                        />
                      </div>
                      <div>
                        <Label>Protocolo</Label>
                        <Input value={profile.ftp_protocol} disabled />
                      </div>
                    </div>
                    <div>
                      <Label>Caminho remoto</Label>
                      <Input
                        value={profile.ftp_remote_path}
                        onChange={(e) => updateProfile(idx, 'ftp_remote_path', e.target.value)}
                        placeholder="/public_html"
                      />
                    </div>
                    <Button
                      onClick={() => testFtpConnection(idx)}
                      disabled={testingFtp !== null}
                      variant="outline"
                      className="w-full"
                    >
                      {testingFtp === key ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testando...</>
                      ) : (
                        "Testar Conexão FTP"
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* WordPress Card */}
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
              <Label>URL do WordPress</Label>
              <Input
                placeholder="https://dentala.com.br"
                value={wpSettings.wordpress_url}
                onChange={(e) => setWpSettings(prev => ({ ...prev, wordpress_url: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use apenas o domínio, sem /wp-admin.
              </p>
            </div>
            <div>
              <Label>Usuário WordPress</Label>
              <Input
                placeholder="admin"
                value={wpSettings.wordpress_user}
                onChange={(e) => setWpSettings(prev => ({ ...prev, wordpress_user: e.target.value }))}
              />
            </div>
            <div>
              <Label>Application Password</Label>
              <Input
                type="password"
                placeholder="••••••••••••••••••••"
                value={wpSettings.wordpress_app_password_encrypted}
                onChange={(e) => setWpSettings(prev => ({ ...prev, wordpress_app_password_encrypted: e.target.value }))}
              />
            </div>
            <Button
              onClick={testWordPressConnection}
              disabled={testingWordPress}
              variant="outline"
              className="w-full"
            >
              {testingWordPress ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Testando...</>
              ) : (
                "Testar Conexão WordPress"
              )}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={loading}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>
            ) : (
              "Salvar Todas as Configurações"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
