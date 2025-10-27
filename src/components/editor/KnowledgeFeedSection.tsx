import { useState, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BookOpen, Monitor, Smartphone, Eye, RefreshCw } from 'lucide-react';
import { KnowledgeFeed } from '@/components/KnowledgeFeed';

interface KnowledgeFeedSectionProps {
  data: {
    visible_desktop: boolean;
    visible_mobile: boolean;
    title: string;
    subtitle?: string;
    feed_url: string;
    limit: number;
  };
  onChange: (updates: any) => void;
}

export function KnowledgeFeedSection({ data, onChange }: KnowledgeFeedSectionProps) {
  const [refetchFn, setRefetchFn] = useState<(() => void) | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  console.log('[KnowledgeFeedSection] Renderizando com dados:', data);
  
  const handleRefresh = useCallback(async () => {
    if (!refetchFn) return;
    
    setIsRefreshing(true);
    try {
      await refetchFn();
      console.log('✅ [Feed] Atualizado com sucesso');
    } catch (error) {
      console.error('❌ [Feed] Erro ao atualizar:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchFn]);
  
  if (!data) {
    return (
      <Card>
        <CardContent className="p-8">
          <p className="text-center text-muted-foreground">Carregando configurações...</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="h-full overflow-y-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Feed de Conhecimento
          </CardTitle>
          <CardDescription>
            Exibe artigos da Base de Conhecimento em um carrossel automático
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
        {/* Visibilidade */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <Label>Desktop</Label>
            </div>
            <Switch
              checked={data.visible_desktop}
              onCheckedChange={(checked) => onChange({ visible_desktop: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label>Mobile</Label>
            </div>
            <Switch
              checked={data.visible_mobile}
              onCheckedChange={(checked) => onChange({ visible_mobile: checked })}
            />
          </div>
        </div>

        {/* Título */}
        <div className="space-y-2">
          <Label>Título da Seção</Label>
          <Input
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Últimas Publicações"
          />
        </div>

        {/* Subtítulo */}
        <div className="space-y-2">
          <Label>Subtítulo (opcional)</Label>
          <Textarea
            value={data.subtitle || ''}
            onChange={(e) => onChange({ subtitle: e.target.value })}
            placeholder="Confira os artigos mais recentes..."
            rows={2}
          />
        </div>

        {/* URL do Feed */}
        <div className="space-y-2">
          <Label>URL da Edge Function</Label>
          <div className="flex gap-2">
            <Input
              value={data.feed_url}
              onChange={(e) => onChange({ feed_url: e.target.value })}
              placeholder="https://..."
              type="url"
              className="flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={!refetchFn || isRefreshing || !data.feed_url}
              title="Atualizar dados do feed"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            URL pública da Edge Function do sistema de Base de Conhecimento
          </p>
        </div>

        {/* Limite de Artigos */}
        <div className="space-y-2">
          <Label>Quantidade de Artigos</Label>
          <Input
            type="number"
            min={3}
            max={50}
            value={data.limit}
            onChange={(e) => onChange({ limit: parseInt(e.target.value) || 12 })}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo: 3 | Máximo: 50 | Recomendado: 12 (2 rotações no desktop)
          </p>
        </div>
      </CardContent>
    </Card>

    {/* PREVIEW DO FEED */}
    {(data.visible_desktop || data.visible_mobile) && data.feed_url && (
      <Card className="mt-4 border-purple-200 bg-purple-50/50 dark:border-purple-800 dark:bg-purple-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            Preview do Feed
          </CardTitle>
        </CardHeader>
        <CardContent className="max-h-[400px] overflow-y-auto">
          <KnowledgeFeed
            feedUrl={data.feed_url}
            limit={data.limit || 12}
            title={data.title}
            subtitle={data.subtitle}
            visibleDesktop={data.visible_desktop}
            visibleMobile={data.visible_mobile}
            onRefetchReady={setRefetchFn}
          />
        </CardContent>
      </Card>
    )}
    </div>
  );
}
