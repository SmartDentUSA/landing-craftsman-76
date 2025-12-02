import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400', // Cache preflight for 24 hours
};

interface KnowledgeBaseParams {
  format?: 'json' | 'ai_training' | 'system_b';
  include_company?: boolean;
  include_categories?: boolean;
  include_links?: boolean;
  include_products?: boolean;
  include_video_testimonials?: boolean;
  include_google_reviews?: boolean;
  include_kols?: boolean;
  include_spin_solutions?: boolean;
  include_blog_posts?: boolean;
  include_landing_pages?: boolean;
  include_external_videos?: boolean;
  approved_only?: boolean;
  category?: string;
  limit?: number;
  offset?: number;
}

function formatAsJSON(data: any): any {
  return {
    api_version: "1.0.0",
    timestamp: new Date().toISOString(),
    total_fields: getTotalFields(data),
    data
  };
}

function formatForAITraining(data: any): string {
  let text = `# BASE DE CONHECIMENTO COMPLETA - ${new Date().toISOString()}\n\n`;
  
  // Company Profile
  if (data.company_profile) {
    const cp = data.company_profile;
    text += `## PERFIL DA EMPRESA\n\n`;
    text += `**Nome:** ${cp.company_name}\n`;
    text += `**Descrição:** ${cp.company_description || 'N/A'}\n`;
    text += `**Setor:** ${cp.business_sector || 'N/A'}\n`;
    text += `**Missão:** ${cp.mission_statement || 'N/A'}\n`;
    text += `**Visão:** ${cp.vision_statement || 'N/A'}\n`;
    text += `**Valores:** ${cp.brand_values || 'N/A'}\n`;
    text += `**Público-alvo:** ${cp.target_audience || 'N/A'}\n`;
    text += `**Diferenciais:** ${cp.differentiators || 'N/A'}\n`;
    text += `**Website:** ${cp.website_url || 'N/A'}\n`;
    
    // ✨ ENDEREÇO ESTRUTURADO (prioridade) ou location (fallback)
    if (cp.street_address || cp.city || cp.state) {
      text += `**Endereço Completo:**\n`;
      if (cp.street_address || cp.address_number) {
        text += `- Logradouro: ${cp.street_address || ''} ${cp.address_number || ''}\n`;
      }
      if (cp.city) text += `- Cidade: ${cp.city}\n`;
      if (cp.state) text += `- Estado: ${cp.state}\n`;
      if (cp.postal_code) text += `- CEP: ${cp.postal_code}\n`;
      if (cp.country && cp.country !== 'Brasil') text += `- País: ${cp.country}\n`;
      text += '\n';
    } else if (cp.location) {
      text += `**Localização:** ${cp.location}\n\n`;
    }
    
    if (cp.social_media_links && Array.isArray(cp.social_media_links)) {
      text += `**Redes Sociais:**\n`;
      cp.social_media_links.forEach((link: any) => {
        text += `- ${link.platform || 'Link'}: ${link.url}\n`;
      });
      text += `\n`;
    }
    
    // ✨ NOVOS CAMPOS: Hashtags e Handles das Redes Sociais
    if (cp.social_media_hashtags && Array.isArray(cp.social_media_hashtags) && cp.social_media_hashtags.length > 0) {
      text += `**Hashtags das Redes Sociais:** #${cp.social_media_hashtags.join(' #')}\n`;
    }

    if (cp.social_media_handles && Array.isArray(cp.social_media_handles) && cp.social_media_handles.length > 0) {
      text += `**Handles das Redes Sociais:** @${cp.social_media_handles.join(' @')}\n`;
    }

    if (cp.youtube_tags && Array.isArray(cp.youtube_tags) && cp.youtube_tags.length > 0) {
      text += `**Tags YouTube:** #${cp.youtube_tags.join(' #')}\n`;
    }

    text += `\n`;
    
    // ✨ DADOS INSTITUCIONAIS
    if (cp.founded_year) text += `**Ano de Fundação:** ${cp.founded_year}\n`;
    if (cp.team_size) text += `**Tamanho da Equipe:** ${cp.team_size}\n`;
    if (cp.main_products_services) text += `**Principais Produtos/Serviços:** ${cp.main_products_services}\n`;
    
    // ✨ CONTATO
    if (cp.contact_email) text += `**Email de Contato:** ${cp.contact_email}\n`;
    if (cp.contact_phone) text += `**Telefone de Contato:** ${cp.contact_phone}\n`;
    
    // ✨ VERIFICAÇÃO REDES SOCIAIS
    if (cp.youtube_verified) text += `**YouTube Verificado:** Sim ✓\n`;
    if (cp.instagram_verified) text += `**Instagram Verificado:** Sim ✓\n`;
    
    // ✨ METODOLOGIA E CULTURA
    if (cp.working_methodology) text += `**Metodologia de Trabalho:** ${cp.working_methodology}\n`;
    if (cp.delivery_approach) text += `**Abordagem de Entrega:** ${cp.delivery_approach}\n`;
    if (cp.company_culture) text += `**Cultura da Empresa:** ${cp.company_culture}\n`;
    
    // ✨ SEO E POSICIONAMENTO
    if (cp.seo_market_positioning) text += `**Posicionamento de Mercado (SEO):** ${cp.seo_market_positioning}\n`;
    if (cp.seo_competitive_advantages) text += `**Vantagens Competitivas (SEO):** ${cp.seo_competitive_advantages}\n`;
    if (cp.seo_technical_expertise) text += `**Expertise Técnica (SEO):** ${cp.seo_technical_expertise}\n`;
    if (cp.seo_service_areas) text += `**Áreas de Serviço (SEO):** ${cp.seo_service_areas}\n`;
    if (cp.seo_context_keywords && Array.isArray(cp.seo_context_keywords) && cp.seo_context_keywords.length > 0) {
      text += `**Keywords de Contexto (SEO):** ${cp.seo_context_keywords.join(', ')}\n`;
    }
    if (cp.seo_domains && Array.isArray(cp.seo_domains) && cp.seo_domains.length > 0) {
      text += `**Domínios SEO:** ${cp.seo_domains.join(', ')}\n`;
    }
    
    // ✨ RODAPÉ YOUTUBE
    if (cp.youtube_company_footer) {
      text += `\n**Rodapé Padrão YouTube:**\n${cp.youtube_company_footer}\n`;
    }
    
    // ✨ INSIGHTS NPS (se disponível)
    if (cp.nps_metrics) {
      const nps = cp.nps_metrics;
      text += `\n### 📊 INSIGHTS DE CLIENTES (NPS)\n`;
      text += `**NPS Score:** ${nps.nps_score}\n`;
      text += `**Total de Respostas:** ${nps.total_responses}\n`;
      text += `**Satisfação Média:** ${nps.satisfaction_score}/5\n`;
      text += `**Qualidade dos Treinamentos:** ${nps.training_quality_score}/5\n\n`;
      
      if (nps.interest_themes && Object.keys(nps.interest_themes).length > 0) {
        text += `**🎯 Produtos e Cursos Mais Demandados:**\n`;
        Object.entries(nps.interest_themes)
          .sort((a: any, b: any) => b[1].count - a[1].count)
          .slice(0, 8)
          .forEach(([theme, data]: [string, any]) => {
            text += `- ${theme}: ${data.count} interessados (${data.percentage}%)\n`;
          });
        text += '\n';
      }
      
      if (nps.insights) {
        if (nps.insights.top_keywords?.length > 0) {
          text += `**🔑 Keywords SEO Validadas (baseadas em demanda real):**\n`;
          text += nps.insights.top_keywords.slice(0, 12).join(', ') + '\n\n';
        }
        
        if (nps.insights.common_themes?.length > 0) {
          text += `**💡 Padrões de Demanda:**\n`;
          nps.insights.common_themes.forEach((theme: string) => {
            text += `- ${theme}\n`;
          });
          text += '\n';
        }
        
        if (nps.insights.content_opportunities?.length > 0) {
          text += `**📝 Oportunidades de Conteúdo (validadas por clientes):**\n`;
          nps.insights.content_opportunities.slice(0, 5).forEach((opp: string) => {
            text += `- ${opp}\n`;
          });
          text += '\n';
        }
      }
      
      text += `*Última atualização: ${new Date(nps.last_updated).toLocaleDateString('pt-BR')}*\n\n`;
    }
    
    // ✨ VÍDEOS DA EMPRESA
    if (cp.company_videos) {
      const videos = cp.company_videos;
      let hasVideos = false;
      
      text += `\n### VÍDEOS DA EMPRESA\n`;
      
      if (videos.youtube_videos && Array.isArray(videos.youtube_videos) && videos.youtube_videos.length > 0) {
        text += `**Vídeos YouTube (${videos.youtube_videos.length}):**\n`;
        videos.youtube_videos.forEach((v: any) => {
          text += `- ${v.url}${v.description ? ` - ${v.description}` : ''}\n`;
        });
        hasVideos = true;
      }
      
      if (videos.instagram_videos && Array.isArray(videos.instagram_videos) && videos.instagram_videos.length > 0) {
        text += `**Vídeos Instagram (${videos.instagram_videos.length}):**\n`;
        videos.instagram_videos.forEach((v: any) => {
          text += `- ${v.url}${v.description ? ` - ${v.description}` : ''}\n`;
        });
        hasVideos = true;
      }
      
      if (videos.testimonial_videos && Array.isArray(videos.testimonial_videos) && videos.testimonial_videos.length > 0) {
        text += `**Vídeos de Depoimentos (${videos.testimonial_videos.length}):**\n`;
        videos.testimonial_videos.forEach((v: any) => {
          text += `- ${v.url}${v.description ? ` - ${v.description}` : ''}\n`;
        });
        hasVideos = true;
      }
      
      if (videos.technical_videos && Array.isArray(videos.technical_videos) && videos.technical_videos.length > 0) {
        text += `**Vídeos Técnicos (${videos.technical_videos.length}):**\n`;
        videos.technical_videos.forEach((v: any) => {
          text += `- ${v.url}${v.description ? ` - ${v.description}` : ''}\n`;
        });
        hasVideos = true;
      }
      
      if (hasVideos) text += `\n`;
    }
    
    // ✨ REVIEWS DA EMPRESA
    if (cp.company_reviews) {
      const reviews = cp.company_reviews;
      text += `\n### REVIEWS DA EMPRESA\n`;
      
      if (reviews.google_place_id) {
        text += `**Google Place ID:** ${reviews.google_place_id}\n`;
      }
      
      if (reviews.manual_reviews && Array.isArray(reviews.manual_reviews) && reviews.manual_reviews.length > 0) {
        text += `**Reviews Manuais (${reviews.manual_reviews.length}):**\n`;
        reviews.manual_reviews.forEach((r: any, idx: number) => {
          text += `${idx + 1}. ${r.author_name} - ${r.rating}⭐\n`;
          if (r.review_text) text += `   "${r.review_text}"\n`;
          if (r.review_date) text += `   Data: ${r.review_date}\n`;
        });
        text += `\n`;
      }
    }
    
    // ✨ TRACKING PIXELS
    if (cp.tracking_pixels) {
      const tracking = cp.tracking_pixels;
      let hasTracking = false;
      
      text += `\n### TRACKING E ANALYTICS\n`;
      
      if (tracking.google_tag_manager_id) {
        text += `**Google Tag Manager ID:** ${tracking.google_tag_manager_id}\n`;
        hasTracking = true;
      }
      if (tracking.meta_pixel_id) {
        text += `**Meta Pixel ID:** ${tracking.meta_pixel_id}\n`;
        hasTracking = true;
      }
      if (tracking.tiktok_pixel_id) {
        text += `**TikTok Pixel ID:** ${tracking.tiktok_pixel_id}\n`;
        hasTracking = true;
      }
      if (tracking.google_analytics_id) {
        text += `**Google Analytics ID:** ${tracking.google_analytics_id}\n`;
        hasTracking = true;
      }
      
      if (hasTracking) text += `\n`;
    }
    
    // ✨ ASSETS VISUAIS
    if (cp.company_logo_url || cp.company_logo_supabase_path) {
      text += `\n### ASSETS VISUAIS\n`;
      if (cp.company_logo_url) text += `**Logo URL:** ${cp.company_logo_url}\n`;
      if (cp.company_logo_supabase_path) text += `**Logo Supabase Path:** ${cp.company_logo_supabase_path}\n`;
      text += `\n`;
    }
    
    // ✨ NAVEGAÇÃO E FOOTER CONFIGURÁVEL (NOVO)
    if (cp.navigation_footer_config) {
      const navConfig = cp.navigation_footer_config;
      text += `\n### NAVEGAÇÃO E FOOTER GLOBAL\n`;
      
      // Menu de navegação
      if (navConfig.navigation_menu && Array.isArray(navConfig.navigation_menu) && navConfig.navigation_menu.length > 0) {
        text += `**Menu de Navegação:**\n`;
        navConfig.navigation_menu
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .forEach((item: any) => {
            text += `- ${item.label}: ${item.href}${item.openInNewTab ? ' (abre em nova aba)' : ''}\n`;
          });
        text += `\n`;
      }
      
      // Footer
      if (navConfig.footer) {
        const footer = navConfig.footer;
        
        if (footer.title) text += `**Título do Footer:** ${footer.title}\n`;
        
        // Localizações
        if (footer.locations && Array.isArray(footer.locations) && footer.locations.length > 0) {
          text += `**Localizações:**\n`;
          footer.locations.forEach((loc: any) => {
            text += `- ${loc.label}: ${loc.address}${loc.phone ? ` | Tel: ${loc.phone}` : ''}${loc.email ? ` | Email: ${loc.email}` : ''}\n`;
          });
          text += `\n`;
        }
        
        // Links do footer
        if (footer.links && Array.isArray(footer.links) && footer.links.length > 0) {
          text += `**Links do Footer:**\n`;
          footer.links.forEach((link: any) => {
            text += `- ${link.label}: ${link.href}\n`;
          });
          text += `\n`;
        }
        
        // Redes sociais do footer
        if (footer.social_links && Array.isArray(footer.social_links) && footer.social_links.length > 0) {
          text += `**Redes Sociais (Footer):**\n`;
          footer.social_links.forEach((social: any) => {
            text += `- ${social.platform || social.icon_alt}: ${social.href}\n`;
          });
          text += `\n`;
        }
      }
    }
    
    if (cp.institutional_links && Array.isArray(cp.institutional_links)) {
      // Separar parcerias internacionais de outros links
      const partnerships = cp.institutional_links.filter(
        (link: any) => link.category === 'international_partnership'
      );
      const otherLinks = cp.institutional_links.filter(
        (link: any) => link.category !== 'international_partnership'
      );
      
      // Parcerias internacionais com destaque
      if (partnerships.length > 0) {
        text += `### PARCERIAS INTERNACIONAIS (${partnerships.length})\n\n`;
        
        // Ordenar por relevância
        partnerships
          .sort((a: any, b: any) => (b.relevance_score || 0) - (a.relevance_score || 0))
          .forEach((p: any) => {
            text += `**${p.label}**`;
            if (p.country) text += ` (${p.country})`;
            text += `\n`;
            text += `- URL: ${p.url}\n`;
            if (p.partnership_type) text += `- Tipo: ${p.partnership_type}\n`;
            if (p.description) text += `- Descrição: ${p.description}\n`;
            if (p.since_year) text += `- Desde: ${p.since_year}\n`;
            if (p.relevance_score) text += `- Relevância: ${p.relevance_score}/10\n`;
            text += `\n`;
          });
      }
      
      // Outros links institucionais (formato original)
      if (otherLinks.length > 0) {
        text += `**Links Institucionais:**\n`;
        otherLinks.forEach((link: any) => {
          text += `- ${link.label}: ${link.url}\n`;
        });
        text += `\n`;
      }
    }
  }
  
  // Categories
  if (data.categories_config && Array.isArray(data.categories_config)) {
    text += `## CATEGORIAS E SUBCATEGORIAS\n\n`;
    data.categories_config.forEach((cat: any) => {
      text += `### ${cat.category}`;
      if (cat.subcategory) text += ` > ${cat.subcategory}`;
      text += `\n`;
      
      if (cat.target_audience && Array.isArray(cat.target_audience)) {
        text += `**Público-alvo:** ${cat.target_audience.join(', ')}\n`;
      }
      
      if (cat.keywords && Array.isArray(cat.keywords)) {
        text += `**Keywords:** ${cat.keywords.join(', ')}\n`;
      }
      
      if (cat.market_keywords && Array.isArray(cat.market_keywords)) {
        text += `**Keywords de Mercado:** ${cat.market_keywords.join(', ')}\n`;
      }
      
      text += `\n`;
    });
  }
  
  // External Links
  if (data.external_links && Array.isArray(data.external_links)) {
    text += `## LINKS E KEYWORDS ESTRATÉGICOS\n\n`;
    data.external_links.forEach((link: any) => {
      text += `### ${link.name}\n`;
      text += `**URL:** ${link.url}\n`;
      if (link.description) text += `**Descrição:** ${link.description}\n`;
      text += `**Categoria:** ${link.category}`;
      if (link.subcategory) text += ` > ${link.subcategory}`;
      text += `\n`;
      if (link.keyword_type) text += `**Tipo:** ${link.keyword_type}\n`;
      if (link.search_intent) text += `**Intenção de Busca:** ${link.search_intent}\n`;
      if (link.monthly_searches) text += `**Buscas Mensais:** ${link.monthly_searches}\n`;
      if (link.cpc_estimate) text += `**CPC Estimado:** R$ ${link.cpc_estimate}\n`;
      text += `\n`;
    });
  }
  
  // Products
  if (data.products && Array.isArray(data.products)) {
    text += `## PRODUTOS (${data.products.length})\n\n`;
    data.products.forEach((item: any) => {
      const p = item.product;
      text += `### ${p.name}\n`;
      text += `**Descrição:** ${p.description || 'N/A'}\n`;
      if (p.price) text += `**Preço:** R$ ${p.price}\n`;
      if (p.promo_price) text += `**Preço Promocional:** R$ ${p.promo_price}\n`;
      if (p.category) text += `**Categoria:** ${p.category}${p.subcategory ? ` > ${p.subcategory}` : ''}\n`;
      if (p.brand) text += `**Marca:** ${p.brand}\n`;
      
      if (p.benefits && Array.isArray(p.benefits) && p.benefits.length > 0) {
        text += `**Benefícios:**\n`;
        p.benefits.forEach((b: string) => text += `- ${b}\n`);
      }
      
      if (p.features && Array.isArray(p.features) && p.features.length > 0) {
        text += `**Características:**\n`;
        p.features.forEach((f: string) => text += `- ${f}\n`);
      }
      
      if (p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0) {
        text += `**Keywords:** ${p.keywords.join(', ')}\n`;
      }
      
      if (p.target_audience && Array.isArray(p.target_audience) && p.target_audience.length > 0) {
        text += `**Público-alvo:** ${p.target_audience.join(', ')}\n`;
      }
      
      // ID Loja Integrada (se disponível)
      if (p.original_data?.li_product_id) {
        text += `**ID Loja Integrada:** ${p.original_data.li_product_id}\n`;
      }
      
      if (p.technical_specifications && Array.isArray(p.technical_specifications) && p.technical_specifications.length > 0) {
        text += `**Especificações Técnicas:**\n`;
        p.technical_specifications.forEach((spec: any) => {
          text += `- ${spec.label}: ${spec.value}\n`;
        });
      }
      
      if (p.faq && Array.isArray(p.faq) && p.faq.length > 0) {
        text += `**FAQ:**\n`;
        p.faq.forEach((faq: any) => {
          text += `Q: ${faq.question}\nA: ${faq.answer}\n\n`;
        });
      }
      
      // 🎥 VÍDEOS DO PRODUTO
      if (p.youtube_videos && Array.isArray(p.youtube_videos) && p.youtube_videos.length > 0) {
        text += `**Vídeos YouTube (${p.youtube_videos.length}):**\n`;
        p.youtube_videos.forEach((v: any) => {
          text += `- ${v.url || v.video_url}${v.description || v.title ? ` - ${v.description || v.title}` : ''}\n`;
        });
      }
      
      if (p.instagram_videos && Array.isArray(p.instagram_videos) && p.instagram_videos.length > 0) {
        text += `**Vídeos Instagram (${p.instagram_videos.length}):**\n`;
        p.instagram_videos.forEach((v: any) => {
          text += `- ${v.url || v.video_url}${v.description || v.title ? ` - ${v.description || v.title}` : ''}\n`;
        });
      }
      
      if (p.technical_videos && Array.isArray(p.technical_videos) && p.technical_videos.length > 0) {
        text += `**Vídeos Técnicos (${p.technical_videos.length}):**\n`;
        p.technical_videos.forEach((v: any) => {
          text += `- ${v.url || v.video_url}${v.description || v.title ? ` - ${v.description || v.title}` : ''}\n`;
        });
      }
      
      if (p.testimonial_videos && Array.isArray(p.testimonial_videos) && p.testimonial_videos.length > 0) {
        text += `**Vídeos de Depoimentos (${p.testimonial_videos.length}):**\n`;
        p.testimonial_videos.forEach((v: any) => {
          text += `- ${v.url || v.video_url}${v.description || v.client_name ? ` - ${v.description || v.client_name}` : ''}\n`;
        });
      }
      
      if (p.tiktok_videos && Array.isArray(p.tiktok_videos) && p.tiktok_videos.length > 0) {
        text += `**Vídeos TikTok (${p.tiktok_videos.length}):**\n`;
        p.tiktok_videos.forEach((v: any) => {
          text += `- ${v.url || v.video_url}${v.description || v.title ? ` - ${v.description || v.title}` : ''}\n`;
        });
      }
      
      // E-commerce HTML gerado
      if (p.ecommerce_html && p.ecommerce_html.html_content) {
        text += `**Descrição E-commerce (Gerada por IA):**\n`;
        
        // Preview do HTML (sem tags) - limitado a 500 caracteres
        const htmlPreview = p.ecommerce_html.html_content
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\s+/g, ' ')
          .trim();
        text += `${htmlPreview.substring(0, 500)}...\n\n`;
        
        // Benefícios E-commerce específicos
        if (p.ecommerce_html.generated_benefits && p.ecommerce_html.generated_benefits.length > 0) {
          text += `**Benefícios E-commerce (IA-Generated):**\n`;
          p.ecommerce_html.generated_benefits.forEach((benefit: string) => {
            text += `- ${benefit}\n`;
          });
          text += `\n`;
        }
        
        // Metadata
        text += `Última geração: ${p.ecommerce_html.generated_at || 'Nunca gerado'}\n`;
        if (p.ecommerce_html.last_edited_at) {
          text += `Última edição: ${p.ecommerce_html.last_edited_at}\n`;
        }
        text += `\n`;
      }

      // 📄 DOCUMENTOS TÉCNICOS
      if (p.technical_documents && Array.isArray(p.technical_documents) && p.technical_documents.length > 0) {
        text += `\n📄 DOCUMENTOS TÉCNICOS (${p.technical_documents.length}):\n`;
        p.technical_documents.forEach((doc: any, idx: number) => {
          text += `  ${idx + 1}. ${doc.nome}\n`;
          if (doc.descricao) {
            text += `     Descrição: ${doc.descricao}\n`;
          }
          text += `     Arquivo: ${doc.nome_arquivo}\n`;
          text += `     Download: ${doc.url_download}\n`;
          text += `     Tamanho: ${(doc.tamanho_bytes / 1024).toFixed(1)} KB\n`;
          text += `     Origem: ${doc.origem === 'catalog_documents' ? 'Catálogo' : 'Resinas'}\n`;
        });
        text += `\n`;
      }

      // 📝 TRANSCRIÇÕES DE DOCUMENTOS (PDFs, Ebooks, etc.)
      if (p.document_transcriptions && Array.isArray(p.document_transcriptions) && p.document_transcriptions.length > 0) {
        text += `\n📝 TRANSCRIÇÕES DE DOCUMENTOS (${p.document_transcriptions.length}):\n`;
        p.document_transcriptions.forEach((trans: any, idx: number) => {
          text += `  ${idx + 1}. ${trans.file_name || 'Documento'}\n`;
          if (trans.transcription) {
            // Limitar transcrição a 500 caracteres para não sobrecarregar
            const transcriptionPreview = trans.transcription.substring(0, 500);
            text += `     Conteúdo: ${transcriptionPreview}${trans.transcription.length > 500 ? '...' : ''}\n`;
          }
          if (trans.created_at) {
            text += `     Data: ${new Date(trans.created_at).toLocaleDateString('pt-BR')}\n`;
          }
        });
        text += `\n`;
      }

      // 📱 CONTEÚDOS GERADOS PARA REDES SOCIAIS

      // Instagram Copies
      if (p.instagram_copies?.copies && Array.isArray(p.instagram_copies.copies) && p.instagram_copies.copies.length > 0) {
        text += `\n📸 POSTS INSTAGRAM GERADOS (${p.instagram_copies.copies.length}):\n`;
        p.instagram_copies.copies.forEach((copy: any, idx: number) => {
          text += `  Post ${idx + 1}:\n`;
          text += `  ${copy.copy || copy.text}\n\n`;
        });
      }

      // TikTok Copies
      if (p.tiktok_content?.copies && Array.isArray(p.tiktok_content.copies) && p.tiktok_content.copies.length > 0) {
        text += `\n🎵 SCRIPTS TIKTOK GERADOS (${p.tiktok_content.copies.length}):\n`;
        p.tiktok_content.copies.forEach((copy: any, idx: number) => {
          text += `  Script ${idx + 1}:\n`;
          text += `  ${copy.copy || copy.text}\n\n`;
        });
      }

      // WhatsApp Messages
      if (p.whatsapp_messages?.messages && Array.isArray(p.whatsapp_messages.messages) && p.whatsapp_messages.messages.length > 0) {
        text += `\n💬 MENSAGENS WHATSAPP GERADAS (${p.whatsapp_messages.messages.length}):\n`;
        p.whatsapp_messages.messages.forEach((msg: any, idx: number) => {
          text += `  Mensagem ${idx + 1}:\n`;
          text += `  ${msg.message || msg.text}\n\n`;
        });
      }

      // WhatsApp Sequences
      if (p.whatsapp_sequences?.sequences && Array.isArray(p.whatsapp_sequences.sequences) && p.whatsapp_sequences.sequences.length > 0) {
        text += `\n📲 SEQUÊNCIAS WHATSAPP (${p.whatsapp_sequences.sequences.length}):\n`;
        p.whatsapp_sequences.sequences.forEach((seq: any, idx: number) => {
          text += `  Sequência ${idx + 1}: ${seq.title || 'Sem título'}\n`;
          if (seq.messages && Array.isArray(seq.messages)) {
            seq.messages.forEach((msg: any, msgIdx: number) => {
              text += `    ${msgIdx + 1}. ${msg.message}\n`;
            });
          }
          text += `\n`;
        });
      }

      // YouTube Descriptions
      if (p.youtube_descriptions?.descriptions && Array.isArray(p.youtube_descriptions.descriptions) && p.youtube_descriptions.descriptions.length > 0) {
        text += `\n🎬 DESCRIÇÕES YOUTUBE GERADAS (${p.youtube_descriptions.descriptions.length}):\n`;
        p.youtube_descriptions.descriptions.forEach((desc: any, idx: number) => {
          text += `  Descrição ${idx + 1}:\n`;
          text += `  ${desc.description || desc.text}\n\n`;
        });
      }

      // Conteúdo Individual de Blog
      if (p.individual_blog_content) {
        text += `\n📰 CONTEÚDO DE BLOG INDIVIDUAL:\n`;
        if (p.individual_blog_content.technical) {
          text += `  Blog Técnico:\n`;
          const technicalPreview = p.individual_blog_content.technical.substring(0, 500);
          text += `  ${technicalPreview}${p.individual_blog_content.technical.length > 500 ? '...' : ''}\n\n`;
        }
        if (p.individual_blog_content.commercial) {
          text += `  Blog Comercial:\n`;
          const commercialPreview = p.individual_blog_content.commercial.substring(0, 500);
          text += `  ${commercialPreview}${p.individual_blog_content.commercial.length > 500 ? '...' : ''}\n\n`;
        }
      }

      // TABELA COMPARATIVA COM CONCORRENTES
      if (p.competitor_comparison?.enabled && p.competitor_comparison.table_data?.length > 0) {
        text += `\n📊 COMPARATIVO COM CONCORRENTES:\n`;
        text += `**${p.competitor_comparison.title}**\n`;
        if (p.competitor_comparison.subtitle) {
          text += `${p.competitor_comparison.subtitle}\n`;
        }
        text += `\n`;
        
        // Cabeçalhos da tabela (formato Markdown)
        const headers = p.competitor_comparison.table_headers || [];
        text += `| ${headers.join(' | ')} |\n`;
        text += `|${headers.map(() => '---').join('|')}|\n`;
        
        // Dados da tabela
        const tableData = p.competitor_comparison.table_data || [];
        tableData.forEach((row: any) => {
          const cells = headers.map(header => row[header] || '-');
          text += `| ${cells.join(' | ')} |\n`;
        });
        text += `\n`;
      }
      
      text += `\n---\n\n`;
    });
  }
  
  // Video Testimonials
  if (data.video_testimonials && Array.isArray(data.video_testimonials)) {
    text += `## DEPOIMENTOS EM VÍDEO (${data.video_testimonials.length})\n\n`;
    data.video_testimonials.forEach((testimonial: any) => {
      text += `### ${testimonial.client_name}\n`;
      if (testimonial.profession) text += `**Profissão:** ${testimonial.profession}\n`;
      if (testimonial.location) text += `**Localização:** ${testimonial.location}${testimonial.state ? `, ${testimonial.state}` : ''}\n`;
      if (testimonial.specialty) text += `**Especialidade:** ${testimonial.specialty}\n`;
      text += `**Depoimento:**\n${testimonial.testimonial_text}\n`;
      if (testimonial.youtube_url) text += `**YouTube:** ${testimonial.youtube_url}\n`;
      if (testimonial.instagram_url) text += `**Instagram:** ${testimonial.instagram_url}\n`;
      if (testimonial.sentiment_score) text += `**Sentimento:** ${testimonial.sentiment_score}\n`;
      text += `\n`;
    });
  }
  
  // Google Reviews
  if (data.google_reviews && Array.isArray(data.google_reviews)) {
    text += `## AVALIAÇÕES DO GOOGLE (${data.google_reviews.length})\n\n`;
    data.google_reviews.forEach((review: any) => {
      const raw = review.raw_review;
      text += `### ${raw.author_name} - ${raw.rating}⭐\n`;
      text += `**Data:** ${raw.review_date}\n`;
      if (raw.review_text) text += `**Avaliação:** ${raw.review_text}\n`;
      if (raw.response_from_owner) text += `**Resposta:** ${raw.response_from_owner}\n`;
      text += `\n`;
    });
  }
  
  // Key Opinion Leaders
  if (data.key_opinion_leaders && Array.isArray(data.key_opinion_leaders)) {
    text += `## ESPECIALISTAS (KOLs) (${data.key_opinion_leaders.length})\n\n`;
    data.key_opinion_leaders.forEach((kol: any) => {
      text += `### ${kol.full_name}\n`;
      if (kol.specialty) text += `**Especialidade:** ${kol.specialty}\n`;
      if (kol.mini_cv) text += `**Mini CV:** ${kol.mini_cv}\n`;
      if (kol.lattes_url) text += `**Lattes:** ${kol.lattes_url}\n`;
      if (kol.website_url) text += `**Website:** ${kol.website_url}\n`;
      if (kol.instagram_url) text += `**Instagram:** ${kol.instagram_url}\n`;
      if (kol.youtube_url) text += `**YouTube:** ${kol.youtube_url}\n`;
      text += `\n`;
    });
  }
  
  // SPIN Selling Solutions
  if (data.spin_solutions && Array.isArray(data.spin_solutions)) {
    text += `## SOLUÇÕES SPIN SELLING (${data.spin_solutions.length})\n\n`;
    
    data.spin_solutions.forEach((solution: any) => {
      text += `### ${solution.title}\n`;
      text += `**Tipo de Dor:** ${solution.pain_type}\n`;
      text += `**Prioridade:** ${solution.priority}\n`;
      text += `**Frequência:** ${solution.frequency || 'N/A'}\n\n`;
      
      // PITCH DE VENDAS (campo mais importante)
      if (solution.sales_pitch) {
        text += `**Pitch de Vendas Completo:**\n`;
        text += `${solution.sales_pitch}\n\n`;
      }
      
      // CASOS DE SUCESSO
      if (solution.success_cases && solution.success_cases.length > 0) {
        text += `**Casos de Sucesso (${solution.success_cases.length}):**\n`;
        solution.success_cases.forEach((sc: any, index: number) => {
          text += `${index + 1}. ${sc.client_name} - ${sc.specialty}\n`;
          text += `   Local: ${sc.city}, ${sc.state}\n`;
          text += `   Resultados: ${sc.results_achieved}\n`;
          if (sc.usage_time) text += `   Tempo de uso: ${sc.usage_time}\n`;
          if (sc.instagram) text += `   Instagram: ${sc.instagram}\n`;
          text += `\n`;
        });
      }
      
      // CITAÇÕES REAIS DE CLIENTES (Jornada SPIN)
      if (solution.real_quotes && solution.real_quotes.length > 0) {
        text += `**Depoimentos SPIN (${solution.real_quotes.length}):**\n`;
        solution.real_quotes.forEach((quote: any, index: number) => {
          text += `${index + 1}. ${quote.client_name}\n`;
          text += `   Desejo: "${quote.desire}"\n`;
          text += `   Dor: "${quote.pain}"\n`;
          text += `   Resultado Esperado: "${quote.expected_result}"\n\n`;
        });
      }
      
      // TABELA DE COMPARAÇÃO COM CONCORRENTES
      if (solution.competitor_comparison?.enabled && solution.competitor_comparison.table_data?.length > 0) {
        text += `**Comparação com Concorrentes:**\n`;
        text += `${solution.competitor_comparison.title}\n`;
        if (solution.competitor_comparison.subtitle) {
          text += `${solution.competitor_comparison.subtitle}\n`;
        }
        text += `\n`;
        
        // Cabeçalhos da tabela
        const headers = solution.competitor_comparison.table_headers || [];
        text += `| ${headers.join(' | ')} |\n`;
        text += `|${headers.map(() => '---').join('|')}|\n`;
        
        // Dados da tabela
        const tableData = solution.competitor_comparison.table_data || [];
        tableData.forEach((row: any) => {
          const cells = headers.map(header => row[header] || '-');
          text += `| ${cells.join(' | ')} |\n`;
        });
        text += `\n`;
      }
      
      // MÉTRICAS DE DOR
      if (solution.pain_metrics && Object.keys(solution.pain_metrics).length > 0) {
        text += `**Métricas de Impacto:**\n`;
        Object.entries(solution.pain_metrics).forEach(([key, value]: [string, any]) => {
          if (typeof value === 'object' && value.label) {
            text += `- ${value.label}: ${value.value} ${value.unit}\n`;
          } else {
            text += `- ${key}: ${value}\n`;
          }
        });
        text += `\n`;
      }
      
      // FAQs DA SOLUÇÃO
      if (solution.faq && solution.faq.length > 0) {
        text += `**Perguntas Frequentes (${solution.faq.length}):**\n`;
        solution.faq.forEach((faq: any, index: number) => {
          text += `Q${index + 1}: ${faq.question}\n`;
          text += `A${index + 1}: ${faq.answer}\n\n`;
        });
      }
      
      // URL PERSONALIZADA
      if (solution.custom_url?.enabled) {
        text += `**Link Personalizado:** ${solution.custom_url.label} - ${solution.custom_url.url}\n`;
        if (solution.custom_url.type === 'landing_page' && solution.custom_url.landing_page_id) {
          text += `(Landing Page ID: ${solution.custom_url.landing_page_id})\n`;
        }
        text += `\n`;
      }
      
      // PRODUTOS RELACIONADOS
      if (solution.product_ids && solution.product_ids.length > 0) {
        text += `**Produtos Relacionados:** ${solution.product_ids.length} produto(s) vinculado(s)\n`;
        text += `IDs: ${solution.product_ids.join(', ')}\n\n`;
      }
      
      // CONTEÚDO GERADO PELA IA (se disponível)
      if (solution.landing_page_html) {
        text += `**Landing Page:** Gerada em ${solution.landing_page_generated_at || 'data desconhecida'}\n`;
      }
      if (solution.whatsapp_complete_message) {
        text += `**Mensagem WhatsApp:** Disponível (mensagem otimizada)\n`;
      }
      if (solution.google_ads_campaign) {
        text += `**Campanha Google Ads:** Gerada com ${solution.google_ads_campaign.keywords?.length || 0} keywords\n`;
      }
      
      text += `\n---\n\n`;
    });
  }
  
  // Blog Posts
  if (data.blog_posts && Array.isArray(data.blog_posts)) {
    text += `## BLOG POSTS PUBLICADOS (${data.blog_posts.length})\n\n`;
    data.blog_posts.forEach((post: any) => {
      text += `### ${post.title}\n`;
      if (post.meta_description) text += `**Meta Description:** ${post.meta_description}\n`;
      if (post.keywords && Array.isArray(post.keywords)) {
        text += `**Keywords:** ${post.keywords.join(', ')}\n`;
      }
      if (post.published_at) {
        text += `**Publicado em:** ${new Date(post.published_at).toLocaleDateString('pt-BR')}\n`;
      }
      if (post.youtube_video_url) {
        text += `**Vídeo YouTube:** ${post.youtube_video_url}\n`;
      }
      // Preview do conteúdo (primeiros 300 caracteres)
      if (post.content) {
        const preview = post.content.replace(/<[^>]*>/g, '').substring(0, 300);
        text += `**Preview:** ${preview}...\n`;
      }
      text += `\n`;
    });
  }
  
  // Landing Pages
  if (data.landing_pages && Array.isArray(data.landing_pages)) {
    text += `## LANDING PAGES (${data.landing_pages.length})\n\n`;
    data.landing_pages.forEach((lp: any) => {
      text += `### ${lp.name}\n`;
      text += `**Status:** ${lp.status}\n`;
      text += `**Template:** ${lp.template}\n`;
      
      if (lp.data) {
        // SEO
        if (lp.data.seo?.seo_title) {
          text += `**SEO Title:** ${lp.data.seo.seo_title}\n`;
        }
        if (lp.data.seo?.seo_description) {
          text += `**SEO Description:** ${lp.data.seo.seo_description}\n`;
        }
        
        // Banner
        if (lp.data.banner?.title) {
          text += `**Banner:** ${lp.data.banner.title}${lp.data.banner.subtitle ? ' - ' + lp.data.banner.subtitle : ''}\n`;
        }
        
        // Produtos selecionados
        if (lp.selected_product_ids && Array.isArray(lp.selected_product_ids) && lp.selected_product_ids.length > 0) {
          text += `**Produtos Vinculados:** ${lp.selected_product_ids.length} produtos\n`;
        }
      }
      
      text += `\n`;
    });
  }
  
  // Vídeos Externos (Sistema B)
  if (data.external_videos) {
    const ev = data.external_videos;
    
    if (ev.videos_produtos && Array.isArray(ev.videos_produtos) && ev.videos_produtos.length > 0) {
      text += `## VÍDEOS EXTERNOS - PRODUTOS (${ev.videos_produtos.length})\n\n`;
      ev.videos_produtos.forEach((v: any) => {
        text += `### ${v.nome_produto}\n`;
        text += `**URL:** ${v.url_video}\n`;
        if (v.descricao) text += `**Descrição:** ${v.descricao}\n`;
        if (v.categoria) text += `**Categoria:** ${v.categoria}\n`;
        if (v.duracao) text += `**Duração:** ${v.duracao}\n`;
        text += `\n`;
      });
    }
    
    if (ev.videos_resinas && Array.isArray(ev.videos_resinas) && ev.videos_resinas.length > 0) {
      text += `## VÍDEOS EXTERNOS - RESINAS (${ev.videos_resinas.length})\n\n`;
      ev.videos_resinas.forEach((v: any) => {
        text += `### ${v.nome_resina}\n`;
        text += `**URL:** ${v.url_video}\n`;
        if (v.descricao) text += `**Descrição:** ${v.descricao}\n`;
        if (v.parametros_impressao) {
          text += `**Parâmetros de Impressão:**\n`;
          Object.entries(v.parametros_impressao).forEach(([key, value]) => {
            text += `- ${key}: ${value}\n`;
          });
        }
        text += `\n`;
      });
    }
  }
  
  return text;
}

