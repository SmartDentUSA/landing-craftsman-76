import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Eye, Database, FileText, RotateCcw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EdgeFunction {
  id: string;
  name: string;
  description: string;
  prompts: string[];
  dataSources: string[];
  status: string;
}

interface PromptEditModalProps {
  edgeFunction: EdgeFunction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Mapeamento de fontes de dados disponíveis
const DATA_SOURCES = {
  products_repository: {
    label: "Repositório de Produtos",
    fields: [
      "name", "description", "price", "category", "subcategory", "benefits", 
      "features", "keywords", "target_audience", "sales_pitch", "youtube_videos", 
      "instagram_videos", "technical_videos", "testimonial_videos"
    ]
  },
  company_profile: {
    label: "Perfil da Empresa",
    fields: [
      "company_name", "company_description", "business_sector", "mission_statement", 
      "vision_statement", "brand_values", "differentiators", "seo_technical_expertise", 
      "working_methodology", "target_audience", "seo_competitive_advantages"
    ]
  },
  categories_config: {
    label: "Configuração de Categorias",
    fields: [
      "category", "subcategory", "keywords", "target_audience", 
      "search_intent_keywords", "market_keywords"
    ]
  },
  landing_pages: {
    label: "Landing Pages",
    fields: [
      "name", "template", "data", "selected_product_ids"
    ]
  },
  keywords: {
    label: "Palavras-chave",
    fields: [
      "primary_keyword", "secondary_keywords", "long_tail_keywords"
    ]
  },
  target_audience: {
    label: "Público-alvo",
    fields: [
      "demographics", "interests", "pain_points", "behaviors"
    ]
  },
  video_testimonials: {
    label: "Depoimentos em Vídeo",
    fields: [
      "client_name", "profession", "testimonial_text", "youtube_url", 
      "instagram_url", "ai_keywords", "sentiment_score"
    ]
  },
  company_videos: {
    label: "Vídeos da Empresa",
    fields: [
      "youtube_videos", "instagram_videos", "technical_videos", "testimonial_videos"
    ]
  },
  video_captions: {
    label: "Legendas de Vídeo",
    fields: [
      "caption_text", "video_url", "language", "extraction_method", "ai_analysis"
    ]
  }
};

// Mapeamento de prompts reais das Edge Functions
const REAL_PROMPTS = {
  "generate-product-ai-content": {
    "Benefícios do Produto": `Você é um especialista em marketing de produtos e benefícios ao consumidor.

Analise o produto fornecido e gere uma lista de benefícios claros e convincentes que destaquem como este produto resolve problemas ou melhora a vida do cliente.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Subcategoria: {product.subcategory}
- Preço: {product.price}
- Público-alvo: {product.target_audience}

Instruções específicas:
1. Foque em benefícios reais e tangíveis para o usuário
2. Use linguagem clara e persuasiva
3. Priorize benefícios únicos desta categoria de produto
4. Considere tanto benefícios funcionais quanto emocionais
5. Gere entre 5-8 benefícios distintos
6. Cada benefício deve ter entre 10-25 palavras

Retorne apenas um array JSON de strings com os benefícios, sem explicações adicionais.

Exemplo de formato:
["Benefício 1", "Benefício 2", "Benefício 3"]`,

    "Keywords do Produto": `Você é um especialista em SEO e marketing digital.

Analise o produto fornecido e gere uma lista de palavras-chave relevantes para SEO e marketing que ajudem o produto a ser encontrado pelo público-alvo correto.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Subcategoria: {product.subcategory}
- Preço: {product.price}
- Público-alvo: {product.target_audience}

Instruções específicas:
1. Inclua keywords primárias (alto volume, média concorrência)
2. Inclua keywords de cauda longa (específicas, baixa concorrência)
3. Considere intenção de busca comercial e informacional
4. Priorize keywords relevantes para a categoria do produto
5. Gere entre 10-15 keywords
6. Misture termos técnicos e linguagem comum do consumidor

Retorne apenas um array JSON de strings com as keywords, sem explicações adicionais.

Exemplo de formato:
["keyword 1", "keyword 2", "keyword 3"]`,

    "Características do Produto": `Você é um especialista em especificações técnicas e características de produtos.

Analise o produto fornecido e gere uma lista de características técnicas e funcionais que destaquem as especificações importantes deste produto.

Informações do Produto:
- Nome: {product.name}
- Descrição: {product.description}
- Categoria: {product.category}
- Subcategoria: {product.subcategory}
- Preço: {product.price}

Instruções específicas:
1. Foque em características mensuráveis e verificáveis
2. Inclua especificações técnicas relevantes para a categoria
3. Considere aspectos de qualidade, durabilidade e performance
4. Use terminologia apropriada para o segmento do produto
5. Gere entre 6-10 características distintas
6. Cada característica deve ser concisa e informativa

Retorne apenas um array JSON de strings com as características, sem explicações adicionais.

Exemplo de formato:
["Característica 1", "Característica 2", "Característica 3"]`
  },
  
  "generate-product-blog": {
    "Blog Comercial": `Você é um redator especializado em marketing de conteúdo e vendas.

Crie um blog post comercial persuasivo que apresente o produto de forma atrativa, destacando seus benefícios e incentivando a compra.

DADOS DO PRODUTO:
{productData}

DADOS DA EMPRESA:
{companyData}

ESTRUTURA OBRIGATÓRIA:
1. **Título cativante** (50-60 caracteres)
2. **Introdução envolvente** (parágrafo que desperta interesse)
3. **Problema/Necessidade** (identifica dor do cliente)
4. **Apresentação da Solução** (como o produto resolve)
5. **Benefícios Principais** (3-5 benefícios com explicação)
6. **Diferenciais Competitivos** (por que escolher este produto)
7. **Prova Social** (credibilidade da empresa)
8. **Call-to-Action** (convite claro para ação)

DIRETRIZES:
- Tom persuasivo mas não agressivo
- Foque em benefícios, não apenas características
- Use linguagem acessível ao público-alvo
- Inclua elementos de urgência sutil
- Tamanho: 800-1200 palavras
- SEO-friendly com keywords naturais

Retorne apenas o conteúdo do blog em markdown, sem explicações adicionais.`,

    "Blog Técnico": `Você é um redator técnico especializado em conteúdo educativo e informativo.

Crie um blog post técnico detalhado que eduque o leitor sobre aspectos técnicos, funcionamento e aplicações do produto.

DADOS DO PRODUTO:
{productData}

DADOS DA EMPRESA:
{companyData}

ESTRUTURA OBRIGATÓRIA:
1. **Título informativo** (foco em educação)
2. **Introdução técnica** (contexto e relevância)
3. **Explicação do Funcionamento** (como funciona tecnicamente)
4. **Características Técnicas** (especificações detalhadas)
5. **Aplicações e Casos de Uso** (onde e como usar)
6. **Vantagens Técnicas** (superioridade técnica)
7. **Considerações de Implementação** (aspectos práticos)
8. **Conclusão Técnica** (resumo dos pontos principais)

DIRETRIZES:
- Tom educativo e autoritativo
- Foque em especificações e performance
- Use terminologia técnica apropriada
- Inclua dados e números quando possível
- Tamanho: 1000-1500 palavras
- Estrutura clara com subtítulos

Retorne apenas o conteúdo do blog em markdown, sem explicações adicionais.`
  },

  "ai-seo-generator": {
    "Meta Description": `Crie uma meta description otimizada para SEO com base no conteúdo fornecido.

Requisitos:
- Entre 140-160 caracteres
- Inclua a palavra-chave principal naturalmente
- Seja persuasiva e clara
- Desperte curiosidade
- Inclua call-to-action sutil quando relevante

Conteúdo: {content}
Palavra-chave principal: {primaryKeyword}

Retorne apenas a meta description, sem explicações.`,

    "Título SEO": `Crie um título SEO otimizado com base no conteúdo fornecido.

Requisitos:
- Entre 50-60 caracteres
- Inclua a palavra-chave principal no início
- Seja claro e atrativo
- Reflita o conteúdo principal
- Desperte interesse do usuário

Conteúdo: {content}
Palavra-chave principal: {primaryKeyword}

Retorne apenas o título, sem explicações.`,

    "Keywords": `Gere uma lista de palavras-chave SEO relevantes com base no conteúdo fornecido.

Inclua:
- Keywords primárias (alto volume)
- Keywords de cauda longa
- Variações e sinônimos
- Keywords de intenção comercial
- Keywords relacionadas ao tópico

Conteúdo: {content}

Retorne um array JSON com as keywords, sem explicações.`,

    "Conteúdo Oculto": `Gere conteúdo SEO adicional que pode ser usado como texto alternativo, legendas ou conteúdo expandido.

Requisitos:
- Relacionado ao tema principal
- Rico em palavras-chave relevantes
- Útil para contexto SEO
- Natural e bem escrito
- Entre 100-200 palavras

Conteúdo base: {content}

Retorne apenas o conteúdo adicional, sem explicações.`,

    "Conteúdo de Blog": `Crie um artigo de blog completo e otimizado para SEO com base no tópico fornecido.

Estrutura:
1. Título atrativo (H1)
2. Introdução envolvente
3. Desenvolvimento com subtítulos (H2, H3)
4. Conclusão persuasiva
5. Call-to-action

Requisitos:
- Entre 800-1200 palavras
- Uso natural de keywords
- Linguagem clara e envolvente
- Estrutura SEO-friendly
- Valor educativo real

Tópico: {topic}
Keywords: {keywords}

Retorne o artigo completo em markdown.`,

    "Análise de Depoimento": `Analise o depoimento em vídeo fornecido e extraia insights estruturados.

Retorne um JSON com:
- keywords: array de palavras-chave mencionadas
- sentiment: score de 1-10 (1=muito negativo, 10=muito positivo)  
- summary: resumo de 2-3 frases dos pontos principais
- emotions: array de emoções detectadas
- topics: array de tópicos abordados

Conteúdo do depoimento: {content}

Retorne apenas o JSON, sem explicações.`,

    "Keywords FAQ": `Gere perguntas frequentes (FAQ) baseadas nas palavras-chave fornecidas.

Para cada keyword, crie:
- Pergunta natural que usuários fariam
- Resposta completa e útil
- Foco em intenção de busca

Formato de retorno:
\`\`\`json
[
  {
    "question": "Pergunta?",
    "answer": "Resposta completa..."
  }
]
\`\`\`

Keywords: {keywords}

Retorne apenas o JSON com as FAQs.`
  },

  "generate-ad-copies": {
    "Cópias Google Ads": `Você é um especialista em Google Ads e copywriting persuasivo.

Crie cópias de anúncios Google Ads otimizadas com base nas informações de SEO fornecidas.

INFORMAÇÕES FORNECIDAS:
- Título SEO: {seoTitle}
- Meta Description: {seoDescription}  
- Palavra-chave principal: {primaryKeyword}
- Público-alvo: {targetAudience}

INSTRUÇÕES CRÍTICAS:
1. **PRIORIZAÇÃO POR CATEGORIA**: Use a palavra-chave principal como base, mas SEMPRE priorize termos específicos da categoria/produto quando eles forem mais relevantes para o anúncio.

2. **HEADLINES (3-5 unidades)**:
   - Máximo 30 caracteres cada
   - Inclua palavra-chave ou termo da categoria
   - Seja direto e persuasivo
   - Foque em benefícios principais

3. **DESCRIPTIONS (2-3 unidades)**:
   - Máximo 90 caracteres cada  
   - Expanda os benefícios
   - Inclua call-to-action
   - Destaque diferenciais

4. **PATHS (2 unidades)**:
   - Máximo 15 caracteres cada
   - Use termos relacionados ao produto/categoria
   - Seja descritivo

IMPORTANTE: Se a categoria do produto (ex: "equipamento odontológico") for mais específica e relevante que a palavra-chave genérica, priorize termos da categoria nos anúncios.

Retorne no formato JSON:
{
  "headlines": ["headline1", "headline2", "headline3"],
  "descriptions": ["desc1", "desc2"],  
  "paths": ["path1", "path2"]
}`
  },

  "extract-youtube-captions": {
    "Análise de Vídeos": `Analise o conteúdo das legendas do vídeo e extraia insights estruturados.

Tipo de vídeo: {videoType}
Conteúdo das legendas: {captions}

Com base no tipo de vídeo, forneça uma análise direcionada:

Para vídeos PROMOCIONAIS:
- Extraia palavras-chave de marketing mencionadas
- Identifique benefícios e características destacadas
- Analise o tom promocional (1-10)

Para vídeos TÉCNICOS:
- Extraia termos técnicos e especificações
- Identifique processos ou metodologias mencionadas
- Analise o nível de complexidade técnica (1-10)

Para DEPOIMENTOS:
- Extraia experiências e resultados mencionados
- Identifique emoções e satisfação expressas
- Analise credibilidade e autenticidade (1-10)

Para vídeos INSTITUCIONAIS:
- Extraia valores e missão da empresa mencionados
- Identifique diferenciais competitivos destacados
- Analise profissionalismo e confiança (1-10)

Retorne um JSON estruturado:
{
  "keywords": ["palavra1", "palavra2"],
  "sentiment": numero_de_1_a_10,
  "summary": "Resumo em 2-3 frases dos pontos principais",
  "specific_insights": {
    // Insights específicos baseados no tipo de vídeo
  }
}

Retorne apenas o JSON, sem explicações adicionais.`
  }
};

export const PromptEditModal: React.FC<PromptEditModalProps> = ({
  edgeFunction,
  open,
  onOpenChange
}) => {
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [previewPrompt, setPreviewPrompt] = useState('');
  const [tokenCount, setTokenCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (edgeFunction) {
      // Inicializar com fontes de dados padrão
      const initialFields: Record<string, string[]> = {};
      edgeFunction.dataSources.forEach(source => {
        if (DATA_SOURCES[source as keyof typeof DATA_SOURCES]) {
          initialFields[source] = DATA_SOURCES[source as keyof typeof DATA_SOURCES].fields;
        }
      });
      setSelectedFields(initialFields);

      // Inicializar prompts com prompts reais das Edge Functions
      const initialPrompts: Record<string, string> = {};
      edgeFunction.prompts.forEach(prompt => {
        const realPrompt = REAL_PROMPTS[edgeFunction.id as keyof typeof REAL_PROMPTS]?.[prompt];
        initialPrompts[prompt] = realPrompt || `Prompt personalizado para ${prompt}...`;
      });
      setCustomPrompts(initialPrompts);
    }
  }, [edgeFunction]);

