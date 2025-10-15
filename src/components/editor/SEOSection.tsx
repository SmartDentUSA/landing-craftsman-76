import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/ImageUploader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { validateCanonicalURL } from "@/lib/seo-validators";

interface ImageData {
  mode: 'url' | 'supabase';
  src: string;
  supabase_path?: string;
  alt: string;
  scale: number;
  href?: string;
}

interface SEOData {
  domain: string;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  meta_robots: string;
  og_title: string;
  og_description: string;
  og_image: ImageData;
  og_type: string;
  og_site_name: string;
  twitter_card: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image: ImageData;
  twitter_site: string;
  twitter_creator: string;
}

interface SEOSectionProps {
  data: SEOData;
  seoTitle: string;
  seoDescription: string;
  landingPageId?: string;
  onChange: (data: Partial<SEOData>) => void;
  onSEOTitleChange: (title: string) => void;
  onSEODescriptionChange: (description: string) => void;
}

export function SEOSection({ 
  data, 
  seoTitle, 
  seoDescription, 
  landingPageId,
  onChange, 
  onSEOTitleChange, 
  onSEODescriptionChange 
}: SEOSectionProps) {
  const [canonicalValidation, setCanonicalValidation] = useState({ 
    valid: true, 
    normalized: '', 
    errors: [] as string[]
  });

  const handleCanonicalChange = async (url: string) => {
    const validation = await validateCanonicalURL(
      url, 
      data.domain,
      landingPageId
    );
    setCanonicalValidation(validation);
    
    // Auto-corrigir URL se possível
    if (validation.valid && validation.normalized) {
      onChange({ canonical_url: validation.normalized });
    } else {
      onChange({ canonical_url: url });
    }
  };

  useEffect(() => {
    if (data.canonical_url) {
      handleCanonicalChange(data.canonical_url);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Domain */}
      <div>
        <Label htmlFor="domain">Domínio Principal</Label>
        <Input
          id="domain"
          value={data.domain}
          onChange={(e) => onChange({ domain: e.target.value })}
          placeholder="exemplo.com.br"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Apenas o domínio, sem https:// ou www
        </p>
      </div>

      {/* SEO Title */}
      <div>
        <Label htmlFor="seo-title">Título SEO</Label>
        <Input
          id="seo-title"
          value={seoTitle}
          onChange={(e) => onSEOTitleChange(e.target.value)}
          placeholder="Título otimizado para mecanismos de busca"
          maxLength={60}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {seoTitle.length}/60 caracteres
        </p>
      </div>

      {/* SEO Description */}
      <div>
        <Label htmlFor="seo-description">Descrição SEO</Label>
        <Textarea
          id="seo-description"
          value={seoDescription}
          onChange={(e) => onSEODescriptionChange(e.target.value)}
          placeholder="Descrição otimizada que aparece nos resultados de busca"
          rows={3}
          maxLength={160}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {seoDescription.length}/160 caracteres
        </p>
      </div>

      {/* Canonical URL */}
      <div>
        <Label htmlFor="canonical">Canonical URL</Label>
        <Input
          id="canonical"
          value={data.canonical_url}
          onChange={(e) => handleCanonicalChange(e.target.value)}
          placeholder="https://exemplo.com.br/pagina"
          className={!canonicalValidation.valid ? 'border-destructive' : ''}
        />
        
        {!canonicalValidation.valid && canonicalValidation.errors.length > 0 && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>URL Inválida</AlertTitle>
            <AlertDescription>
              {canonicalValidation.errors.map((error, idx) => (
                <div key={idx}>• {error}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}
        
        {canonicalValidation.valid && canonicalValidation.normalized && canonicalValidation.normalized !== data.canonical_url && (
          <Alert className="mt-2">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>URL Normalizada</AlertTitle>
            <AlertDescription>
              Aplicada automaticamente: {canonicalValidation.normalized}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Meta Robots */}
      <div>
        <Label htmlFor="meta-robots">Meta Robots</Label>
        <Select value={data.meta_robots || 'index, follow'} onValueChange={(v) => onChange({ meta_robots: v })}>
          <SelectTrigger id="meta-robots">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="index, follow">index, follow (padrão - permite indexação)</SelectItem>
            <SelectItem value="noindex, nofollow">noindex, nofollow (bloqueia indexação)</SelectItem>
            <SelectItem value="index, nofollow">index, nofollow (indexa mas não segue links)</SelectItem>
            <SelectItem value="noindex, follow">noindex, follow (não indexa mas segue links)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Open Graph */}
      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">Open Graph (Facebook/LinkedIn)</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="og-title">OG Title</Label>
            <Input
              id="og-title"
              value={data.og_title}
              onChange={(e) => onChange({ og_title: e.target.value })}
              placeholder="Título para redes sociais"
            />
          </div>

          <div>
            <Label htmlFor="og-description">OG Description</Label>
            <Textarea
              id="og-description"
              value={data.og_description}
              onChange={(e) => onChange({ og_description: e.target.value })}
              placeholder="Descrição para redes sociais"
              rows={2}
            />
          </div>

          <div>
            <Label>OG Image</Label>
            <ImageUploader
              value={data.og_image}
              onChange={(imageData) => onChange({ og_image: imageData })}
              placeholder="URL da imagem para compartilhamento (1200x630px)"
            />
          </div>

          <div>
            <Label htmlFor="og-type">OG Type</Label>
            <Select value={data.og_type || 'website'} onValueChange={(v) => onChange({ og_type: v })}>
              <SelectTrigger id="og-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">website</SelectItem>
                <SelectItem value="article">article</SelectItem>
                <SelectItem value="product">product</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Twitter Card */}
      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">Twitter Card</h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="twitter-card">Card Type</Label>
            <Select value={data.twitter_card || 'summary_large_image'} onValueChange={(v) => onChange({ twitter_card: v })}>
              <SelectTrigger id="twitter-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">summary</SelectItem>
                <SelectItem value="summary_large_image">summary_large_image</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="twitter-title">Twitter Title</Label>
            <Input
              id="twitter-title"
              value={data.twitter_title}
              onChange={(e) => onChange({ twitter_title: e.target.value })}
              placeholder="Título para Twitter"
            />
          </div>

          <div>
            <Label htmlFor="twitter-description">Twitter Description</Label>
            <Textarea
              id="twitter-description"
              value={data.twitter_description}
              onChange={(e) => onChange({ twitter_description: e.target.value })}
              placeholder="Descrição para Twitter"
              rows={2}
            />
          </div>

          <div>
            <Label>Twitter Image</Label>
            <ImageUploader
              value={data.twitter_image}
              onChange={(imageData) => onChange({ twitter_image: imageData })}
              placeholder="URL da imagem para Twitter"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
