import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Globe, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateHTML } from '@/lib/template-engine';
import { getCompanyProfileForSEO, buildSEOMetaFromCompany } from '@/lib/company-profile-helper';
import type { LandingPage } from '@/hooks/useLandingPagesSupabase';

interface SEODomain {
  name: string;
  domain: string;
  enabled: boolean;
  publish_method: 'ftp' | 'cloudflare';
  ftp_profile?: string;
  ftp_remote_path?: string;
  url_structure?: Record<string, string>;
}

interface LPPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingPage: LandingPage | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  products: 'Produtos',
  blog: 'Blog',
  guides: 'Guias',
  compare: 'Compare',
  spin: 'Soluções SPIN',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function LPPublishDialog({ open, onOpenChange, landingPage }: LPPublishDialogProps) {
  const { toast } = useToast();
  const [domains, setDomains] = useState<SEODomain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [slug, setSlug] = useState('');
  const [isHomepage, setIsHomepage] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Load domains from company_profile
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('company_profile')
        .select('seo_domains')
        .limit(1)
        .maybeSingle();
      
      if (data?.seo_domains && Array.isArray(data.seo_domains)) {
        setDomains((data.seo_domains as unknown as SEODomain[]).filter(d => d.enabled));
      }
    })();
  }, [open]);

  // Auto-generate slug from LP name
  useEffect(() => {
    if (landingPage) {
      setSlug(slugify(landingPage.name));
    }
  }, [landingPage]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedDomain('');
      setSelectedCategory('');
      setIsHomepage(false);
    }
  }, [open]);

  const domainConfig = useMemo(
    () => domains.find(d => d.domain === selectedDomain),
    [domains, selectedDomain]
  );

  const categories = useMemo(() => {
    if (!domainConfig?.url_structure) return [];
    return Object.entries(domainConfig.url_structure).map(([key, pattern]) => ({
      key,
      label: CATEGORY_LABELS[key] || key,
      pattern,
    }));
  }, [domainConfig]);

  const previewUrl = useMemo(() => {
    if (!selectedDomain) return '';
    if (isHomepage) return `https://${selectedDomain}/`;
    const cat = categories.find(c => c.key === selectedCategory);
    if (cat) {
      return `https://${selectedDomain}${cat.pattern.replace('{slug}', slug || 'meu-slug')}`;
    }
    return `https://${selectedDomain}/${slug || 'meu-slug'}`;
  }, [selectedDomain, isHomepage, selectedCategory, slug, categories]);

  const pagePath = useMemo(() => {
    if (isHomepage) return '/';
    const cat = categories.find(c => c.key === selectedCategory);
    if (cat) return cat.pattern.replace('{slug}', slug);
    return `/${slug}`;
  }, [isHomepage, selectedCategory, slug, categories]);

  const handlePublish = async () => {
    if (!landingPage || !selectedDomain) return;
    setIsPublishing(true);

    try {
      // 1. Fetch full LP data
      const { data: lpData, error: lpError } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', landingPage.id)
        .single();

      if (lpError || !lpData) throw new Error('Landing page não encontrada');

      // 2. Generate HTML using the main template engine (same as CodeView/Preview)
      const pageData = (lpData.data as any) || {};
      let enhancedData = { ...pageData };

      // Enrich with company profile (same logic as useEnhancedTemplateEngine)
      const companyProfile = await getCompanyProfileForSEO();
      if (companyProfile) {
        const companyMeta = buildSEOMetaFromCompany(companyProfile, pageData.ai_keywords?.primary || []);
        if (!enhancedData.og_site_name && companyProfile.company_name) {
          enhancedData.og_site_name = companyProfile.company_name;
        }
        if (!enhancedData.seo_description && companyProfile.company_description) {
          enhancedData.seo_description = companyProfile.company_description;
        }
        if (companyMeta.additionalKeywords.length > 0) {
          const existingKeywords = enhancedData.ai_keywords?.primary || [];
          enhancedData.ai_keywords = { ...enhancedData.ai_keywords, primary: [...existingKeywords, ...companyMeta.additionalKeywords] };
        }
        enhancedData.company_footer = companyMeta.companyFooter;
        enhancedData.institutional_links_html = companyMeta.institutionalLinksHtml;
        enhancedData.company_profile = companyProfile;
      }

      const htmlCode = generateHTML(enhancedData);

      // 3. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 4. Insert into cloned_landing_pages
      const insertPayload = {
        name: landingPage.name,
        original_html: htmlCode,
        transformed_html: htmlCode,
        cta_url: previewUrl,
        user_id: user.id,
        target_domain: selectedDomain,
        page_path: pagePath,
        is_homepage: isHomepage,
        status: 'ready' as const,
        publish_status: 'pending' as const,
        source_landing_page_id: landingPage.id,
      };

      const { data: clonedLP, error: insertError } = await supabase
        .from('cloned_landing_pages')
        .insert(insertPayload)
        .select('id')
        .single();

      if (insertError) throw insertError;

      // 5. Call publish edge function
      const functionName = domainConfig?.publish_method === 'ftp'
        ? 'publish-ftp-pages'
        : 'publish-cloudflare-pages';

      const { error: fnError } = await supabase.functions.invoke(functionName, {
        body: {
          lpId: clonedLP.id,
          domain: selectedDomain,
          pagePath,
          isHomepage,
        },
      });

      if (fnError) throw fnError;

      toast({
        title: '✅ Publicação iniciada!',
        description: `"${landingPage.name}" está sendo publicada em ${selectedDomain}${pagePath}`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao publicar:', error);
      toast({
        title: '❌ Erro ao publicar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Publicar Landing Page
          </DialogTitle>
          <DialogDescription>
            Publique "{landingPage?.name}" em um domínio configurado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Domain selector */}
          <div className="space-y-2">
            <Label>Domínio</Label>
            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o domínio" />
              </SelectTrigger>
              <SelectContent>
                {domains.map(d => (
                  <SelectItem key={d.domain} value={d.domain}>
                    <span className="flex items-center gap-2">
                      {d.name} — {d.domain}
                      <Badge variant="outline" className="ml-1 text-xs">
                        {d.publish_method === 'ftp' ? 'FTP' : 'Cloudflare'}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
                {domains.length === 0 && (
                  <SelectItem value="_none" disabled>
                    Nenhum domínio configurado
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Homepage checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="homepage"
              checked={isHomepage}
              onCheckedChange={(v) => setIsHomepage(v === true)}
            />
            <Label htmlFor="homepage" className="cursor-pointer">
              Definir como página principal (/)
            </Label>
          </div>

          {/* Category selector */}
          {!isHomepage && categories.length > 0 && (
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.key} value={c.key}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Slug input */}
          {!isHomepage && (
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="meu-slug"
              />
            </div>
          )}

          {/* URL Preview */}
          {selectedDomain && (
            <div className="p-3 bg-muted rounded-lg">
              <Label className="text-xs text-muted-foreground">URL final</Label>
              <p className="text-sm font-mono mt-1 break-all">{previewUrl}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPublishing}>
            Cancelar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isPublishing || !selectedDomain || (!isHomepage && !slug)}
          >
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publicando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Publicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