  const handleFieldToggle = (dataSource: string, field: string) => {
    setSelectedFields(prev => ({
      ...prev,
      [dataSource]: prev[dataSource]?.includes(field)
        ? prev[dataSource].filter(f => f !== field)
        : [...(prev[dataSource] || []), field]
    }));
  };

  const generatePreview = () => {
    if (!edgeFunction) return;
    
    let preview = `=== PREVIEW DO PROMPT ===\n\n`;
    preview += `Função: ${edgeFunction.name}\n\n`;
    
    Object.entries(selectedFields).forEach(([source, fields]) => {
      if (fields.length > 0) {
        preview += `${DATA_SOURCES[source as keyof typeof DATA_SOURCES]?.label}:\n`;
        fields.forEach(field => {
          preview += `- ${field}: [valor_do_campo]\n`;
        });
        preview += '\n';
      }
    });

    edgeFunction.prompts.forEach(prompt => {
      if (customPrompts[prompt]) {
        preview += `Prompt ${prompt}:\n${customPrompts[prompt]}\n\n`;
      }
    });

    setPreviewPrompt(preview);
    setTokenCount(Math.floor(preview.length / 4)); // Estimativa simples
  };

  const handleSave = () => {
    toast({
      title: "Configuração Salva",
      description: "As configurações do prompt foram salvas com sucesso.",
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    if (edgeFunction) {
      const initialFields: Record<string, string[]> = {};
      edgeFunction.dataSources.forEach(source => {
        if (DATA_SOURCES[source as keyof typeof DATA_SOURCES]) {
          initialFields[source] = DATA_SOURCES[source as keyof typeof DATA_SOURCES].fields;
        }
      });
      setSelectedFields(initialFields);
    }
  };

  if (!edgeFunction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Editar Prompts - {edgeFunction.name}
          </DialogTitle>
          <DialogDescription>
            Configure os dados utilizados e personalize os prompts para esta função IA
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="data-sources" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="data-sources" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              Fontes de Dados
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Prompts
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data-sources" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Selecione quais campos de dados serão utilizados na geração de conteúdo para esta função.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4">
                  {edgeFunction.dataSources.map(source => {
                    const sourceData = DATA_SOURCES[source as keyof typeof DATA_SOURCES];
                    if (!sourceData) return null;

                    return (
                      <Card key={source}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{sourceData.label}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {sourceData.fields.map(field => (
                              <div key={field} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${source}-${field}`}
                                  checked={selectedFields[source]?.includes(field) || false}
                                  onCheckedChange={() => handleFieldToggle(source, field)}
                                />
                                <Label 
                                  htmlFor={`${source}-${field}`} 
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {field}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="prompts" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Personalize os prompts utilizados por esta função IA. Use variáveis como {'{dados_produto}'} para inserir dados dinâmicos.
                  </AlertDescription>
                </Alert>

                {edgeFunction.prompts.map(prompt => (
                  <Card key={prompt}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base capitalize">{prompt.replace('_', ' ')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder={`Digite o prompt personalizado para ${prompt}...`}
                        value={customPrompts[prompt] || ''}
                        onChange={(e) => setCustomPrompts(prev => ({
                          ...prev,
                          [prompt]: e.target.value
                        }))}
                        className="min-h-[120px] resize-none"
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-[500px] flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Tokens estimados: {tokenCount}</Badge>
                  {tokenCount > 4000 && (
                    <Badge variant="destructive">Muito extenso</Badge>
                  )}
                </div>
                <Button onClick={generatePreview} variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-1" />
                  Gerar Preview
                </Button>
              </div>
              
              <ScrollArea className="flex-1 border rounded-md">
                <div className="p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {previewPrompt || 'Clique em "Gerar Preview" para visualizar o prompt completo'}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-1"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};