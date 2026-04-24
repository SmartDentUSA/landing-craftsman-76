import { useState, useMemo, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Code, Copy, Download, Eye, Image, CheckCircle, 
  XCircle, Loader2, FileCode, Trash2, ExternalLink, RefreshCw, Save,
  AlertTriangle, Search, Sparkles, Package, Link2, Pencil, X, 
  Globe, Rocket, ChevronDown, ChevronRight, Home, FolderOpen, Cloud,
  FileText, Newspaper
} from 'lucide-react';
import { LPCloneProductSelector, ProductWithSEO } from './LPCloneProductSelector';

interface CapturedImage {
  originalUrl: string;
  newUrl: string;
  supabasePath: string;
  status: 'success' | 'failed';
  error?: string;
  isHeroImage?: boolean;
}

interface GeneratedSEO {
  title?: string;
  description?: string;
  canonical?: string;
  keywords?: string;
  ogImage?: string;
}

interface TransformResult {
  success: boolean;
  html: string;
  capturedImages: CapturedImage[];
  stats: {
    imagesProcessed: number;
    imagesFailed: number;
    ctasRewritten: number;
    cssPreserved: boolean;
    headerRemoved: boolean;
    footerRemoved: boolean;
    videosPreserved?: number;
  };
  generatedSEO?: GeneratedSEO;
}

interface ClonedLP {
  id: string;
  name: string;
  brand: string | null;
  product: string | null;
  status: string;
  created_at: string;
  captured_images: CapturedImage[];
  original_html?: string;
  transformed_html?: string;
  cta_url?: string;
  seo_config?: {
    title?: string;
    description?: string;
    canonical?: string;
    keywords?: string;
  };
  target_domain?: string;
  page_path?: string;
  is_homepage?: boolean;
  publish_status?: string;
  published_url?: string;
}

interface SEODomain {
  name: string;
  domain: string;
  cloudflare_enabled?: boolean;
  cloudflare_project_name?: string;
  cloudflare_status?: string;
  publish_method?: 'cloudflare' | 'ftp' | 'git';
  ftp_profile?: string;
  enabled?: boolean;
  ftp_remote_path?: string;
  url_structure?: Record<string, string>;
}

// Product Blog types
interface ProductBlog {
  id: string;
  productId: string;
  productName: string;
  productBrand: string | null;
  productImage: string | null;
  blogType: 'commercial' | 'technical';
  content: string;
  generatedAt: string | null;
  // Publication info (from product_blog_publications)
  publicationId?: string;
  targetDomain?: string;
  pagePath?: string;
  publishStatus?: string;
  publishedUrl?: string;
  publishedAt?: string | null;
}

// Unified library item type
type LibraryItemType = 'lp' | 'blog';

interface LibraryItem {
  type: LibraryItemType;
  id: string;
  name: string;
  brand: string | null;
  product: string | null;
  targetDomain?: string;
  pagePath?: string;
  publishStatus?: string;
  publishedUrl?: string;
  createdAt: string;
  // LP specific
  lp?: ClonedLP;
  // Blog specific
  blog?: ProductBlog;
}


