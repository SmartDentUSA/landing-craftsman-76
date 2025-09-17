import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trash2, Plus } from 'lucide-react';
import { KeywordCollector } from '@/lib/google-ads/collectors/KeywordCollector';

interface KeywordManagerProps {
  config: any;
  data: any;
  onChange: (updates: any) => void;
}

export const KeywordManager = ({ config, data, onChange }: KeywordManagerProps) => {
  const [generatedKeywords, setGeneratedKeywords] = useState<string[]>([]);
  const [extraKeywords, setExtraKeywords] = useState<string>('');
  const [negativeKeywords, setNegativeKeywords] = useState<string>('');

  useEffect(() => {
    generateKeywords();
  }, [config.include_ai_keywords, config.include_faq_longtail, data]);

  const generateKeywords = () => {
    let keywords: string[] = [];

    // Collect from AI keywords
    if (config.include_ai_keywords && data?.seo?.ai_keywords) {
      try {
        keywords.push(...KeywordCollector.collectFromAI(data.seo.ai_keywords));
      } catch (error) {
        console.warn('Error collecting AI keywords:', error);
      }
    }

    // Collect from FAQ
    if (config.include_faq_longtail && data?.faq) {
      keywords.push(...KeywordCollector.collectFromFAQ(data.faq));
    }

    setGeneratedKeywords(KeywordCollector.normalizeKeywords(keywords));
  };

  const handleExtraKeywordsChange = (value: string) => {
    setExtraKeywords(value);
    const keywords = value.split('\n').filter(k => k.trim().length > 0);
    onChange({ extra_keywords: keywords });
  };

  const handleNegativeKeywordsChange = (value: string) => {
    setNegativeKeywords(value);
    const negatives = value.split('\n').filter(k => k.trim().length > 0);
    onChange({ negatives });
  };

  const removeKeyword = (keyword: string, type: 'extra' | 'negative') => {
    if (type === 'extra') {
      const updated = extraKeywords.split('\n').filter(k => k !== keyword);
      setExtraKeywords(updated.join('\n'));
      onChange({ extra_keywords: updated });
    } else {
      const updated = negativeKeywords.split('\n').filter(k => k !== keyword);
      setNegativeKeywords(updated.join('\n'));
      onChange({ negatives: updated });
    }
  };

  const totalKeywords = generatedKeywords.length + (config.extra_keywords?.length || 0);

  return (
    <div className="space-y-4">
      {/* Auto-Collection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Coleta Automática de Keywords</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-keywords">Usar Keywords da IA</Label>
              <p className="text-sm text-muted-foreground">
                Inclui keywords geradas automaticamente pelo SEO {data?.seo?.ai_keywords?.length || 0} encontradas
              </p>
            </div>
            <Switch
              id="ai-keywords"
              checked={config.include_ai_keywords}
              onCheckedChange={(checked) => onChange({ include_ai_keywords: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="faq-keywords">Extrair do FAQ</Label>
              <p className="text-sm text-muted-foreground">
                Converte perguntas do FAQ em keywords long-tail
              </p>
            </div>
            <Switch
              id="faq-keywords"
              checked={config.include_faq_longtail}
              onCheckedChange={(checked) => onChange({ include_faq_longtail: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Generated Keywords Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Keywords Geradas Automaticamente
            <Badge variant="secondary">{generatedKeywords.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {generatedKeywords.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma keyword encontrada. Ative as opções acima ou adicione keywords manuais.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {generatedKeywords.slice(0, 20).map((keyword, index) => (
                <Badge key={index} variant="outline">
                  {keyword}
                </Badge>
              ))}
              {generatedKeywords.length > 20 && (
                <Badge variant="secondary">
                  +{generatedKeywords.length - 20} mais
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords Adicionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="extra-keywords">Adicionar Keywords Manuais</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Uma keyword por linha. Estas serão adicionadas às keywords automáticas.
            </p>
            <Textarea
              id="extra-keywords"
              placeholder="scanner intraoral&#10;consultoria odontológica&#10;atendimento especializado"
              value={extraKeywords}
              onChange={(e) => handleExtraKeywordsChange(e.target.value)}
              rows={4}
            />
          </div>

          {config.extra_keywords?.length > 0 && (
            <div>
              <Label>Keywords Adicionadas ({config.extra_keywords.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.extra_keywords.map((keyword: string, index: number) => (
                  <Badge key={index} variant="default" className="gap-1">
                    {keyword}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => removeKeyword(keyword, 'extra')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Negative Keywords */}
      <Card>
        <CardHeader>
          <CardTitle>Keywords Negativas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="negative-keywords">Keywords para Excluir</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Uma keyword por linha. Evita que seus anúncios apareçam para estas pesquisas.
            </p>
            <Textarea
              id="negative-keywords"
              placeholder="grátis&#10;barato&#10;promoção"
              value={negativeKeywords}
              onChange={(e) => handleNegativeKeywordsChange(e.target.value)}
              rows={3}
            />
          </div>

          {config.negatives?.length > 0 && (
            <div>
              <Label>Keywords Negativas ({config.negatives.length})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {config.negatives.map((keyword: string, index: number) => (
                  <Badge key={index} variant="destructive" className="gap-1">
                    -{keyword}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => removeKeyword(keyword, 'negative')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalKeywords}</div>
            <div className="text-sm text-muted-foreground">
              Total de keywords para a campanha
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};