function formatForSystemB(data: any): any {
  const cp = data.company_profile;
  
  return {
    format: "system_b",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    company: {
      ...cp,
      external_id: cp?.id,
      name: cp?.company_name,
      description: cp?.company_description,
      // ✨ ESTRUTURA SOCIAL MEDIA CONSOLIDADA
      social_media: {
        links: cp?.social_media_links || [],
        hashtags: cp?.social_media_hashtags || [],
        handles: cp?.social_media_handles || [],
        youtube_tags: cp?.youtube_tags || [],
        youtube_channel: cp?.youtube_channel,
        instagram_profile: cp?.instagram_profile,
        youtube_verified: cp?.youtube_verified || false,
        instagram_verified: cp?.instagram_verified || false,
      },
      // ✨ ESTRUTURA TRACKING CONSOLIDADA
      tracking: {
        google_tag_manager_id: cp?.tracking_pixels?.google_tag_manager_id || null,
        meta_pixel_id: cp?.tracking_pixels?.meta_pixel_id || null,
        tiktok_pixel_id: cp?.tracking_pixels?.tiktok_pixel_id || null,
        google_analytics_id: cp?.tracking_pixels?.google_analytics_id || null,
      }
    },
    categories: data.categories_config,
    links: data.external_links,
    spin_solutions: data.spin_solutions,
    products: data.products?.map((item: any) => ({
      ...item.product,
      cs_messages: item.cs_messages,
      aftersales_messages: item.aftersales_messages,
      coupons: item.coupons,
      google_ads: item.google_ads,
      completion_score: item.completion_score
    }))
  };
}