export const LPClonePanel = () => {
  const queryClient = useQueryClient();
  
  // Realtime subscription para sincronização automática de blogs
  useEffect(() => {
    const channel = supabase
      .channel('products-blog-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products_repository',
        },
        (payload) => {
          // Verificar se houve mudança no individual_blog_content
          if (payload.new && (payload.new as any).individual_blog_content) {
            queryClient.invalidateQueries({ queryKey: ['products-with-blogs'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
  
  const [originalHTML, setOriginalHTML] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [product, setProduct] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoCanonical, setSeoCanonical] = useState('');
  const [seoKeywords, setSeoKeywords] = useState('');
  
  // Publication state
  const [selectedDomain, setSelectedDomain] = useState('');
  const [pagePath, setPagePath] = useState('');
  const [isHomepage, setIsHomepage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const [result, setResult] = useState<TransformResult | null>(null);
  
  // Editing state
  const [editingLPId, setEditingLPId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('transform');
  
  // Bulk republish state
  const [bulkRepublishing, setBulkRepublishing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  
  // Product selector state
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSEO | null>(null);
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);
  
  // Processing mode: false = use prompt (remove header/footer), true = preserve original
  const [preserveOriginal, setPreserveOriginal] = useState(false);
  
  // Library collapsed sections
  const [collapsedDomains, setCollapsedDomains] = useState<Record<string, boolean>>({});
  
  // Fetch company domains
  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile-domains'],
    queryFn: async () => {
      const { data } = await supabase
        .from('company_profile')
        .select('seo_domains')
        .limit(1)
        .single();
      return data;
    },
  });
  
  const seoDomains = (companyProfile?.seo_domains as unknown as SEODomain[]) || [];
  const enabledDomains = seoDomains.filter(d => 
    d.enabled !== false && (
      d.publish_method === 'ftp' ||
      d.publish_method === 'git' ||
      (d.cloudflare_enabled && d.cloudflare_project_name)
    )
  );
  
  // Handle product selection
  const handleProductSelect = (product: ProductWithSEO) => {
    setSelectedProduct(product);
    setBrand(product.brand || '');
    setProduct(product.name);
    if (!name) setName(product.name);
    if (product.seo_title_override) setSeoTitle(product.seo_title_override);
    if (product.seo_description_override) setSeoDescription(product.seo_description_override);
    if (product.canonical_url) setSeoCanonical(product.canonical_url);
    if (product.keywords && product.keywords.length > 0) {
      setSeoKeywords(product.keywords.join(', '));
    }
    toast.success(`Produto "${product.name}" selecionado`);
  };
  
  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!originalHTML) errors.push('HTML Original é obrigatório');
    if (!ctaUrl) errors.push('URL do CTA é obrigatório');
    if (!brand) errors.push('Marca é obrigatória para SEO');
    if (!product) errors.push('Produto é obrigatório para SEO');
    
    if (seoTitle && seoTitle.length > 60) warnings.push('Título SEO muito longo (máx 60 caracteres)');
    if (seoDescription && seoDescription.length > 160) warnings.push('Meta description muito longa (máx 160 caracteres)');
    
    return { errors, warnings, isValid: errors.length === 0 };
  }, [originalHTML, ctaUrl, brand, product, seoTitle, seoDescription]);
  
  // SEO Preview
  const seoPreview = useMemo(() => {
    const previewTitle = seoTitle || (brand && product ? `${product} ${brand} | Smart Dent` : 'Preencha Marca e Produto');
    const previewDesc = seoDescription || (brand && product ? `Adquira ${product} da ${brand} com a Smart Dent.` : 'A descrição será gerada automaticamente');
    const previewUrl = seoCanonical || (brand && product ? `smartdent.com.br/${brand.toLowerCase()}-${product.toLowerCase().replace(/\s+/g, '-')}` : 'smartdent.com.br/...');
    return { title: previewTitle, description: previewDesc, url: previewUrl };
  }, [seoTitle, seoDescription, seoCanonical, brand, product]);
  
  // Fetch saved LPs with new fields
  const { data: savedLPs, isLoading: loadingLPs } = useQuery({
    queryKey: ['cloned-landing-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cloned_landing_pages')
        .select('id, name, brand, product, status, created_at, captured_images, original_html, transformed_html, cta_url, seo_config, target_domain, page_path, is_homepage, publish_status, published_url')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(lp => ({
        ...lp,
        captured_images: (lp.captured_images as unknown as CapturedImage[]) || [],
        seo_config: (lp.seo_config as unknown as ClonedLP['seo_config']) || {}
      })) as ClonedLP[];
    },
  });
  
  // Fetch products with blog content
  const { data: productsWithBlogs, isLoading: loadingBlogs, refetch: refetchBlogs } = useQuery({
    queryKey: ['products-with-blogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_repository')
        .select('id, name, brand, image_url, individual_blog_content, created_at')
        .not('individual_blog_content', 'is', null)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });
  
  // Fetch blog publications
  const { data: blogPublications } = useQuery({
    queryKey: ['blog-publications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_blog_publications')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  
  // Build product blogs list
  const productBlogs = useMemo(() => {
    if (!productsWithBlogs) return [];
    
    const blogs: ProductBlog[] = [];
    
    productsWithBlogs.forEach(product => {
      const blogContent = product.individual_blog_content as any;
      if (!blogContent) return;
      
      // Commercial blog
      if (blogContent.commercial) {
        const pub = blogPublications?.find(
          p => p.product_id === product.id && p.blog_type === 'commercial'
        );
        blogs.push({
          id: `${product.id}-commercial`,
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productImage: product.image_url,
          blogType: 'commercial',
          content: blogContent.commercial,
          generatedAt: blogContent.generated_at,
          publicationId: pub?.id,
          targetDomain: pub?.target_domain,
          pagePath: pub?.page_path,
          publishStatus: pub?.publish_status,
          publishedUrl: pub?.published_url,
          publishedAt: pub?.published_at,
        });
      }
      
      // Technical blog
      if (blogContent.technical) {
        const pub = blogPublications?.find(
          p => p.product_id === product.id && p.blog_type === 'technical'
        );
        blogs.push({
          id: `${product.id}-technical`,
          productId: product.id,
          productName: product.name,
          productBrand: product.brand,
          productImage: product.image_url,
          blogType: 'technical',
          content: blogContent.technical,
          generatedAt: blogContent.generated_at,
          publicationId: pub?.id,
          targetDomain: pub?.target_domain,
          pagePath: pub?.page_path,
          publishStatus: pub?.publish_status,
          publishedUrl: pub?.published_url,
          publishedAt: pub?.published_at,
        });
      }
    });
    
    return blogs;
  }, [productsWithBlogs, blogPublications]);
  
  // Create unified library items
  const libraryItems = useMemo(() => {
    const items: LibraryItem[] = [];
    
    // Add LPs
    savedLPs?.forEach(lp => {
      items.push({
        type: 'lp',
        id: lp.id,
        name: lp.name,
        brand: lp.brand,
        product: lp.product,
        targetDomain: lp.target_domain,
        pagePath: lp.page_path,
        publishStatus: lp.publish_status,
        publishedUrl: lp.published_url,
        createdAt: lp.created_at,
        lp,
      });
    });
    
    // Add Blogs
    productBlogs.forEach(blog => {
      items.push({
        type: 'blog',
        id: blog.id,
        name: `${blog.productName} - ${blog.blogType === 'commercial' ? 'Comercial' : 'Técnico'}`,
        brand: blog.productBrand,
        product: blog.productName,
        targetDomain: blog.targetDomain,
        pagePath: blog.pagePath,
        publishStatus: blog.publishStatus,
        publishedUrl: blog.publishedUrl,
        createdAt: blog.generatedAt || new Date().toISOString(),
        blog,
      });
    });
    
    return items;
  }, [savedLPs, productBlogs]);
  
  // Group library items by domain
  const itemsByDomain = useMemo(() => {
    const grouped: Record<string, LibraryItem[]> = {};
    const unassigned: LibraryItem[] = [];
    
    libraryItems.forEach(item => {
      if (item.targetDomain) {
        if (!grouped[item.targetDomain]) {
          grouped[item.targetDomain] = [];
        }
        grouped[item.targetDomain].push(item);
      } else {
        unassigned.push(item);
      }
    });
    
    // Sort each domain's items
    Object.keys(grouped).forEach(domain => {
      grouped[domain].sort((a, b) => {
        // LPs first, then blogs
        if (a.type !== b.type) return a.type === 'lp' ? -1 : 1;
        // Homepage LPs first
        if (a.type === 'lp' && a.lp?.is_homepage) return -1;
        if (b.type === 'lp' && b.lp?.is_homepage) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    });
    
    return { grouped, unassigned };
  }, [libraryItems]);
  
  // Transform mutation
  const transformMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('clone-landing-page', {
        body: {
          html: originalHTML,
          ctaUrl,
          seoConfig: {
            title: seoTitle,
            description: seoDescription,
            canonical: seoCanonical,
            keywords: seoKeywords,
          },
          brand,
          product,
          selectedProductId: selectedProduct?.id || null,
          preserveOriginal,
        },
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro na transformação');
      return data as TransformResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.generatedSEO) {
        if (!seoTitle && data.generatedSEO.title) setSeoTitle(data.generatedSEO.title);
        if (!seoDescription && data.generatedSEO.description) setSeoDescription(data.generatedSEO.description);
        if (!seoCanonical && data.generatedSEO.canonical) setSeoCanonical(data.generatedSEO.canonical);
        if (!seoKeywords && data.generatedSEO.keywords) setSeoKeywords(data.generatedSEO.keywords);
      }
      toast.success(`LP Clone concluída! ${data.stats.imagesProcessed} imagens`);
    },
    onError: (error) => {
      toast.error(`Erro: ${(error as Error).message}`);
    },
  });
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!result) throw new Error('Nenhum resultado para salvar');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');
      
      const { error } = await supabase
        .from('cloned_landing_pages')
        .insert([{
          user_id: user.id,
          name: name || `LP ${brand} ${product}`,
          brand,
          product,
          original_html: originalHTML,
          transformed_html: result.html,
          cta_url: ctaUrl,
          target_domain: selectedDomain || null,
          page_path: pagePath || '/',
          is_homepage: isHomepage,
          captured_images: JSON.parse(JSON.stringify(result.capturedImages)),
          seo_config: {
            title: seoTitle,
            description: seoDescription,
            canonical: seoCanonical,
            keywords: seoKeywords,
          },
          status: 'draft',
          publish_status: 'draft'
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('LP salva na biblioteca!');
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
    onError: (error) => {
      toast.error(`Erro ao salvar: ${(error as Error).message}`);
    },
  });
  
  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async (lpId: string) => {
      const lp = savedLPs?.find(l => l.id === lpId);
      if (!lp) throw new Error('LP não encontrada');
      if (!lp.target_domain) throw new Error('Domínio não definido');

      const domainConfig = seoDomains.find(d => d.domain === lp.target_domain);
      const method = domainConfig?.publish_method ?? 'cloudflare';
      const functionName = method === 'ftp' ? 'publish-ftp-pages' : method === 'git' ? 'publish-git-kinghost' : 'publish-cloudflare-pages';

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          lpId,
          domain: lp.target_domain,
          pagePath: lp.page_path || '/',
          isHomepage: lp.is_homepage || false
        }
      });

      // FunctionsHttpError esconde o corpo da resposta. Recuperar a mensagem real
      // do edge function — caso contrário o bulk só vê "non-2xx status code".
      if (error) {
        let detail = (error as any).message || String(error);
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) detail = body.error;
          } else if (ctx && typeof ctx.text === 'function') {
            const txt = await ctx.text();
            if (txt) detail = txt;
          }
        } catch (_) { /* ignore */ }
        throw new Error(`[${functionName}] ${detail}`);
      }
      if (!data?.success) {
        throw new Error(`[${functionName}] ${data?.error || 'erro desconhecido'}`);
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Publicado em ${data.deployment?.publishedUrl || data.publishedUrl || 'sucesso'}`);
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
    onError: (error) => {
      toast.error(`Erro ao publicar: ${(error as Error).message}`);
    }
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cloned_landing_pages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('LP removida!');
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingLPId || !result) throw new Error('Dados inválidos');
      
      const { error } = await supabase
        .from('cloned_landing_pages')
        .update({
          name: name || `LP ${brand} ${product}`,
          brand,
          product,
          original_html: originalHTML,
          transformed_html: result.html,
          cta_url: ctaUrl,
          target_domain: selectedDomain || null,
          page_path: pagePath || '/',
          is_homepage: isHomepage,
          captured_images: JSON.parse(JSON.stringify(result.capturedImages)),
          seo_config: {
            title: seoTitle,
            description: seoDescription,
            canonical: seoCanonical,
            keywords: seoKeywords,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingLPId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('LP atualizada!');
      setEditingLPId(null);
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
    onError: (error) => {
      toast.error(`Erro: ${(error as Error).message}`);
    },
  });
  
  // Assign domain mutation
  const assignDomainMutation = useMutation({
    mutationFn: async ({ lpId, domain, path, homepage }: { lpId: string; domain: string; path: string; homepage: boolean }) => {
      const { error } = await supabase
        .from('cloned_landing_pages')
        .update({
          target_domain: domain,
          page_path: path || '/',
          is_homepage: homepage
        })
        .eq('id', lpId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Domínio vinculado!');
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    }
  });
  
  // Unpublish mutation (real removal from FTP/Cloudflare)
  const unpublishMutation = useMutation({
    mutationFn: async (lpId: string) => {
      const { data, error } = await supabase.functions.invoke('unpublish-pages', {
        body: { lpId, entityType: 'lp' }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('LP despublicada e removida do servidor!');
      queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    },
    onError: (error) => {
      toast.error(`Erro ao despublicar: ${(error as Error).message}`);
    }
  });
  
  // Blog publish mutation
  const publishBlogMutation = useMutation({
    mutationFn: async ({ blog, domain }: { blog: ProductBlog; domain: string }) => {
      const slug = blog.productName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const pagePath = `/blog/${slug}-${blog.blogType}`;
      
      const { data, error } = await supabase.functions.invoke('publish-product-blog-cloudflare', {
        body: {
          productId: blog.productId,
          blogType: blog.blogType,
          domain,
          pagePath,
        }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Blog publicado em ${data.publishedUrl || data.url}`);
      queryClient.invalidateQueries({ queryKey: ['blog-publications'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-blogs'] });
    },
    onError: (error) => {
      toast.error(`Erro ao publicar blog: ${(error as Error).message}`);
    }
  });
  
  // Assign domain to blog mutation
  const assignBlogDomainMutation = useMutation({
    mutationFn: async ({ blog, domain }: { blog: ProductBlog; domain: string }) => {
      const slug = blog.productName.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const pagePath = `/blog/${slug}-${blog.blogType}`;
      
      if (blog.publicationId) {
        const { error } = await supabase
          .from('product_blog_publications')
          .update({ target_domain: domain, page_path: pagePath })
          .eq('id', blog.publicationId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('product_blog_publications')
          .insert({
            product_id: blog.productId,
            blog_type: blog.blogType,
            target_domain: domain,
            page_path: pagePath,
            publish_status: 'draft'
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Domínio vinculado ao blog!');
      queryClient.invalidateQueries({ queryKey: ['blog-publications'] });
    }
  });

  // Delete blog publication mutation
  const deleteBlogMutation = useMutation({
    mutationFn: async (publicationId: string) => {
      const { error } = await supabase
        .from('product_blog_publications')
        .delete()
        .eq('id', publicationId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Publicação excluída!');
      queryClient.invalidateQueries({ queryKey: ['blog-publications'] });
    },
    onError: (error) => {
      toast.error(`Erro ao excluir: ${(error as Error).message}`);
    }
  });

  // Unpublish blog mutation (real removal from FTP/Cloudflare)
  const unpublishBlogMutation = useMutation({
    mutationFn: async (publicationId: string) => {
      const { data, error } = await supabase.functions.invoke('unpublish-pages', {
        body: { publicationId, entityType: 'blog' }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success('Blog despublicado e removido do servidor!');
      queryClient.invalidateQueries({ queryKey: ['blog-publications'] });
    },
    onError: (error) => {
      toast.error(`Erro ao despublicar: ${(error as Error).message}`);
    }
  });
  
  // Bulk republish: republish all LPs and Blogs except those on www.smartdent.com.br
  //
  // CRITICAL FIX (24/04/2026): Cloudflare Pages uses each deployment as a FULL
  // snapshot of the site. Previously, the bulk button called the per-page
  // publisher once per LP/blog, which deployed a manifest containing only ONE
  // file. Each new deployment overwrote the previous live snapshot, so the
  // last page deployed was the only one that survived — making it look like
  // every other page had been "despublicado".
  //
  // The new flow groups items by domain and:
  //  - For Cloudflare domains, it triggers ONE deployment per domain via
  //    `republish-domain-cloudflare-bulk`, which builds the full manifest
  //    from every page that should remain online.
  //  - For FTP/Git domains, it keeps the per-item flow (those backends do not
  //    suffer from the snapshot-replace problem).
  const EXCLUDED_DOMAIN = 'www.smartdent.com.br';
  const handleBulkRepublish = async () => {
    const getBrokenDomainReason = (domain: string): string | null => {
      const cfg = seoDomains.find(x => x.domain === domain);
      if (!cfg) return 'Domínio não está configurado em company_profile.seo_domains';
      const method = cfg.publish_method || 'cloudflare';
      if (method === 'cloudflare') {
        if (!cfg.cloudflare_enabled) return 'Cloudflare desabilitado para este domínio';
        if (!cfg.cloudflare_project_name) return 'cloudflare_project_name vazio';
        if (cfg.cloudflare_status === 'error') {
          return `Cloudflare reportou erro neste domínio (projeto "${cfg.cloudflare_project_name}" inválido?)`;
        }
      }
      return null;
    };

    // Filter candidates
    const allLpCandidates = (savedLPs || []).filter(lp =>
      lp.target_domain &&
      lp.target_domain !== EXCLUDED_DOMAIN &&
      lp.transformed_html
    );
    const allBlogCandidates = productBlogs.filter(blog =>
      blog.targetDomain &&
      blog.targetDomain !== EXCLUDED_DOMAIN &&
      blog.content
    );

    // Pre-flight: split into "will-publish" vs "will-skip-due-to-broken-domain"
    const lpCandidates: typeof allLpCandidates = [];
    const blogCandidates: typeof allBlogCandidates = [];
    const preSkipped: { name: string; domain: string; reason: string }[] = [];

    for (const lp of allLpCandidates) {
      const reason = getBrokenDomainReason(lp.target_domain!);
      if (reason) {
        preSkipped.push({ name: `LP: ${lp.name}`, domain: lp.target_domain!, reason });
      } else {
        lpCandidates.push(lp);
      }
    }
    for (const blog of allBlogCandidates) {
      const reason = getBrokenDomainReason(blog.targetDomain!);
      if (reason) {
        preSkipped.push({ name: `Blog: ${blog.productName} (${blog.blogType})`, domain: blog.targetDomain!, reason });
      } else {
        blogCandidates.push(blog);
      }
    }

    const total = lpCandidates.length + blogCandidates.length;
    const skipped = libraryItems.filter(i => i.targetDomain === EXCLUDED_DOMAIN).length;

    if (total === 0 && preSkipped.length === 0) {
      toast.warning('Nenhum item elegível para republicação (excluindo www.smartdent.com.br).');
      return;
    }

    // Group by (domain, method) so we can do one Cloudflare deployment per domain.
    type DomainBucket = { lps: typeof lpCandidates; blogs: typeof blogCandidates; method: string };
    const buckets: Record<string, DomainBucket> = {};
    const ensureBucket = (d: string) => {
      if (!buckets[d]) {
        const cfg = seoDomains.find(x => x.domain === d);
        buckets[d] = { lps: [], blogs: [], method: cfg?.publish_method || 'cloudflare' };
      }
      return buckets[d];
    };
    lpCandidates.forEach(lp => ensureBucket(lp.target_domain!).lps.push(lp));
    blogCandidates.forEach(b => ensureBucket(b.targetDomain!).blogs.push(b));

    const summaryLines = Object.entries(buckets).map(([d, c]) => {
      const parts = [];
      if (c.lps.length) parts.push(`${c.lps.length} LP${c.lps.length > 1 ? 's' : ''}`);
      if (c.blogs.length) parts.push(`${c.blogs.length} Blog${c.blogs.length > 1 ? 's' : ''}`);
      const methodLabel = c.method === 'ftp' ? 'FTP' : c.method === 'git' ? 'Git' : 'Cloudflare (deploy único)';
      return `• ${parts.join(' + ')} em ${d} (${methodLabel})`;
    }).join('\n') || '(nenhum item válido)';

    const preSkipByDomain: Record<string, { count: number; reason: string }> = {};
    preSkipped.forEach(s => {
      if (!preSkipByDomain[s.domain]) preSkipByDomain[s.domain] = { count: 0, reason: s.reason };
      preSkipByDomain[s.domain].count++;
    });
    const preSkipLines = Object.entries(preSkipByDomain).map(([d, info]) =>
      `• ${d}: ${info.count} item(s) ignorado(s) — ${info.reason}`
    ).join('\n');

    const cfDomainsCount = Object.values(buckets).filter(b => b.method === 'cloudflare').length;
    const perItemCount = Object.values(buckets)
      .filter(b => b.method !== 'cloudflare')
      .reduce((acc, b) => acc + b.lps.length + b.blogs.length, 0);
    const estimatedMinutes = Math.max(1, Math.ceil((cfDomainsCount * 30 + perItemCount * 6.5) / 60));

    const message = `Republicar em massa?\n\n${summaryLines}` +
      (preSkipLines ? `\n\n⛔ DOMÍNIOS COM PROBLEMA (serão pulados):\n${preSkipLines}` : '') +
      `\n\n⚠️ Domínio EXCLUÍDO: ${EXCLUDED_DOMAIN} (${skipped} item${skipped !== 1 ? 's' : ''} intocado${skipped !== 1 ? 's' : ''})` +
      `\n\nℹ️ Cloudflare agora republica TODAS as páginas do domínio em um único deploy ` +
      `(corrige o bug que derrubava páginas no deploy anterior).` +
      `\n\nTotal: ${total} item${total !== 1 ? 's' : ''} em ${Object.keys(buckets).length} domínio(s)` +
      `\nTempo estimado: ~${estimatedMinutes} min\n\nContinuar?`;

    if (!window.confirm(message)) return;

    setBulkRepublishing(true);
    const totalUnits = Object.keys(buckets).length;
    setBulkProgress({ current: 0, total: totalUnits });

    const successes: string[] = [];
    const failures: { name: string; error: string }[] = [];
    let current = 0;

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const [domain, bucket] of Object.entries(buckets)) {
      current++;
      setBulkProgress({ current, total: totalUnits });

      if (bucket.method === 'cloudflare') {
        toast.info(`(${current}/${totalUnits}) Republicando ${domain} (deploy único Cloudflare)...`);
        try {
          const { data, error } = await supabase.functions.invoke('republish-domain-cloudflare-bulk', {
            body: { domain }
          });
          if (error) {
            // Recover real error body if available
            let detail = (error as any).message || String(error);
            try {
              const ctx: any = (error as any).context;
              if (ctx && typeof ctx.json === 'function') {
                const body = await ctx.json();
                if (body?.error) detail = body.error;
              }
            } catch (_) { /* ignore */ }
            throw new Error(detail);
          }
          if (!data?.success) throw new Error(data?.error || 'erro desconhecido');
          successes.push(`${domain}: ${data.filesDeployed} arquivos (${data.lps} LPs + ${data.blogs} blogs)`);
          toast.success(`✅ ${domain}: ${data.filesDeployed} páginas em 1 deploy`);
        } catch (e) {
          const err = (e as Error).message;
          failures.push({ name: `Domínio: ${domain}`, error: err });
          console.error(`[BulkRepublish] CF domain failed: ${domain}`, err);
        }
        await sleep(2000);
      } else {
        // FTP / Git: per-item flow is safe (no snapshot replace issue)
        for (const lp of bucket.lps) {
          toast.info(`(${current}/${totalUnits}) ${domain} — LP: ${lp.name}`);
          try {
            await publishMutation.mutateAsync(lp.id);
            successes.push(`LP: ${lp.name}`);
          } catch (e) {
            const err = (e as Error).message;
            failures.push({ name: `LP: ${lp.name} [${domain}]`, error: err });
            console.error(`[BulkRepublish] LP failed: ${lp.name} (${domain})`, err);
          }
          await sleep(1500);
        }
        for (const blog of bucket.blogs) {
          const blogName = `${blog.productName} (${blog.blogType})`;
          toast.info(`(${current}/${totalUnits}) ${domain} — Blog: ${blogName}`);
          try {
            await publishBlogMutation.mutateAsync({ blog, domain: blog.targetDomain! });
            successes.push(`Blog: ${blogName}`);
          } catch (e) {
            const err = (e as Error).message;
            failures.push({ name: `Blog: ${blogName} [${domain}]`, error: err });
            console.error(`[BulkRepublish] Blog failed: ${blogName} (${domain})`, err);
          }
          await sleep(1500);
        }
      }
    }

    setBulkRepublishing(false);
    setBulkProgress({ current: 0, total: 0 });

    console.log('[BulkRepublish] Successes:', successes);
    console.log('[BulkRepublish] Failures:', failures);
    console.log('[BulkRepublish] Pre-skipped (broken domains):', preSkipped);

    queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
    queryClient.invalidateQueries({ queryKey: ['blog-publications'] });
    queryClient.invalidateQueries({ queryKey: ['products-with-blogs'] });

    const parts: string[] = [];
    if (successes.length) parts.push(`✅ ${successes.length} sucesso${successes.length !== 1 ? 's' : ''}`);
    if (failures.length) parts.push(`❌ ${failures.length} falha${failures.length !== 1 ? 's' : ''}`);
    if (preSkipped.length) parts.push(`⛔ ${preSkipped.length} pulado${preSkipped.length !== 1 ? 's' : ''} (domínio quebrado)`);
    const summary = parts.join(' | ');

    if (failures.length === 0 && preSkipped.length === 0) {
      toast.success(`✅ Republicação concluída! ${summary}`);
    } else if (failures.length === 0) {
      toast.warning(`Republicação OK com avisos: ${summary}. Veja console para os domínios pulados.`);
    } else {
      const firstError = failures[0]?.error || '';
      toast.error(
        `Republicação finalizada com falhas: ${summary}.\nPrimeiro erro: ${firstError.slice(0, 180)}\nVeja o console para a lista completa.`,
        { duration: 12000 }
      );
    }
  };
  
  const handleEditLP = (lp: ClonedLP) => {
    setName(lp.name || '');
    setBrand(lp.brand || '');
    setProduct(lp.product || '');
    setOriginalHTML(lp.original_html || '');
    setCtaUrl(lp.cta_url || '');
    setSelectedDomain(lp.target_domain || '');
    setPagePath(lp.page_path || '');
    setIsHomepage(lp.is_homepage || false);
    
    if (lp.seo_config) {
      setSeoTitle(lp.seo_config.title || '');
      setSeoDescription(lp.seo_config.description || '');
      setSeoCanonical(lp.seo_config.canonical || '');
      setSeoKeywords(lp.seo_config.keywords || '');
    }
    
    if (lp.transformed_html) {
      setResult({
        success: true,
        html: lp.transformed_html,
        capturedImages: lp.captured_images || [],
        stats: {
          imagesProcessed: lp.captured_images?.length || 0,
          imagesFailed: 0,
          ctasRewritten: 0,
          cssPreserved: true,
          headerRemoved: true,
          footerRemoved: true,
        },
      });
    } else {
      setResult(null);
    }
    
    setEditingLPId(lp.id);
    setActiveTab('transform');
    toast.info(`Editando: ${lp.name}`);
  };
  
  const handleCancelEdit = () => {
    setEditingLPId(null);
    setName('');
    setBrand('');
    setProduct('');
    setOriginalHTML('');
    setCtaUrl('');
    setSeoTitle('');
    setSeoDescription('');
    setSeoCanonical('');
    setSeoKeywords('');
    setSelectedDomain('');
    setPagePath('');
    setIsHomepage(false);
    setResult(null);
    setSelectedProduct(null);
  };
  
  const handlePreviewSavedLP = (lp: ClonedLP) => {
    if (lp.transformed_html) {
      const blob = new Blob([lp.transformed_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };
  
  const handleCopyHTML = () => {
    if (result?.html) {
      navigator.clipboard.writeText(result.html);
      toast.success('HTML copiado!');
    }
  };
  
  const handleDownloadHTML = () => {
    if (result?.html) {
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${brand}-${product}.html`.toLowerCase().replace(/\s+/g, '-');
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const handlePreview = () => {
    if (result?.html) {
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };
  
  const getPublishStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">✅ Publicada</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-amber-600">⏳ Publicando...</Badge>;
      case 'error':
        return <Badge variant="destructive">❌ Erro</Badge>;
      default:
        return <Badge variant="secondary">📝 Rascunho</Badge>;
    }
  };
  
  const toggleDomainCollapse = (domain: string) => {
    setCollapsedDomains(prev => ({
      ...prev,
      [domain]: !prev[domain]
    }));
  };
  
  // Render LP Card
  const renderLPCard = (lp: ClonedLP, showDomainAssign = false) => (
    <Card key={lp.id} className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {lp.is_homepage && <Home className="h-4 w-4 text-primary" />}
              <CardTitle className="text-base truncate">{lp.name}</CardTitle>
            </div>
            <CardDescription className="text-xs flex items-center gap-2 mt-1">
              <span>{lp.brand} / {lp.product}</span>
              {lp.page_path && lp.page_path !== '/' && (
                <code className="bg-muted px-1 rounded text-xs">{lp.page_path}</code>
              )}
            </CardDescription>
          </div>
          {getPublishStatusBadge(lp.publish_status)}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{lp.captured_images?.length || 0} imagens</span>
          <span>{new Date(lp.created_at).toLocaleDateString('pt-BR')}</span>
        </div>
        
        {lp.published_url && (
          <a 
            href={lp.published_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 mb-3"
          >
            <ExternalLink className="h-3 w-3" />
            {lp.published_url}
          </a>
        )}
        
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleEditLP(lp)}>
            <Pencil className="h-3 w-3 mr-1" />
            Editar
          </Button>
          {lp.transformed_html && (
            <Button variant="outline" size="sm" onClick={() => handlePreviewSavedLP(lp)}>
              <Eye className="h-3 w-3" />
            </Button>
          )}
          {lp.target_domain && lp.transformed_html && (
            <Button 
              size="sm" 
              onClick={() => publishMutation.mutate(lp.id)}
              disabled={publishMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {publishMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Rocket className="h-3 w-3 mr-1" />
              )}
              {lp.publish_status === 'success' ? 'Republicar' : 'Publicar'}
            </Button>
          )}
          {lp.publish_status === 'success' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.confirm('Despublicar esta LP? O arquivo será removido do servidor (FTP/Cloudflare).')) {
                  unpublishMutation.mutate(lp.id);
                }
              }}
              disabled={unpublishMutation.isPending}
              title="Despublicar"
            >
              {unpublishMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteMutation.mutate(lp.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        
        {showDomainAssign && enabledDomains.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <Label className="text-xs text-muted-foreground mb-2 block">Vincular a domínio:</Label>
            <div className="flex gap-2">
              <Select onValueChange={(domain) => {
                assignDomainMutation.mutate({ 
                  lpId: lp.id, 
                  domain, 
                  path: '/', 
                  homepage: false 
                });
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecionar domínio" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-md z-50">
                  {enabledDomains.filter(d => d.domain && d.domain.trim() !== '').map(d => (
                    <SelectItem key={d.domain} value={d.domain}>
                      {d.domain} {d.publish_method === 'ftp' ? '🟠 FTP' : d.publish_method === 'git' ? '🐙 Git' : '⚡ Cloudflare'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  // Render unified library item card
  const renderLibraryItemCard = (item: LibraryItem, showDomainAssign = false) => {
    if (item.type === 'lp' && item.lp) {
      return renderLPCard(item.lp, showDomainAssign);
    }
    
    if (item.type === 'blog' && item.blog) {
      const blog = item.blog;
      return (
        <Card key={item.id} className="group">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className={blog.blogType === 'commercial' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'}>
                    <Newspaper className="h-3 w-3 mr-1" />
                    {blog.blogType === 'commercial' ? 'Comercial' : 'Técnico'}
                  </Badge>
                  <CardTitle className="text-base truncate">{blog.productName}</CardTitle>
                </div>
                <CardDescription className="text-xs flex items-center gap-2 mt-1">
                  <span>{blog.productBrand || 'Sem marca'}</span>
                  {blog.pagePath && (
                    <code className="bg-muted px-1 rounded text-xs">{blog.pagePath}</code>
                  )}
                </CardDescription>
              </div>
              {getPublishStatusBadge(blog.publishStatus)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>Blog de Produto</span>
              <span>{blog.generatedAt ? new Date(blog.generatedAt).toLocaleDateString('pt-BR') : '-'}</span>
            </div>
            
            {blog.publishedUrl && (
              <a 
                href={blog.publishedUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 mb-3"
              >
                <ExternalLink className="h-3 w-3" />
                {blog.publishedUrl}
              </a>
            )}
            
            <div className="flex gap-2 flex-wrap">
              {blog.targetDomain && (
                <Button 
                  size="sm" 
                  onClick={() => publishBlogMutation.mutate({ blog, domain: blog.targetDomain! })}
                  disabled={publishBlogMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {publishBlogMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Rocket className="h-3 w-3 mr-1" />
                  )}
                  {blog.publishStatus === 'success' ? 'Republicar' : 'Publicar'}
                </Button>
              )}
              
              {/* Preview button - uses Edge Function to generate HTML */}
              {blog.content && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    // Open window first to avoid popup blocker
                    const newWindow = window.open('about:blank', '_blank');
                    if (!newWindow) {
                      toast.error('Popup bloqueado. Habilite popups para este site.');
                      return;
                    }
                    
                    // Show loading state
                    newWindow.document.write(`
                      <html>
                        <head><title>Gerando preview...</title></head>
                        <body style="font-family: system-ui, sans-serif; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5;">
                          <div style="text-align: center;">
                            <div style="width: 40px; height: 40px; border: 3px solid #e5e5e5; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                            <p style="color: #666;">Gerando preview do blog...</p>
                          </div>
                          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
                        </body>
                      </html>
                    `);
                    
                    try {
                      const response = await supabase.functions.invoke('preview-product-blog', {
                        body: { productId: blog.productId, blogType: blog.blogType }
                      });
                      
                      if (response.error) throw response.error;
                      
                      // Replace content with generated HTML
                      newWindow.document.open();
                      newWindow.document.write(response.data);
                      newWindow.document.close();
                    } catch (e: any) {
                      newWindow.document.open();
                      newWindow.document.write(`
                        <html>
                          <body style="font-family: system-ui, sans-serif; padding: 2rem; color: #dc2626;">
                            <h2>Erro ao gerar preview</h2>
                            <p>${e.message || 'Erro desconhecido'}</p>
                          </body>
                        </html>
                      `);
                      newWindow.document.close();
                    }
                  }}
                  title="Preview"
                >
                  <Eye className="h-3 w-3" />
                </Button>
              )}

              {/* Unpublish button - only if published */}
              {blog.publishStatus === 'published' && blog.publicationId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (window.confirm('Despublicar este blog? O arquivo será removido do servidor (FTP/Cloudflare).')) {
                      unpublishBlogMutation.mutate(blog.publicationId!);
                    }
                  }}
                  disabled={unpublishBlogMutation.isPending}
                  title="Despublicar"
                >
                  {unpublishBlogMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                </Button>
              )}

              {/* Delete button */}
              {blog.publicationId && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteBlogMutation.mutate(blog.publicationId!)}
                  disabled={deleteBlogMutation.isPending}
                  title="Excluir publicação"
                >
                  {deleteBlogMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              )}
            </div>
            
            {showDomainAssign && enabledDomains.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Vincular a domínio:</Label>
                <div className="flex gap-2">
                  <Select onValueChange={(domain) => {
                    assignBlogDomainMutation.mutate({ blog, domain });
                  }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar domínio" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border shadow-md z-50">
                      {enabledDomains.filter(d => d.domain && d.domain.trim() !== '').map(d => (
                        <SelectItem key={d.domain} value={d.domain}>
                          {d.domain} {d.publish_method === 'ftp' ? '🟠 FTP' : d.publish_method === 'git' ? '🐙 Git' : '⚡ Cloudflare'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
    
    return null;
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="transform">
            {editingLPId ? '✏️ Editando' : 'Transformar'}
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-2">
            Biblioteca ({libraryItems.length})
          </TabsTrigger>
          {activeTab === 'library' && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  refetchBlogs();
                  queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
                  queryClient.invalidateQueries({ queryKey: ['blog-publications'] });
                  toast.info('Atualizando biblioteca...');
                }}
                disabled={loadingBlogs || loadingLPs || bulkRepublishing}
                className="ml-2"
              >
                <RefreshCw className={`h-4 w-4 ${loadingBlogs || loadingLPs ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (!window.confirm('Gerar páginas /blog (índice estilo portal de notícias) para todos os domínios com posts publicados? Os HTMLs serão criados/atualizados na biblioteca como "pending". Em seguida use "Republicar Tudo" para subir aos domínios.')) return;
                  toast.info('Gerando índices /blog para todos os domínios...');
                  try {
                    const { data, error } = await supabase.functions.invoke('generate-blog-index', {
                      body: { allDomains: true },
                    });
                    if (error) throw error;
                    const results = (data as any)?.results || [];
                    const ok = results.filter((r: any) => !r.error).length;
                    toast.success(`✅ ${ok} índice(s) /blog gerados. Agora clique em "Republicar Tudo" para publicar.`);
                    queryClient.invalidateQueries({ queryKey: ['cloned-landing-pages'] });
                  } catch (e) {
                    toast.error(`Falha ao gerar índices: ${(e as Error).message}`);
                  }
                }}
                disabled={bulkRepublishing || loadingBlogs || loadingLPs}
                className="ml-2 gap-2"
                title="Gera páginas /blog (índice de artigos) para todos os domínios elegíveis"
              >
                <FileCode className="h-4 w-4" />
                📰 Gerar /blog (todos domínios)
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkRepublish}
                disabled={bulkRepublishing || loadingBlogs || loadingLPs}
                className="ml-2 gap-2"
                title={`Republica todas as LPs e Blogs vinculados a domínios, exceto ${EXCLUDED_DOMAIN}`}
              >
                {bulkRepublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Republicando ({bulkProgress.current}/{bulkProgress.total})
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    🚀 Republicar Tudo (exceto www.smartdent.com.br)
                  </>
                )}
              </Button>
            </>
          )}
        </TabsList>
        
        {editingLPId && (
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <Pencil className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-amber-800 dark:text-amber-200">
                Editando: <strong>{name}</strong>
              </span>
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <TabsContent value="transform" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Column */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="h-5 w-5" />
                    HTML Original
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={originalHTML}
                    onChange={(e) => setOriginalHTML(e.target.value)}
                    placeholder="<!DOCTYPE html>&#10;<html>..."
                    className="font-mono text-xs min-h-[200px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    {originalHTML.length.toLocaleString()} caracteres
                  </p>
                  
                  {/* Processing Mode Toggle */}
                  <div className="pt-3 border-t space-y-2">
                    <Label className="text-sm font-medium">Modo de Processamento</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div 
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          !preserveOriginal 
                            ? "border-primary bg-primary/5" 
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                        onClick={() => setPreserveOriginal(false)}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">Utilizar Prompt</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Remove header e footer do fabricante
                        </p>
                      </div>
                      
                      <div 
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          preserveOriginal 
                            ? "border-primary bg-primary/5" 
                            : "border-muted hover:border-muted-foreground/30"
                        }`}
                        onClick={() => setPreserveOriginal(true)}
                      >
                        <div className="flex items-center gap-2">
                          <FileCode className="h-4 w-4 text-orange-500" />
                          <span className="font-medium text-sm">Não Utilizar Prompt</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mantém todo o HTML original
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={!brand || !product ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Identificação
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Nome da LP</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Medit i900" />
                    </div>
                    <div>
                      <Label>Marca *</Label>
                      <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Medit" className={!brand ? 'border-destructive' : ''} />
                    </div>
                    <div>
                      <Label>Produto *</Label>
                      <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Scanner i900" className={!product ? 'border-destructive' : ''} />
                    </div>
                  </div>
                  
                  {selectedProduct ? (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                      <Package className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{selectedProduct.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedProduct.brand}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setProductSelectorOpen(true)}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Trocar
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setProductSelectorOpen(true)} className="w-full">
                      <Package className="h-4 w-4 mr-2" />
                      Selecionar do Repositório
                    </Button>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>URL do CTA *</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://api.whatsapp.com/send?phone=..."
                    className={!ctaUrl ? 'border-destructive' : ''}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    SEO
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Título ({seoTitle.length}/60)</Label>
                    <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Auto-gerado..." className={seoTitle.length > 60 ? 'border-orange-500' : ''} />
                  </div>
                  <div>
                    <Label>Description ({seoDescription.length}/160)</Label>
                    <Textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} placeholder="Auto-gerada..." rows={2} className={seoDescription.length > 160 ? 'border-orange-500' : ''} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Canonical URL</Label>
                      <Input value={seoCanonical} onChange={(e) => setSeoCanonical(e.target.value)} placeholder="Auto-gerada..." />
                    </div>
                    <div>
                      <Label>Keywords</Label>
                      <Input value={seoKeywords} onChange={(e) => setSeoKeywords(e.target.value)} placeholder="Auto-geradas..." />
                    </div>
                  </div>
                  
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Search className="h-3 w-3" /> Preview Google
                    </p>
                    <p className="text-blue-600 text-sm font-medium truncate">{seoPreview.title}</p>
                    <p className="text-green-700 text-xs">{seoPreview.url}</p>
                    <p className="text-muted-foreground text-xs line-clamp-2">{seoPreview.description}</p>
                  </div>
                </CardContent>
              </Card>
              
              {validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside text-sm">
                      {validation.errors.map((error, idx) => <li key={idx}>{error}</li>)}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={() => transformMutation.mutate()}
                disabled={!validation.isValid || transformMutation.isPending}
                className="w-full"
                size="lg"
              >
                {transformMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Transformando...</>
                ) : (
                  <><RefreshCw className="h-4 w-4 mr-2" />Gerar HTML</>
                )}
              </Button>
            </div>
            
            {/* Result Column */}
            <div className="space-y-6">
              {result ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        Transformação Concluída
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          <span>{result.stats.imagesProcessed} imagens</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          <span>{result.stats.ctasRewritten} CTAs</span>
                        </div>
                      </div>
                      {result.generatedSEO && (
                        <div className="mt-4 p-3 bg-green-500/10 rounded-lg">
                          <p className="text-xs font-medium text-green-700 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> SEO Auto-gerado
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        HTML Gerado
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ScrollArea className="h-[100px] border rounded p-2">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {result.html.substring(0, 1500)}...
                        </pre>
                      </ScrollArea>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={handleCopyHTML}>
                          <Copy className="h-4 w-4 mr-1" />Copiar
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleDownloadHTML}>
                          <Download className="h-4 w-4 mr-1" />Download
                        </Button>
                        <Button variant="outline" size="sm" onClick={handlePreview}>
                          <Eye className="h-4 w-4 mr-1" />Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Publication Block */}
                  <Card className="border-orange-500/50 bg-orange-50/30 dark:bg-orange-950/10">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <Rocket className="h-5 w-5" />
                        Publicar em Domínio
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {enabledDomains.length === 0 ? (
                        <Alert>
                          <Cloud className="h-4 w-4" />
                          <AlertDescription>
                            Nenhum domínio com Cloudflare configurado. Configure em Repository {'>'} Tracking & SEO.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <>
                          <div>
                            <Label>Domínio Destino</Label>
                            <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecionar domínio" />
                              </SelectTrigger>
                              <SelectContent>
                                {enabledDomains.filter(d => d.domain && d.domain.trim() !== '').map(d => (
                                  <SelectItem key={d.domain} value={d.domain}>
                                    <div className="flex items-center gap-2">
                                      <Globe className="h-4 w-4" />
                                      {d.domain}
                                      {d.publish_method === 'ftp' ? (
                                        <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">FTP</Badge>
                                      ) : d.publish_method === 'git' ? (
                                        <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">🐙 Git</Badge>
                                      ) : (
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="homepage" 
                              checked={isHomepage} 
                              onCheckedChange={(c) => {
                                setIsHomepage(c === true);
                                if (c) setPagePath('/');
                              }} 
                            />
                            <label htmlFor="homepage" className="text-sm font-medium cursor-pointer">
                              Definir como Página Principal (/)
                            </label>
                          </div>
                          
                          {isHomepage && selectedDomain && savedLPs?.some(lp => 
                            lp.target_domain === selectedDomain && 
                            lp.is_homepage && 
                            lp.id !== editingLPId
                          ) && (
                            <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-amber-800 dark:text-amber-200">
                                Já existe uma homepage para <strong>{selectedDomain}</strong>. Será substituída.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {!isHomepage && (() => {
                            const currentDomainConfig = enabledDomains.find(d => d.domain === selectedDomain);
                            const urlStructure = currentDomainConfig?.url_structure;
                            const categoryEntries = urlStructure ? Object.entries(urlStructure) : [];
                            const categoryLabels: Record<string, string> = {
                              products: '📦 Produtos',
                              blog: '📝 Blog',
                              guides: '📖 Guias',
                              compare: '⚖️ Comparativos',
                              spin: '🔄 Soluções SPIN',
                            };
                            
                            return (
                              <div className="space-y-3">
                                {categoryEntries.length > 0 && (
                                  <div>
                                    <Label>Categoria da Página</Label>
                                    <Select 
                                      value={selectedCategory} 
                                      onValueChange={(cat) => {
                                        setSelectedCategory(cat);
                                        const template = urlStructure?.[cat] || '/';
                                        const prefix = template.replace('{slug}', '');
                                        setPagePath(prefix);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Selecionar categoria..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {categoryEntries.map(([key, template]) => (
                                          <SelectItem key={key} value={key}>
                                            {categoryLabels[key] || key} — <code className="text-xs">{template}</code>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                                <div>
                                  <Label>Caminho da Página</Label>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">{selectedDomain || 'dominio.com'}/</span>
                                    <Input
                                      value={pagePath.replace(/^\//, '')}
                                      onChange={(e) => setPagePath('/' + e.target.value.replace(/^\//, ''))}
                                      placeholder={selectedCategory ? `${selectedCategory === 'products' ? 'scanner-i900' : 'meu-artigo'}` : 'scanner-i900'}
                                      className="flex-1"
                                    />
                                  </div>
                                  {selectedCategory && urlStructure?.[selectedCategory] && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Estrutura: <code>{urlStructure[selectedCategory]}</code>
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                          
                          {selectedDomain && (
                            <div className="p-3 bg-muted rounded-lg">
                              <p className="text-xs text-muted-foreground">Preview URL:</p>
                              <p className="text-sm font-mono text-primary">
                                https://{selectedDomain}{isHomepage ? '/' : pagePath || '/'}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => editingLPId ? updateMutation.mutate() : saveMutation.mutate()}
                          disabled={saveMutation.isPending || updateMutation.isPending}
                          className="flex-1"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {editingLPId ? 'Atualizar' : 'Salvar Rascunho'}
                        </Button>
                        
                        {selectedDomain && enabledDomains.length > 0 && (
                          <Button 
                            onClick={async () => {
                              // Se está editando, apenas publica
                              if (editingLPId) {
                                await updateMutation.mutateAsync();
                                publishMutation.mutate(editingLPId);
                              } else {
                                // Se é novo, salva primeiro (o publish será feito manualmente depois)
                                toast.info('Salve primeiro, depois publique pela biblioteca');
                                saveMutation.mutate();
                              }
                            }}
                            disabled={!selectedDomain || publishMutation.isPending || saveMutation.isPending || updateMutation.isPending}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            {publishMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Rocket className="h-4 w-4 mr-2" />
                            )}
                            Publicar Agora
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <CardContent className="text-center text-muted-foreground">
                    <Code className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">LP Clone</p>
                    <p className="text-sm mt-2">Preencha HTML + CTA para começar</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        {/* Library Tab - Grouped by Domain */}
        <TabsContent value="library" className="space-y-6">
          {loadingLPs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : libraryItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileCode className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-muted-foreground">Nenhuma LP ou Blog ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Domain Sections */}
              {Object.entries(itemsByDomain.grouped).map(([domain, items]) => {
                const domainConfig = seoDomains.find(d => d.domain === domain);
                const isCollapsed = collapsedDomains[domain];
                const lpCount = items.filter(i => i.type === 'lp').length;
                const blogCount = items.filter(i => i.type === 'blog').length;
                
                return (
                  <Collapsible key={domain} open={!isCollapsed} onOpenChange={() => toggleDomainCollapse(domain)}>
                    <Card>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                              <Globe className="h-5 w-5 text-primary" />
                              <div>
                                <CardTitle className="text-lg">{domain}</CardTitle>
                                <CardDescription>
                                  {lpCount > 0 && `${lpCount} LP${lpCount !== 1 ? 's' : ''}`}
                                  {lpCount > 0 && blogCount > 0 && ' • '}
                                  {blogCount > 0 && `${blogCount} Blog${blogCount !== 1 ? 's' : ''}`}
                                </CardDescription>
                              </div>
                            </div>
                            {domainConfig?.cloudflare_status === 'connected' ? (
                              <Badge className="bg-green-500/10 text-green-600">☁️ Cloudflare Conectado</Badge>
                            ) : (
                              <Badge variant="secondary">☁️ Cloudflare Pendente</Badge>
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map(item => renderLibraryItemCard(item))}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
              
              {/* Unassigned Section */}
              {itemsByDomain.unassigned.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">Sem Domínio Vinculado</CardTitle>
                        <CardDescription>
                          {itemsByDomain.unassigned.filter(i => i.type === 'lp').length} LPs • {itemsByDomain.unassigned.filter(i => i.type === 'blog').length} Blogs
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {itemsByDomain.unassigned.map(item => renderLibraryItemCard(item, true))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <LPCloneProductSelector
        open={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onSelectProduct={handleProductSelect}
        currentProductId={selectedProduct?.id}
      />
    </div>
  );
};