import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Image, CheckCircle, AlertCircle, ExternalLink, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useImageCache } from "@/hooks/useImageCache";

interface OpenGraphStatus {
  landingPageId: string;
  name: string;
  hasImage: boolean;
  ogImage?: string;
  title: string;
  description: string;
  status: 'approved' | 'draft';
}

interface OpenGraphDashboardProps {
  className?: string;
}

export function OpenGraphDashboard({ className }: OpenGraphDashboardProps) {
  const [ogStatuses, setOgStatuses] = useState<OpenGraphStatus[]>([]);
  const [companyLogo, setCompanyLogo] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewTitle, setPreviewTitle] = useState<string>('');
  const [previewDescription, setPreviewDescription] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { checkAndCacheImage } = useImageCache();

  useEffect(() => {
    loadOpenGraphData();
  }, []);

  const loadOpenGraphData = async () => {
    try {
      setLoading(true);
      
      // Load company logo
      const { data: companyData } = await supabase
        .from('company_profile')
        .select('company_logo_url')
        .limit(1)
        .maybeSingle();
      
      if (companyData?.company_logo_url) {
        setCompanyLogo(companyData.company_logo_url);
      }

      // Load landing pages
      const { data: landingPages, error } = await supabase
        .from('landing_pages')
        .select('id, name, status, data')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (landingPages) {
        const statuses: OpenGraphStatus[] = await Promise.all(
          landingPages.map(async (lp) => {
            const ogImage = (lp.data as any)?.seo?.og_image || 
                           (lp.data as any)?.hero?.image1_url ||
                           companyData?.company_logo_url;
            
            let hasValidImage = false;
            if (ogImage) {
              try {
                const imageData = await checkAndCacheImage(ogImage);
                hasValidImage = imageData.isValid;
              } catch (error) {
                console.warn('Error validating image:', ogImage, error);
              }
            }

            return {
              landingPageId: lp.id,
              name: lp.name,
              hasImage: hasValidImage,
              ogImage,
              title: (lp.data as any)?.seo?.title || lp.name,
              description: (lp.data as any)?.seo?.description || `Conteúdo sobre ${lp.name}`,
              status: lp.status as 'approved' | 'draft'
            };
          })
        );

        setOgStatuses(statuses);
      }
    } catch (error: any) {
      console.error('Error loading Open Graph data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (status: OpenGraphStatus) => {
    setPreviewUrl(`https://example.com/landing/${status.landingPageId}`);
    setPreviewTitle(status.title);
    setPreviewDescription(status.description);
    setPreviewImage(status.ogImage || companyLogo);
  };

  const copyPreviewHTML = () => {
    const html = `<meta property="og:title" content="${previewTitle}">
<meta property="og:description" content="${previewDescription}">
<meta property="og:url" content="${previewUrl}">
<meta property="og:image" content="${previewImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${previewTitle}">
<meta name="twitter:description" content="${previewDescription}">
<meta name="twitter:image" content="${previewImage}">`;

    navigator.clipboard.writeText(html);
    toast({
      title: "HTML copiado!",
      description: "Tags Open Graph copiadas para a área de transferência"
    });
  };

  const approvedCount = ogStatuses.filter(s => s.status === 'approved').length;
  const withImageCount = ogStatuses.filter(s => s.hasImage).length;
  const missingImageCount = ogStatuses.filter(s => s.status === 'approved' && !s.hasImage).length;

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">Carregando status Open Graph...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Status Open Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{ogStatuses.length}</div>
              <div className="text-sm text-muted-foreground">Total Landing Pages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
              <div className="text-sm text-muted-foreground">Aprovadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{withImageCount}</div>
              <div className="text-sm text-muted-foreground">Com Imagem</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{missingImageCount}</div>
              <div className="text-sm text-muted-foreground">Sem Imagem</div>
            </div>
          </div>
          
          {companyLogo && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-blue-800">✅ Logo da empresa configurado</p>
              <p className="text-xs text-blue-600 mt-1">Será usado como fallback quando landing pages não tiverem imagem específica.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Landing Pages Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status por Landing Page</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ogStatuses.map((status) => (
              <div key={status.landingPageId} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {status.hasImage ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <div className="font-medium">{status.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {status.hasImage ? 'Imagem Open Graph configurada' : 'Sem imagem específica'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={status.status === 'approved' ? 'default' : 'secondary'}>
                    {status.status === 'approved' ? 'Aprovada' : 'Rascunho'}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(status)}
                  >
                    Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Preview */}
      {previewTitle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              Preview de Compartilhamento Social
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Facebook/LinkedIn Style Preview */}
            <div className="border rounded-lg overflow-hidden max-w-md">
              {previewImage && (
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4 bg-gray-50">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                  {new URL(previewUrl).hostname}
                </div>
                <div className="font-semibold text-gray-900 mb-1 line-clamp-2">
                  {previewTitle}
                </div>
                <div className="text-sm text-gray-600 line-clamp-2">
                  {previewDescription}
                </div>
              </div>
            </div>

            {/* Configurações do Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="preview_title">Título</Label>
                <Input
                  id="preview_title"
                  value={previewTitle}
                  onChange={(e) => setPreviewTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="preview_url">URL</Label>
                <Input
                  id="preview_url"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="preview_description">Descrição</Label>
              <Textarea
                id="preview_description"
                value={previewDescription}
                onChange={(e) => setPreviewDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="preview_image">URL da Imagem</Label>
              <Input
                id="preview_image"
                value={previewImage}
                onChange={(e) => setPreviewImage(e.target.value)}
                placeholder="URL da imagem (1200x630px ideal)"
              />
            </div>

            <Button onClick={copyPreviewHTML} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar HTML Open Graph
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}