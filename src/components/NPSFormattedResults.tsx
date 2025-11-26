import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NPSContentActions } from './NPSContentActions';
import { 
  HelpCircle, 
  FileText, 
  Package, 
  LayoutGrid 
} from 'lucide-react';

interface NPSFormattedResultsProps {
  actionType: 'landing-pages' | 'blog-topics' | 'product-mapping' | 'faqs';
  data: any;
  contentId?: string;
  onApplied?: () => void;
}

export const NPSFormattedResults = ({ 
  actionType, 
  data, 
  contentId,
  onApplied 
}: NPSFormattedResultsProps) => {
  
  const renderFAQs = () => {
    const faqs = data.faqs || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">FAQs Geradas ({faqs.length})</h3>
        </div>
        
        {faqs.map((faq: any, index: number) => (
          <Card key={index} className="p-4">
            <h4 className="font-semibold text-foreground mb-2">{faq.question}</h4>
            <p className="text-sm text-muted-foreground">{faq.answer}</p>
            {faq.related_themes && (
              <div className="flex gap-2 mt-3">
                {faq.related_themes.map((theme: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        ))}
        
        <div className="flex justify-end mt-4">
          <NPSContentActions 
            actionType="faqs" 
            data={data} 
            contentId={contentId}
            onApplied={onApplied}
          />
        </div>
      </div>
    );
  };

  const renderBlogTopics = () => {
    const topics = data.blog_topics || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Tópicos de Blog ({topics.length})</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((topic: any, index: number) => (
            <Card key={index} className="p-4">
              <Badge className="mb-2">{topic.priority}</Badge>
              <h4 className="font-semibold text-foreground mb-2">{topic.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{topic.description}</p>
              
              <Separator className="my-3" />
              
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">Público:</span>
                  <span className="ml-2 text-muted-foreground">{topic.target_audience}</span>
                </div>
                <div>
                  <span className="font-medium">Keywords:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {topic.keywords?.map((kw: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="flex justify-end mt-4">
          <NPSContentActions 
            actionType="blog-topics" 
            data={data} 
            contentId={contentId}
            onApplied={onApplied}
          />
        </div>
      </div>
    );
  };

  const renderLandingPages = () => {
    const pages = data.landing_pages || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Landing Pages Sugeridas ({pages.length})</h3>
        </div>
        
        {pages.map((page: any, index: number) => (
          <Card key={index} className="p-6">
            <div className="flex items-start justify-between mb-3">
              <h4 className="text-xl font-bold text-foreground">{page.title}</h4>
              <Badge variant="default">{page.pain_type}</Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">{page.value_proposition}</p>
            
            <Separator className="my-4" />
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h5 className="font-semibold text-sm mb-2">Produtos Relacionados:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {page.related_products?.map((product: string, i: number) => (
                    <li key={i}>• {product}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="font-semibold text-sm mb-2">CTAs Sugeridos:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {page.cta_suggestions?.map((cta: string, i: number) => (
                    <li key={i}>• {cta}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        ))}
        
        <div className="flex justify-end mt-4">
          <NPSContentActions 
            actionType="landing-pages" 
            data={data} 
            contentId={contentId}
            onApplied={onApplied}
          />
        </div>
      </div>
    );
  };

  const renderProductMapping = () => {
    const mappings = data.product_mappings || [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Mapeamento de Produtos ({mappings.length})</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-semibold">Tema de Interesse</th>
                <th className="text-left p-3 font-semibold">Produtos Sugeridos</th>
                <th className="text-left p-3 font-semibold">Prioridade</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((mapping: any, index: number) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="p-3">
                    <div>
                      <div className="font-medium">{mapping.theme}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {mapping.demand_count} respostas
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {mapping.suggested_products?.map((product: string, i: number) => (
                        <Badge key={i} variant="secondary">
                          {product}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant={mapping.priority === 'high' ? 'default' : 'outline'}>
                      {mapping.priority}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="flex justify-end mt-4">
          <NPSContentActions 
            actionType="product-mapping" 
            data={data} 
            contentId={contentId}
            onApplied={onApplied}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    // Map action types from edge function to display types
    const normalizedActionType = actionType
      .replace('suggest-', '')
      .replace('generate-', '')
      .replace('map-products-to-interests', 'product-mapping')
      .replace('-from-interests', '')
      .replace('blog-topics', 'blog-topics')
      as 'landing-pages' | 'blog-topics' | 'product-mapping' | 'faqs';

    switch (normalizedActionType) {
      case 'faqs':
        return renderFAQs();
      case 'blog-topics':
        return renderBlogTopics();
      case 'landing-pages':
        return renderLandingPages();
      case 'product-mapping':
        return renderProductMapping();
      default:
        console.error('Unknown action type:', actionType, 'normalized to:', normalizedActionType);
        return <p className="text-muted-foreground">Tipo de conteúdo não reconhecido: {actionType}</p>;
    }
  };

  return (
    <div className="mt-6">
      {renderContent()}
    </div>
  );
};
