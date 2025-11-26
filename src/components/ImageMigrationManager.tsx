import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, Download, Upload, RefreshCw, CheckCircle2, XCircle, Clock, Image as ImageIcon } from 'lucide-react';

interface MigrationStats {
  totalProducts: number;
  externalImages: number;
  migratedImages: number;
  pendingMigration: number;
}

interface MigrationResult {
  productId: string;
  productName: string;
  originalUrl: string;
  newUrl?: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

export const ImageMigrationManager: React.FC = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState<MigrationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<MigrationResult[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Total de produtos
      const { count: totalProducts } = await supabase
        .from('products_repository')
        .select('*', { count: 'exact', head: true });

      // Imagens externas (Loja Integrada)
      const { count: externalImages } = await supabase
        .from('products_repository')
        .select('*', { count: 'exact', head: true })
        .or('image_url.like.%cdn.awsli.com.br%,image_url.like.http%://%')
        .not('image_url', 'like', '%supabase.co/storage%');

      // Imagens já migradas
      const { count: migratedImages } = await supabase
        .from('products_repository')
        .select('*', { count: 'exact', head: true })
        .not('image_url_original', 'is', null);

      // Pendentes (externas que ainda não foram migradas)
      const { count: pendingMigration } = await supabase
        .from('products_repository')
        .select('*', { count: 'exact', head: true })
        .or('image_url.like.%cdn.awsli.com.br%,image_url.like.http%://%')
        .is('image_url_original', null);

      setStats({
        totalProducts: totalProducts || 0,
        externalImages: externalImages || 0,
        migratedImages: migratedImages || 0,
        pendingMigration: pendingMigration || 0
      });
    } catch (error: any) {
      console.error('Erro ao buscar estatísticas:', error);
      toast({
        title: 'Erro ao carregar estatísticas',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const startMigration = async (batchSize: number = 10) => {
    setMigrating(true);
    setProgress(0);
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('migrate-external-images', {
        body: { batchSize, forceRemigrate: false }
      });

      if (error) throw error;

      if (data.results) {
        setResults(data.results);
        const successCount = data.stats.success;
        const totalCount = data.stats.total;
        setProgress((successCount / totalCount) * 100);

        toast({
          title: 'Migração concluída',
          description: `${successCount}/${totalCount} imagens migradas com sucesso`,
        });

        // Atualizar estatísticas
        await fetchStats();
      }
    } catch (error: any) {
      console.error('Erro na migração:', error);
      toast({
        title: 'Erro na migração',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setMigrating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      success: 'default',
      failed: 'destructive',
      skipped: 'secondary'
    };
    return variants[status] || 'secondary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Migração de Imagens para Supabase Storage
          </CardTitle>
          <CardDescription>
            Migre automaticamente imagens externas (Loja Integrada) para o Supabase Storage, 
            garantindo controle total e URLs confiáveis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">Total de Produtos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-500">{stats?.externalImages || 0}</div>
                <p className="text-xs text-muted-foreground">Imagens Externas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-500">{stats?.migratedImages || 0}</div>
                <p className="text-xs text-muted-foreground">Migradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-500">{stats?.pendingMigration || 0}</div>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Progresso */}
          {migrating && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">
                Migrando imagens... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3">
            <Button
              onClick={() => startMigration(10)}
              disabled={migrating || loading || (stats?.pendingMigration || 0) === 0}
              className="flex items-center gap-2"
            >
              {migrating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Migrando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Migrar 10 Imagens
                </>
              )}
            </Button>
            <Button
              onClick={() => startMigration(50)}
              disabled={migrating || loading || (stats?.pendingMigration || 0) === 0}
              variant="secondary"
            >
              Migrar 50 Imagens
            </Button>
            <Button
              onClick={fetchStats}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {/* Alerta informativo */}
          {(stats?.pendingMigration || 0) > 0 && (
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                Existem {stats?.pendingMigration} imagens pendentes de migração. 
                A migração baixará as imagens da Loja Integrada e as enviará para o Supabase Storage.
              </AlertDescription>
            </Alert>
          )}

          {/* Resultados da última migração */}
          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Últimos Resultados</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm truncate">{result.productName}</p>
                            <Badge variant={getStatusBadge(result.status)} className="text-xs">
                              {result.status}
                            </Badge>
                          </div>
                          {result.error && (
                            <p className="text-xs text-destructive mb-2">{result.error}</p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            Original: {result.originalUrl}
                          </p>
                          {result.newUrl && (
                            <p className="text-xs text-green-600 truncate">
                              Nova: {result.newUrl}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Informações */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
            <p><strong>Benefícios da migração:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Controle total sobre as URLs de imagem</li>
              <li>Sem dependência do CDN da Loja Integrada</li>
              <li>Performance otimizada via Supabase CDN</li>
              <li>URLs originais preservadas em backup</li>
              <li>SEO - URLs consistentes e confiáveis</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
