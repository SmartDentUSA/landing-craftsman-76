import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Zap, Loader2, Trash2, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { saveSEOContext, getLatestSEOContext, clearSEOContext } from '@/services/seoContextStore';
import { format } from 'date-fns';

interface SEOIntelligentCardProps {
  landingPageId: string;
}

export function SEOIntelligentCard({ landingPageId }: SEOIntelligentCardProps) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seoContext, setSeoContext] = useState<any>(null);
  const { toast } = useToast();

  // Load SEO Context on mount
  useEffect(() => {
    if (!landingPageId) return;
    
    const loadSEOContext = async () => {
      try {
        const context = await getLatestSEOContext(landingPageId);
        if (context) {
          setSeoContext(context);
          setEnabled(true);
        }
      } catch (error) {
        console.error('Erro ao carregar SEO Context:', error);
      }
    };

    loadSEOContext();
  }, [landingPageId]);

  const handleGenerate = async () => {
    if (!landingPageId) {
      toast({
        title: "Erro",
        description: "ID da landing page não encontrado",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // 🧪 Mock de geração por IA (substituir por chamada real à API)
      const mockGeneratedContent = `## Insights Estratégicos sobre Impressão 3D

A **impressão 3D odontológica** revolucionou os fluxos de trabalho digitais em consultórios e laboratórios.

**Principais benefícios:**
- Precisão dimensional superior a 25 mícrons
- Redução de 70% no tempo de produção de guias cirúrgicas
- Biocompatibilidade certificada para uso intraoral

Nossos scanners intraorais integram perfeitamente com impressoras UV.`;

      const mockKeywords = [
        { term: 'impressão 3D odontológica' },
        { term: 'scanners intraorais' },
      ];

      const mockResolvedKeywords = [
        {
          source: 'Repository' as const,
          term: 'impressão 3D odontológica',
          matched: true,
          url: '/impressao-3d',
          chosenAlias: 'impressão 3D odontológica',
          status: 'approved' as const,
        },
        {
          source: 'Repository' as const,
          term: 'scanners intraorais',
          matched: true,
          url: '/scanners',
          chosenAlias: 'scanners intraorais',
          status: 'approved' as const,
        },
      ];

      const savedContext = await saveSEOContext({
        landingPageId,
        baseTextMarkdown: mockGeneratedContent,
        aiKeywords: mockKeywords,
        resolvedKeywords: mockResolvedKeywords,
      });

      setSeoContext(savedContext);
      setEnabled(true);

      toast({
        title: "SEO Inteligente gerado!",
        description: "Conteúdo SEO salvo com sucesso no Supabase",
      });

    } catch (error) {
      console.error('Erro ao gerar SEO Inteligente:', error);
      toast({
        title: "Erro",
        description: "Falha ao gerar SEO Inteligente",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      setLoading(true);
      await clearSEOContext(landingPageId);
      setSeoContext(null);
      setEnabled(false);

      toast({
        title: "SEO Inteligente removido",
        description: "Conteúdo SEO foi limpo com sucesso",
      });

    } catch (error) {
      console.error('Erro ao limpar SEO Context:', error);
      toast({
        title: "Erro",
        description: "Falha ao limpar SEO Context",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-600" />
            <span>SEO Inteligente com IA</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gere automaticamente conteúdo SEO otimizado com inteligência artificial
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch 
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={!seoContext}
              />
              <Label className="font-medium">
                {enabled ? 'Ativo' : 'Inativo'}
              </Label>
            </div>
            
            {seoContext && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(seoContext.createdAt), 'dd/MM/yyyy HH:mm')}
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1"
              variant={seoContext ? "outline" : "default"}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {seoContext ? 'Regenerar com IA' : 'Gerar com IA'}
            </Button>

            {seoContext && (
              <Button
                onClick={handleClear}
                disabled={loading}
                variant="destructive"
                size="icon"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {seoContext && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Keywords Identificadas ({seoContext.aiKeywords.length})
                </Label>
                <div className="flex flex-wrap gap-2">
                  {seoContext.aiKeywords.map((kw: any, i: number) => (
                    <Badge key={i} variant="secondary">
                      {kw.term}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Prévia do Conteúdo</Label>
                <Textarea
                  value={seoContext.baseTextMarkdown}
                  readOnly
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <strong>✨ Bloco estratégico ativo!</strong>
                <br />
                Este conteúdo aparecerá automaticamente no HTML consolidado gerado.
              </div>
            </>
          )}

          {!seoContext && (
            <div className="p-3 bg-slate-50 border rounded-lg text-sm text-muted-foreground">
              Clique em "Gerar com IA" para criar conteúdo SEO otimizado automaticamente.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