function getTotalFields(data: any): number {
  let count = 0;
  
  function countFields(obj: any): void {
    if (obj && typeof obj === 'object') {
      if (Array.isArray(obj)) {
        obj.forEach(item => countFields(item));
      } else {
        Object.keys(obj).forEach(key => {
          count++;
          countFields(obj[key]);
        });
      }
    }
  }
  
  countFields(data);
  return count;
}

serve(async (req) => {
  // Log incoming request
  console.log('📥 Knowledge Base API request received:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ CORS preflight request handled');
    return new Response(null, { 
      status: 204, // No Content (best practice for OPTIONS)
      headers: corsHeaders 
    });
  }

  // Log GET requests specifically
  if (req.method === 'GET') {
    console.log('🎯 GET request received - processing...');
  }

  try {
    console.log('🌐 Public API - No authentication required');

    // Parse query parameters
    const url = new URL(req.url);
    const params: KnowledgeBaseParams = {
      format: (url.searchParams.get('format') as any) || 'json',
      include_company: url.searchParams.get('include_company') !== 'false',
      include_categories: url.searchParams.get('include_categories') !== 'false',
      include_links: url.searchParams.get('include_links') !== 'false',
      include_products: url.searchParams.get('include_products') !== 'false',
      include_video_testimonials: url.searchParams.get('include_video_testimonials') !== 'false',
      include_google_reviews: url.searchParams.get('include_google_reviews') !== 'false',
      include_kols: url.searchParams.get('include_kols') === 'true',
      include_spin_solutions: url.searchParams.get('include_spin_solutions') !== 'false',
      include_blog_posts: url.searchParams.get('include_blog_posts') === 'true',
      include_landing_pages: url.searchParams.get('include_landing_pages') === 'true',
      include_external_videos: url.searchParams.get('include_external_videos') === 'true',
      approved_only: url.searchParams.get('approved_only') !== 'false',
      category: url.searchParams.get('category') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0')
    };

    console.log('Knowledge Base API called with params:', params);

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Chamar SQL function
    const { data, error } = await supabase.rpc('get_complete_knowledge_base', {
      p_include_company: params.include_company,
      p_include_categories: params.include_categories,
      p_include_links: params.include_links,
      p_include_products: params.include_products,
      p_include_video_testimonials: params.include_video_testimonials,
      p_include_google_reviews: params.include_google_reviews,
      p_include_kols: params.include_kols,
      p_include_spin_solutions: params.include_spin_solutions,
      p_include_blog_posts: params.include_blog_posts,
      p_include_landing_pages: params.include_landing_pages,
      p_approved_only: params.approved_only,
      p_category: params.category,
      p_limit: params.limit,
      p_offset: params.offset
    });

    if (error) {
      console.error('Error fetching knowledge base:', error);
      throw error;
    }

    console.log('Knowledge base data fetched successfully');

    // Fetch technical_documents separately if products are included
    if (params.include_products && data?.products) {
      const productIds = data.products.map((p: any) => p.product.id);
      
      if (productIds.length > 0) {
        console.log(`📄 Fetching technical_documents for ${productIds.length} products...`);
        const { data: productsWithDocs } = await supabase
          .from('products_repository')
          .select('id, technical_documents')
          .in('id', productIds);

        // Merge technical_documents into products
        if (productsWithDocs) {
          const docsMap = new Map(productsWithDocs.map(p => [p.id, p.technical_documents]));
          data.products = data.products.map((p: any) => ({
            ...p,
            product: {
              ...p.product,
              technical_documents: docsMap.get(p.product.id) || []
            }
          }));
          console.log('✅ Technical documents merged successfully');
        }
      }
    }
    
    // Buscar vídeos externos do Sistema B (se solicitado)
    if (params.include_external_videos) {
      console.log('🎥 Fetching external videos from Sistema B...');
      try {
        const systemBUrl = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready&include_product_videos=true&include_resin_videos=true';
        const systemBResponse = await fetch(systemBUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (systemBResponse.ok) {
          const systemBData = await systemBResponse.json();
          data.external_videos = {
            videos_produtos: systemBData.data?.videos_produtos || [],
            videos_resinas: systemBData.data?.videos_resinas || []
          };
          console.log(`✅ Fetched ${data.external_videos.videos_produtos.length} product videos and ${data.external_videos.videos_resinas.length} resin videos from Sistema B`);
        } else {
          console.warn('⚠️ Failed to fetch external videos from Sistema B:', systemBResponse.status);
          data.external_videos = { videos_produtos: [], videos_resinas: [] };
        }
      } catch (externalError) {
        console.error('❌ Error fetching external videos:', externalError);
        data.external_videos = { videos_produtos: [], videos_resinas: [] };
      }
    }

    // Formatar resposta baseado no formato solicitado
    let response: any;
    let contentType = 'application/json';
    
    switch (params.format) {
      case 'ai_training':
        response = formatForAITraining(data);
        contentType = 'text/plain';
        break;
      case 'system_b':
        response = formatForSystemB(data);
        break;
      case 'json':
      default:
        response = formatAsJSON(data);
        break;
    }

    return new Response(
      typeof response === 'string' ? response : JSON.stringify(response, null, 2),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': contentType
        }
      }
    );

  } catch (error) {
    console.error('Error in knowledge-base function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
