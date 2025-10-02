import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Copy, Edit, ExternalLink, MoreVertical, Trash2, Shield, PenTool, Database, Globe, Building2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useLandingPagesSupabase } from "@/hooks/useLandingPagesSupabase";
import { type LandingPage } from "@/hooks/useLandingPagesSupabase";
import { useDebounce } from "@/hooks/useDebounce";
import { generateHTML } from "@/lib/template-engine";
import { processContentWithIntelligentLinks } from "@/lib/intelligent-links";
import { useSEOHTMLGenerator } from "@/hooks/useSEOHTMLGenerator";
import ProtectedRoute from "@/components/ProtectedRoute";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useBlogStatusMonitor } from '@/hooks/useBlogStatusMonitor';
import { useProductBlogsIntegration } from '@/hooks/useProductBlogsIntegration';
import { ProductMigrationModal } from "@/components/ProductMigrationModal";
import { useBlogReadMore } from "@/hooks/useBlogReadMore";

// Interface for blog posts
interface BlogPost {
  id: string;
  title: string;
  created_at: string;
  status: string;
  landing_page_id: string;
  content: string;
  meta_description: string;
  keywords: string[];
  intelligent_links?: any; // Handle Json type from Supabase
}


const DashboardContent = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { landingPages, deleteLandingPage, addLandingPage, isLoading, loadLandingPages } = useLandingPagesSupabase();
  const { 
    consolidatedBlogs,
    approvedBlogsCount, 
    generatedBlogsCount, 
    publishedBlogsCount,
    approvedLandingPagesWithBlogs
  } = useBlogStatusMonitor(landingPages);
  
  const { 
    productBlogsForHTML, 
    productBlogsForHTMLByDomain,
    activeProductBlogsCount,
    activeProductBlogsCountByDomain
  } = useProductBlogsIntegration(approvedLandingPagesWithBlogs);
  
  const { generateConsolidatedBlogHTML } = useSEOHTMLGenerator();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [promotingToAdmin, setPromotingToAdmin] = useState(false);
  const [migrationModalOpen, setMigrationModalOpen] = useState(false);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  
  // Ativar funcionalidade "Leia mais" para blogs
  useBlogReadMore();

  const debouncedFetchBlogPosts = useDebounce(async () => {
    try {
      console.log('🔄 Fetching blog posts - Landing pages count:', landingPages.length);
      const approvedLandingPages = landingPages.filter(lp => lp.status === 'approved');
      console.log('✅ Approved landing pages:', approvedLandingPages.length);
      
      if (approvedLandingPages.length === 0) {
        console.log('📭 No approved landing pages found');
        setBlogPosts([]);
        return;
      }

      const blogsPromises = approvedLandingPages.map(async (lp) => {
        const { data: blogs, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('landing_page_id', lp.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw error;
        return blogs || [];
      });

      const blogArrays = await Promise.all(blogsPromises);
      const allBlogs = blogArrays.flat();
      console.log('📚 Total blogs found:', allBlogs.length);

      setBlogPosts(allBlogs);
    } catch (error: any) {
      console.error('❌ Erro ao buscar blogs:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar blogs",
        description: error.message
      });
    }
  }, 300);

  // Force refresh landing pages when component mounts to sync names
  useEffect(() => {
    loadLandingPages();
  }, []);

  // Memoize approved landing pages to detect changes
  const approvedLandingPagesIds = useMemo(() => {
    return landingPages
      .filter(lp => lp.status === 'approved')
      .map(lp => lp.id)
      .sort()
      .join(',');
  }, [landingPages]);

  const fetchBlogPosts = useCallback(() => {
    console.log('🚀 Triggering blog posts fetch due to changes');
    debouncedFetchBlogPosts();
  }, [debouncedFetchBlogPosts]);

  const getCurrentUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUserEmail(session.user.email);
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
      
      setUserRole(roleData?.role || 'user');
    }
  }, []);

  useEffect(() => {
    getCurrentUser();
  }, [getCurrentUser]);

  // Separate effect to react to landing page approval/disapproval changes
  useEffect(() => {
    console.log('📊 Landing pages changed, approved IDs:', approvedLandingPagesIds);
    fetchBlogPosts();
  }, [approvedLandingPagesIds, fetchBlogPosts]);

  // React to changes in blog generation status from useBlogStatusMonitor
  useEffect(() => {
    console.log('🎯 Blog monitor data changed:', {
      approvedBlogsCount,
      generatedBlogsCount,
      publishedBlogsCount,
      approvedLandingPagesCount: approvedLandingPagesWithBlogs.length
    });
  }, [approvedBlogsCount, generatedBlogsCount, publishedBlogsCount, approvedLandingPagesWithBlogs]);

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-blog-live')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'blog_posts' 
      }, () => {
        fetchBlogPosts();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'blog_posts' 
      }, () => {
        fetchBlogPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBlogPosts]);

  const handlePromoteToAdmin = async () => {
    if (!userEmail) return;
    
    setPromotingToAdmin(true);
    try {
      const { data, error } = await supabase.rpc('promote_user_to_admin', { 
        _email: userEmail 
      });
      
      if (error) throw error;
      
      if (data) {
        toast({
          title: "Acesso de administrador ativado!",
          description: "Você agora tem acesso total ao editor.",
        });
        
        // Update role state
        setUserRole('admin');
        
        // Redirect to editor
        navigate('/editor');
      } else {
        throw new Error('Não foi possível ativar o acesso de administrador');
      }
    } catch (error) {
      toast({
        title: "Erro ao ativar acesso",
        description: "Não foi possível ativar o acesso de administrador. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPromotingToAdmin(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      console.log('🚀 Creating new landing page');
      
      // Criar nova landing page com dados mínimos padrão
      const newId = await addLandingPage({
        name: "Nova Landing Page",
        status: "draft",
        template: "default"
      });
      
      console.log('✅ Landing page created with ID:', newId);
      
      // Navegar para o editor com o ID da nova landing page
      navigate(`/editor/${newId}`);
    } catch (error) {
      console.error('❌ Failed to create landing page:', error);
      toast({
        title: "Erro ao criar landing page",
        description: "Não foi possível criar a landing page. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (id: string) => {
    try {
      console.log('✏️ Navigating to editor for landing page:', id);
      navigate(`/editor/${id}`);
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      toast({
        title: "Erro de navegação",
        description: "Não foi possível abrir o editor. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = (landingPage: LandingPage) => {
    try {
      console.log('📋 Duplicating landing page:', landingPage.name);
      
      // Create duplicate with modified data
      const duplicateData = {
        name: `${landingPage.name} - Cópia`,
        status: 'draft' as const,
        template: landingPage.template,
        data: landingPage.data,
        embed: landingPage.embed,
        selected_product_ids: landingPage.selected_product_ids
      };
      
      // Add the duplicate to the store
      const newId = addLandingPage(duplicateData);
      console.log('✅ Landing page duplicated with ID:', newId);
      
      toast({
        title: "Landing duplicada",
        description: `"${landingPage.name}" foi duplicada como rascunho.`,
      });
      
      // Optionally navigate to edit the new duplicate
      // navigate(`/editor/${newId}`);
    } catch (error) {
      console.error('❌ Duplication failed:', error);
      toast({
        title: "Erro na duplicação",
        description: "Não foi possível duplicar a landing page. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleCopyCode = async (landingPage: LandingPage) => {
    if (landingPage.status === 'approved') {
      try {
        // Gera o HTML real usando os dados da landing page
        let htmlCode: string;
        
        if (landingPage.data) {
          // Enhance with selected products SEO data
          const selectedProductIds = landingPage.selected_product_ids || [];
          let enhancedData = { ...landingPage.data };
          
          if (selectedProductIds.length > 0) {
            try {
              const { data: products } = await supabase
                .from('products_repository')
                .select('*')
                .in('id', selectedProductIds);
              
              if (products && products.length > 0) {
                // Aggregate keywords from selected products
                const productKeywords = products.flatMap(p => [
                  ...(Array.isArray(p.keywords) ? p.keywords : []),
                  ...(Array.isArray(p.market_keywords) ? p.market_keywords : []),
                  ...(Array.isArray(p.search_intent_keywords) ? p.search_intent_keywords : [])
                ]);
                
                // Enhance SEO data with product information
                enhancedData = {
                  ...landingPage.data,
                  seo: {
                    ...landingPage.data.seo,
                    ai_keywords: [
                      ...(Array.isArray(landingPage.data.seo?.ai_keywords) ? landingPage.data.seo.ai_keywords : []),
                      ...productKeywords
                    ].slice(0, 50), // Limit to 50 keywords for better performance
                    seo_hidden_content: `${landingPage.data.seo?.seo_hidden_content || ''} Produtos relacionados: ${products.map(p => p.name).join(', ')}`
                  },
                  selectedProductsForSEO: products.map(p => ({
                    name: p.name,
                    description: p.description,
                    category: p.category,
                    keywords: Array.isArray(p.keywords) ? p.keywords : [],
                    market_keywords: Array.isArray(p.market_keywords) ? p.market_keywords : []
                  }))
                };
              }
            } catch (error) {
              console.error('Erro ao carregar produtos para SEO:', error);
            }
          }
          
          htmlCode = generateHTML(enhancedData);
        } else {
          htmlCode = '<!DOCTYPE html><html><head><title>Landing Page</title></head><body><h1>Landing Page Gerada</h1><p>Dados não encontrados.</p></body></html>';
        }
        
        await navigator.clipboard.writeText(htmlCode);
        // Refresh landing pages to sync names
        await loadLandingPages();
        
        toast({
          title: "HTML SEO Completo Copiado!",
          description: `HTML da landing page com dados de ${(landingPage.selected_product_ids || []).length} produtos selecionados copiado`,
        });
      } catch (err) {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o código. Tente novamente.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDelete = (landingPage: LandingPage) => {
    if (confirm(`Tem certeza que deseja excluir "${landingPage.name}"? Esta ação não pode ser desfeita.`)) {
      deleteLandingPage(landingPage.id);
      toast({
        title: "Landing page excluída",
        description: `"${landingPage.name}" foi removida com sucesso.`,
      });
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'approved' ? 'success' : 'secondary';
  };

  const getStatusText = (status: string) => {
    return status === 'approved' ? 'Aprovado' : 'Rascunho';
  };

  // Optimized function to extract clean text from HTML for preview
  const extractCleanText = useCallback((html: string): string => {
    if (!html) return '';
    
    try {
      // Simple and safe text extraction
      let cleanText = html
        // Remove non-content tags first
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<meta[^>]*>/gi, '')
        .replace(/<link[^>]*>/gi, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
        // Remove all remaining HTML tags
        .replace(/<[^>]*>/g, ' ')
        // Clean up whitespace and entities
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      
      return cleanText;
    } catch (error) {
      console.warn('Error extracting clean text:', error);
      return 'Erro ao extrair texto';
    }
  }, []);

  // Function to generate clean HTML for copying (without preview structure)
  const generateCleanHTML = useCallback((blogs: BlogPost[], domain: string) => {
    const domainName = domain === 'dentala' ? 'Dentala' : 'Eodonto';
    console.log(`🎨 Generating clean ${domainName} HTML for copying using corrected function`);
    
    // Create individual product blogs filtered by domain
    const domainProductBlogs = productBlogsForHTMLByDomain(domain);
    const productBlogs: BlogPost[] = domainProductBlogs.map(productBlog => ({
      id: productBlog.id,
      title: productBlog.title,
      created_at: productBlog.created_at,
      status: 'published',
      landing_page_id: `product-${productBlog.productId}`,
      content: productBlog.content,
      meta_description: productBlog.type === 'commercial' 
        ? `Descubra todas as vantagens e benefícios do ${productBlog.productName}. Saiba por que é a melhor escolha para seu consultório.`
        : `Conheça as especificações técnicas e funcionamento detalhado do ${productBlog.productName}. Tecnologia avançada para odontologia.`,
      keywords: [],
      intelligent_links: {}
    } as BlogPost));
    
    // If no published blogs, create fallback from consolidatedBlogs
    const landingPageBlogs = blogs.length > 0 ? blogs : consolidatedBlogs.map(lp => ({
      id: lp.id,
      title: lp.name,
      created_at: new Date().toISOString(),
      status: 'draft',
      landing_page_id: lp.id,
      content: 'Conteúdo será gerado após a publicação do blog.',
      meta_description: `Conteúdo sobre ${lp.name}`,
      keywords: [],
      intelligent_links: {}
    } as BlogPost));
    
    // Combine landing page blogs and product blogs
    const approvedBlogs = [...landingPageBlogs, ...productBlogs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Use the corrected generateConsolidatedBlogHTML function
    return generateConsolidatedBlogHTML({
      title: `Blog ${domainName} - Odontologia Digital`,
      description: `Blog de odontologia digital do ${domainName} com conteúdo especializado e atualizado sobre tecnologia odontológica.`,
      domain: domain,
      blogs: approvedBlogs.map(blog => ({
        title: blog.title,
        content: blog.content || 'Conteúdo será gerado após a publicação do blog.',
        productName: blog.title,
        keywords: Array.isArray(blog.keywords) ? blog.keywords : []
      })),
      selectedProducts: domainProductBlogs.map(p => ({
        id: p.productId,
        name: p.productName,
        description: p.content,
        keywords: [],
        category: 'Odontologia'
      }))
    });

  }, [productBlogsForHTMLByDomain, consolidatedBlogs, generateConsolidatedBlogHTML]);

  const generateConsolidatedHTML = useCallback((blogs: BlogPost[], domain: string) => {
    const domainName = domain === 'dentala' ? 'Dentala' : 'Eodonto';
    console.log(`🎨 Generating ${domainName} HTML with ${blogs.length} blogs`);
    
    // Create individual product blogs filtered by domain
    const domainProductBlogs = productBlogsForHTMLByDomain(domain);
    const productBlogs: BlogPost[] = domainProductBlogs.map(productBlog => ({
      id: productBlog.id,
      title: productBlog.title,
      created_at: productBlog.created_at,
      status: 'published',
      landing_page_id: `product-${productBlog.productId}`,
      content: productBlog.content,
      meta_description: productBlog.type === 'commercial' 
        ? `Descubra todas as vantagens e benefícios do ${productBlog.productName}. Saiba por que é a melhor escolha para seu consultório.`
        : `Conheça as especificações técnicas e funcionamento detalhado do ${productBlog.productName}. Tecnologia avançada para odontologia.`,
      keywords: [],
      intelligent_links: {}
    } as BlogPost));
    
    // If no published blogs, create fallback from consolidatedBlogs
    const landingPageBlogs = blogs.length > 0 ? blogs : consolidatedBlogs.map(lp => ({
      id: lp.id,
      title: lp.name,
      created_at: new Date().toISOString(),
      status: 'draft',
      landing_page_id: lp.id,
      content: 'Conteúdo será gerado após a publicação do blog.',
      meta_description: `Conteúdo sobre ${lp.name}`,
      keywords: [],
      intelligent_links: {}
    } as BlogPost));
    
    // Combine landing page blogs and product blogs
    const approvedBlogs = [...landingPageBlogs, ...productBlogs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    console.log(`📊 Using ${approvedBlogs.length} blogs for ${domainName} (${landingPageBlogs.length} LP + ${productBlogs.length} ${domain === 'eodonto' ? 'commercial' : 'technical'} products)`);
    
    const featuredBlog = approvedBlogs[0];
    // Mostrar mais blogs na seção principal - até 6 blogs recentes
    const recentBlogs = approvedBlogs.slice(1, 7);
    // Calcular quantos blogs restam para a sidebar
    const sidebarBlogs = approvedBlogs.slice(7);

    if (!featuredBlog) {
      return `<style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --text-color: #333;
            --background-color: #f8f9fa;
            --white: #fff;
            --light-gray: #e9ecef;
            --dark-gray: #495057;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        .main-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 0;
        }
        .no-content {
            text-align: center;
            padding: 3rem;
            color: var(--secondary-color);
        }
    </style>

    <main class="container main-content">
        <div class="no-content">
            <h2>Nenhum blog aprovado encontrado para ${domainName}</h2>
            <p>Aguarde a aprovação de landing pages para visualizar o conteúdo.</p>
        </div>
    </main>`;
    }

    const currentDate = new Date().toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return `<style>
        :root {
            --primary-color: #007bff;
            --secondary-color: #6c757d;
            --text-color: #333;
            --background-color: #f8f9fa;
            --white: #fff;
            --light-gray: #e9ecef;
            --dark-gray: #495057;
        }
        * { box-sizing: border-box; }
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        a { text-decoration: none; color: var(--primary-color); }
        a:hover { text-decoration: underline; }
        .container {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        img { max-width: 100%; height: auto; display: block; }
        
        .posts-section {
            display: grid;
            gap: 2rem;
        }
        .featured-post {
            background-color: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .featured-post-content {
            padding: 1.5rem;
        }
        .featured-post-content h2 {
            margin-top: 0;
            font-size: 1.75rem;
        }
        .post-card {
            background-color: var(--white);
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            transition: transform 0.2s;
        }
        .post-card:hover {
            transform: translateY(-5px);
        }
        .post-card img {
            width: 100%;
            height: 250px;
            object-fit: cover;
        }
        .post-card-content {
            padding: 1.5rem;
        }
        .post-card-content h3 {
            margin-top: 0;
            font-size: 1.25rem;
        }
        .post-meta {
            color: var(--secondary-color);
            font-size: 0.875rem;
        }
        
        .sidebar {
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }
        
        .posts-grid {
            display: grid;
            gap: 2rem;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        }
        
        .sidebar-posts {
            display: grid;
            gap: 1.5rem;
        }

        .sidebar-posts .post-card img {
            height: 150px;
        }
        
        .sidebar-posts .post-card-content h3 {
            font-size: 1rem;
        }

        .read-more-btn {
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            color: var(--primary-color);
            font-weight: 600;
            font-family: inherit;
            font-size: 1rem;
            margin-top: 0.5rem;
        }

        .full-content {
            display: none;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid var(--light-gray);
        }
        
        .full-content.expanded {
            display: block;
        }
        
        .main-content {
            display: grid;
            grid-template-columns: 1fr;
            gap: 2rem;
            padding: 2rem 0;
        }
        @media (min-width: 768px) {
            .main-content {
                grid-template-columns: 2fr 1fr;
            }
        }
    </style>

    <main class="container main-content">
        <section class="posts-section">
            <article class="featured-post">
                <img src="https://via.placeholder.com/1200x600?text=${encodeURIComponent(featuredBlog.title.substring(0, 50))}" alt="Imagem do post de destaque">
                <div class="featured-post-content">
                    <p class="post-meta">${domainName} | ${new Date(featuredBlog.created_at).toLocaleDateString('pt-BR')}</p>
                    <h2>${featuredBlog.title}</h2>
                    <p>${featuredBlog.meta_description || 'Conteúdo sobre odontologia digital'}</p>
                     <div class="full-content" style="display: none;">
                        ${processContentWithIntelligentLinks(featuredBlog.content || 'Conteúdo do blog gerado pela IA', featuredBlog.intelligent_links || {})}
                    </div>
                    <button class="read-more-btn">Leia mais &rarr;</button>
                </div>
            </article>

            <div class="posts-grid">
                ${recentBlogs.map(blog => `
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=${encodeURIComponent(blog.title.substring(0, 30))}" alt="Imagem do post">
                    <div class="post-card-content">
                        <p class="post-meta">${domainName} | ${new Date(blog.created_at).toLocaleDateString('pt-BR')}</p>
                        <h3>${blog.title}</h3>
                        <p>${blog.meta_description || 'Descrição do blog'}</p>
                        <div class="full-content" style="display: none;">
                            ${processContentWithIntelligentLinks(blog.content || 'Conteúdo do blog', blog.intelligent_links || {})}
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
                `).join('')}
            </div>
        </section>

        <aside class="sidebar">
            <div class="sidebar-posts">
                <h3>Mais Postagens (${sidebarBlogs.length})</h3>
                ${sidebarBlogs.map(blog => `
                <article class="post-card">
                    <img src="https://via.placeholder.com/600x400?text=${encodeURIComponent(blog.title.substring(0, 20))}" alt="Imagem do post">
                    <div class="post-card-content">
                        <p class="post-meta">${domainName} | ${new Date(blog.created_at).toLocaleDateString('pt-BR')}</p>
                        <h3>${blog.title}</h3>
                        <p>${blog.meta_description || 'Descrição do blog'}</p>
                        <div class="full-content" style="display: none;">
                            ${processContentWithIntelligentLinks(blog.content || 'Conteúdo do blog', blog.intelligent_links || {})}
                        </div>
                        <button class="read-more-btn">Leia mais &rarr;</button>
                    </div>
                </article>
                `).join('')}
            </div>
        </aside>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const readMoreButtons = document.querySelectorAll('.read-more-btn');

            readMoreButtons.forEach(button => {
                button.addEventListener('click', function() {
                    // Encontrar o elemento .full-content no mesmo container
                    const cardContent = this.closest('.featured-post-content, .post-card-content');
                    const fullContent = cardContent.querySelector('.full-content');
                    
                    if (fullContent) {
                        const isExpanded = fullContent.classList.contains('expanded');

                        if (isExpanded) {
                            fullContent.classList.remove('expanded');
                            this.textContent = 'Leia mais →';
                        } else {
                            fullContent.classList.add('expanded');
                            this.textContent = 'Fechar ↑';
                        }
                    }
                });
            });
        });
    </script>`;
  }, [productBlogsForHTMLByDomain]);

  // Generate HTML with preview structure for dashboard display
  const eodontoHTML = useMemo(() => 
    generateConsolidatedHTML(blogPosts, 'eodonto'), 
    [blogPosts, generateConsolidatedHTML, consolidatedBlogs, productBlogsForHTMLByDomain]
  );

  const dentalaHTML = useMemo(() => 
    generateConsolidatedHTML(blogPosts, 'dentala'), 
    [blogPosts, generateConsolidatedHTML, consolidatedBlogs, productBlogsForHTMLByDomain]
  );

  // Generate clean HTML for copying (without preview structure)
  const eodontoCleanHTML = useMemo(() => 
    generateCleanHTML(blogPosts, 'eodonto'), 
    [blogPosts, generateCleanHTML, consolidatedBlogs, productBlogsForHTMLByDomain]
  );

  const dentalaCleanHTML = useMemo(() => 
    generateCleanHTML(blogPosts, 'dentala'), 
    [blogPosts, generateCleanHTML, consolidatedBlogs, productBlogsForHTMLByDomain]
  );

  // Cached clean text extraction for preview
  const eodontoCleanText = useMemo(() => 
    extractCleanText(eodontoHTML), 
    [eodontoHTML, extractCleanText]
  );

  const dentalaCleanText = useMemo(() => 
    extractCleanText(dentalaHTML), 
    [dentalaHTML, extractCleanText]
  );

  const copyConsolidatedHTML = useCallback(async (domain: string) => {
    // Use clean HTML for copying (without preview structure)
    const html = domain === 'eodonto' ? eodontoCleanHTML : dentalaCleanHTML;
    
    try {
      await navigator.clipboard.writeText(html);
      toast({
        title: "HTML consolidado copiado!",
        description: `HTML consolidado do ${domain === 'dentala' ? 'Dentala' : 'Eodonto'} copiado para a área de transferência.`,
      });
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o HTML. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [eodontoCleanHTML, dentalaCleanHTML, toast]);

  const getApprovedBlogsCount = (domain: string) => {
    // Calculate total blogs including products with individual blogs by domain
    const domainProductBlogsCount = activeProductBlogsCountByDomain(domain);
    const totalBlogs = consolidatedBlogs.length + domainProductBlogsCount;
    
    console.log(`🔍 Getting approved blogs count for ${domain}:`, {
      consolidatedBlogsCount: consolidatedBlogs.length,
      domainProductBlogsCount,
      totalBlogs,
      approvedBlogsCount,
      generatedBlogsCount,
      publishedBlogsCount,
      blogPostsLength: blogPosts.length
    });
    
    return totalBlogs;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <BreadcrumbNavigation />
      </div>
      {/* Admin Promotion Banner */}
      {userRole !== 'admin' && (
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-semibold text-primary">Ativar Acesso de Administrador</h3>
                  <p className="text-sm text-muted-foreground">
                    Clique no botão para ativar o acesso completo ao editor de landing pages.
                  </p>
                </div>
              </div>
              <Button 
                onClick={handlePromoteToAdmin}
                disabled={promotingToAdmin}
                className="gradient-primary shadow-primary"
              >
                {promotingToAdmin ? (
                  <>Ativando...</>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Ativar Acesso
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Landing Page Generator
              </h1>
              {userRole === 'admin' && (
                <Badge variant="default" className="bg-gradient-primary text-primary-foreground">
                  ADMIN
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => setMigrationModalOpen(true)}
                className="border-accent/30 text-accent hover:bg-accent/10"
              >
                <Database className="h-4 w-4 mr-2" />
                Migrar Produtos
              </Button>
              
              {userRole === 'admin' && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/repository')}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Repositório de Dados
                </Button>
              )}
              
              {userRole === 'admin' && (
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/cloudflare-settings')}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Configurações Cloudflare
                </Button>
              )}
              
              {/* DESABILITADO: Configurações de Publicação removidas temporariamente
              <Button 
                variant="outline" 
                onClick={() => navigate('/publication-settings')}
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Shield className="h-4 w-4 mr-2" />
                Configurações de Publicação
              </Button>
              */}
              
              <Button onClick={handleCreateNew} className="gradient-primary shadow-primary transition-smooth hover:scale-105">
                <Plus className="h-4 w-4 mr-2" />
                Nova Landing Page
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="gradient-soft border-0 shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Total de Landing Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{landingPages.length}</div>
            </CardContent>
          </Card>
          
          <Card className="border-success/20 bg-success/5 shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Aprovadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {landingPages.filter(lp => lp.status === 'approved').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-warning/20 bg-warning/5 shadow-medium">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Em Rascunho</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">
                {landingPages.filter(lp => lp.status === 'draft').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Landing Pages List */}
        <Card className="shadow-large">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Suas Landing Pages
            </CardTitle>
            <CardDescription>
              Gerencie, edite e publique suas landing pages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {landingPages.map((landingPage) => (
                <div
                  key={landingPage.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-smooth"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{landingPage.name}</h3>
                      <Badge variant={getStatusColor(landingPage.status) as "secondary"}>
                        {getStatusText(landingPage.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Template: {landingPage.template}</span>
                      <span>Versão: v{landingPage.version}</span>
                      <span>
                        Modificado em: {
                          landingPage.last_modified instanceof Date 
                            ? landingPage.last_modified.toLocaleDateString('pt-BR')
                            : new Date(landingPage.last_modified).toLocaleDateString('pt-BR')
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(landingPage.id)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(landingPage)}
                      className="border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                    {landingPage.status === 'approved' && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCopyCode(landingPage)}
                          className="bg-success hover:bg-success/90"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Código
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/blog-generator/${landingPage.id}`)}
                          className="border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <PenTool className="h-4 w-4 mr-2" />
                          Gerar Blog Post
                        </Button>
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleDuplicate(landingPage)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visualizar Histórico
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* HTML Blogs Copy & Paste Section */}
        {/* HTML Blogs Copy & Paste - 2 Consolidated Preview Cards */}
        <div className="mt-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">HTML Blogs Copy & Paste</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Eodonto Card */}
            <Card className="bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Preview Consolidado Eodonto.com</CardTitle>
                </div>
                <CardDescription>
                  {getApprovedBlogsCount('eodonto')} blogs consolidados disponíveis
                  <br />
                  <span className="text-xs text-muted-foreground">
                    ({consolidatedBlogs.length} landing pages + {activeProductBlogsCountByDomain('eodonto')} produtos comerciais)
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-muted-foreground">
                    📝 Total de blogs: <strong>{approvedBlogsCount}</strong>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    📄 Landing pages: <strong>{consolidatedBlogs.length}</strong>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    🏷️ Produtos comerciais: <strong>{activeProductBlogsCountByDomain('eodonto')}</strong>
                  </div>
                  {approvedBlogsCount === 0 && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg border">
                      ⚠️ <strong>Nenhum blog disponível:</strong><br/>
                      • Gere blogs para as landing pages aprovadas<br/>
                      • Configure blogs individuais dos produtos<br/>
                      • Use a interface de curadoria para incluir blogs
                    </div>
                  )}
                  {blogPosts.length === 0 && approvedBlogsCount > 0 && (
                    <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                      ⚠️ Prévia com rascunhos gerados; publique para ver o conteúdo final
                    </div>
                  )}
                </div>
                <div className="bg-muted rounded-lg p-4 mb-4 h-48 overflow-auto">
                  <div className="post-card-content">
                    <div className="text-xs leading-relaxed mb-2">
                      <strong>Preview do Blog Consolidado Eodonto</strong>
                    </div>
                    {eodontoHTML && eodontoHTML.length > 0 ? (
                      <>
                        <div className="text-xs leading-relaxed">
                          {eodontoCleanText.length > 200 ? eodontoCleanText.substring(0, 200) + '...' : eodontoCleanText}
                        </div>
                        {eodontoCleanText.length > 200 && (
                          <>
                            <div className="full-content text-xs leading-relaxed">
                              <div 
                                dangerouslySetInnerHTML={{ 
                                  __html: eodontoHTML 
                                }}
                              />
                            </div>
                            <button className="read-more-btn text-xs mt-2">Leia mais →</button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Gerando HTML consolidado...
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => copyConsolidatedHTML('eodonto')}
                  className="w-full"
                  variant="default"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar HTML Eodonto
                </Button>
              </CardContent>
            </Card>

            {/* Dentala Card */}
            <Card className="bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Preview Consolidado Dentala.com</CardTitle>
                </div>
                <CardDescription>
                  {getApprovedBlogsCount('dentala')} blogs consolidados disponíveis  
                  <br />
                  <span className="text-xs text-muted-foreground">
                    ({consolidatedBlogs.length} landing pages + {activeProductBlogsCountByDomain('dentala')} produtos técnicos)
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="text-sm text-muted-foreground">
                    📝 Total de blogs: <strong>{approvedBlogsCount}</strong>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    📄 Landing pages: <strong>{consolidatedBlogs.length}</strong>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    🏷️ Produtos técnicos: <strong>{activeProductBlogsCountByDomain('dentala')}</strong>
                  </div>
                  {approvedBlogsCount === 0 && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-3 rounded-lg border">
                      ⚠️ <strong>Nenhum blog disponível:</strong><br/>
                      • Gere blogs para as landing pages aprovadas<br/>
                      • Configure blogs individuais dos produtos<br/>
                      • Use a interface de curadoria para incluir blogs
                    </div>
                  )}
                  {blogPosts.length === 0 && approvedBlogsCount > 0 && (
                    <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                      ⚠️ Prévia com rascunhos gerados; publique para ver o conteúdo final
                    </div>
                  )}
                </div>
                <div className="bg-muted rounded-lg p-4 mb-4 h-48 overflow-auto">
                  <div className="post-card-content">
                    <div className="text-xs leading-relaxed mb-2">
                      <strong>Preview do Blog Consolidado Dentala</strong>
                    </div>
                    {dentalaHTML && dentalaHTML.length > 0 ? (
                      <>
                        <div className="text-xs leading-relaxed">
                          {dentalaCleanText.length > 200 ? dentalaCleanText.substring(0, 200) + '...' : dentalaCleanText}
                        </div>
                        {dentalaCleanText.length > 200 && (
                          <>
                            <div className="full-content text-xs leading-relaxed">
                              <div 
                                dangerouslySetInnerHTML={{ 
                                  __html: dentalaHTML 
                                }}
                              />
                            </div>
                            <button className="read-more-btn text-xs mt-2">Leia mais →</button>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Gerando HTML consolidado...
                      </div>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => copyConsolidatedHTML('dentala')}
                  className="w-full"
                  variant="default"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar HTML Dentala
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Product Migration Modal */}
      <ProductMigrationModal 
        open={migrationModalOpen} 
        onOpenChange={setMigrationModalOpen} 
      />
    </div>
  );
};

const Dashboard = () => {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
};

export default Dashboard;