import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function stripHtml(html: string | null | undefined): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

function formatArray(arr: any[] | null | undefined, formatter: (item: any, idx: number) => string): string {
  if (!arr || arr.length === 0) return '';
  return arr.map(formatter).join('\n');
}

function generateApostilaMarkdown(solution: any, products: any[], companyProfile: any, videoTestimonials: any[]): string {
  const lines: string[] = [];
  const painLabel = solution.pain_type || 'N/A';
  
  // ===== CABEÇALHO =====
  lines.push(`# APOSTILA COMPLETA: ${solution.title}`);
  lines.push('');
  lines.push(`**Tipo de Dor:** ${painLabel}`);
  lines.push(`**Prioridade:** ${solution.priority || 'N/A'}`);
  lines.push(`**Frequência:** ${solution.frequency || 'N/A'}`);
  if (solution.active !== undefined) lines.push(`**Status:** ${solution.active ? 'Ativa' : 'Inativa'}`);
  lines.push(`**Gerado em:** ${new Date().toISOString()}`);
  lines.push('');
  
  // ===== EMPRESA (CONTEXTO) =====
  if (companyProfile) {
    lines.push('---');
    lines.push('## CONTEXTO DA EMPRESA');
    lines.push('');
    lines.push(`**${companyProfile.company_name}**`);
    if (companyProfile.company_description) lines.push(`${stripHtml(companyProfile.company_description)}`);
    if (companyProfile.business_sector) lines.push(`**Setor:** ${companyProfile.business_sector}`);
    if (companyProfile.website_url) lines.push(`**Website:** ${companyProfile.website_url}`);
    if (companyProfile.differentiators) lines.push(`**Diferenciais:** ${companyProfile.differentiators}`);
    lines.push('');
  }

  // ===== PITCH DE VENDAS =====
  if (solution.sales_pitch) {
    lines.push('---');
    lines.push('## PITCH DE VENDAS');
    lines.push('');
    lines.push(solution.sales_pitch);
    lines.push('');
  }

  // ===== STORYTELLING =====
  if (solution.storytelling_auto_generated) {
    lines.push('---');
    lines.push('## STORYTELLING');
    lines.push('');
    lines.push(solution.storytelling_auto_generated);
    lines.push('');
  }

  // ===== JORNADA SPIN =====
  if (solution.spin_journey) {
    lines.push('---');
    lines.push('## JORNADA SPIN');
    lines.push('');
    const j = solution.spin_journey;
    if (j.situation) lines.push(`### Situação\n${j.situation}\n`);
    if (j.problem) lines.push(`### Problema\n${j.problem}\n`);
    if (j.implication) lines.push(`### Implicação\n${j.implication}\n`);
    if (j.need_payoff) lines.push(`### Necessidade/Solução\n${j.need_payoff}\n`);
    if (j.desire) lines.push(`### Desejo\n${j.desire}\n`);
    if (j.pain) lines.push(`### Dor\n${j.pain}\n`);
    if (j.result) lines.push(`### Resultado Esperado\n${j.result}\n`);
  }

  // ===== LABELS PERSONALIZADOS =====
  if (solution.spin_journey_labels) {
    const labels = solution.spin_journey_labels;
    const hasLabels = Object.values(labels).some(v => v);
    if (hasLabels) {
      lines.push('### Labels Personalizados da Jornada');
      Object.entries(labels).forEach(([key, value]) => {
        if (value) lines.push(`- ${key}: ${value}`);
      });
      lines.push('');
    }
  }

  // ===== MÉTRICAS DE IMPACTO =====
  if (solution.impact_metrics && Object.keys(solution.impact_metrics).length > 0) {
    lines.push('---');
    lines.push('## MÉTRICAS DE IMPACTO');
    lines.push('');
    Object.entries(solution.impact_metrics).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value.label) {
        lines.push(`- **${value.label}:** ${value.value} ${value.unit || ''}`);
      } else {
        lines.push(`- **${key}:** ${value}`);
      }
    });
    lines.push('');
  }

  if (solution.pain_metrics && Object.keys(solution.pain_metrics).length > 0) {
    lines.push('### Métricas de Dor');
    Object.entries(solution.pain_metrics).forEach(([key, value]: [string, any]) => {
      if (typeof value === 'object' && value.label) {
        lines.push(`- **${value.label}:** ${value.value} ${value.unit || ''}`);
      } else {
        lines.push(`- **${key}:** ${value}`);
      }
    });
    lines.push('');
  }

  // ===== PRODUTOS SELECIONADOS (COMPLETOS) =====
  if (products.length > 0) {
    lines.push('---');
    lines.push(`## PRODUTOS SELECIONADOS (${products.length})`);
    lines.push('');
    
    products.forEach((p, idx) => {
      lines.push(`### ${idx + 1}. ${p.name}`);
      lines.push('');
      if (p.category) lines.push(`**Categoria:** ${p.category}${p.subcategory ? ` > ${p.subcategory}` : ''}`);
      if (p.description) lines.push(`**Descrição:** ${stripHtml(p.description)}`);
      if (p.price) lines.push(`**Preço:** R$ ${p.price}${p.promo_price ? ` (Promo: R$ ${p.promo_price})` : ''}`);
      if (p.brand) lines.push(`**Marca:** ${p.brand}`);
      if (p.slug) lines.push(`**Slug:** ${p.slug}`);
      if (p.product_url) lines.push(`**URL:** ${p.product_url}`);
      if (p.image_url) lines.push(`**Imagem Principal:** ${p.image_url}`);
      lines.push('');
      
      // Benefícios
      if (p.benefits && Array.isArray(p.benefits) && p.benefits.length > 0) {
        lines.push('#### Benefícios');
        p.benefits.forEach((b: any) => {
          if (typeof b === 'string') lines.push(`- ${b}`);
          else lines.push(`- **${b.title || b.name}:** ${b.description || ''}`);
        });
        lines.push('');
      }
      
      // Features
      if (p.features && Array.isArray(p.features) && p.features.length > 0) {
        lines.push('#### Características');
        p.features.forEach((f: any) => {
          if (typeof f === 'string') lines.push(`- ${f}`);
          else lines.push(`- **${f.title || f.name}:** ${f.description || ''}`);
        });
        lines.push('');
      }
      
      // Especificações Técnicas
      if (p.technical_specifications && Array.isArray(p.technical_specifications) && p.technical_specifications.length > 0) {
        lines.push('#### Especificações Técnicas');
        p.technical_specifications.forEach((s: any) => {
          lines.push(`- **${s.label || s.name}:** ${s.value}`);
        });
        lines.push('');
      }
      
      // FAQ do Produto
      if (p.faq && Array.isArray(p.faq) && p.faq.length > 0) {
        lines.push('#### FAQ do Produto');
        p.faq.forEach((f: any, i: number) => {
          lines.push(`**P${i + 1}:** ${f.question}`);
          lines.push(`**R${i + 1}:** ${stripHtml(f.answer)}`);
          lines.push('');
        });
      }
      
      // Keywords
      if (p.keywords && Array.isArray(p.keywords) && p.keywords.length > 0) {
        lines.push(`**Keywords:** ${p.keywords.join(', ')}`);
        lines.push('');
      }
      
      // Target Audience
      if (p.target_audience && Array.isArray(p.target_audience) && p.target_audience.length > 0) {
        lines.push(`**Público-alvo:** ${p.target_audience.map((t: any) => typeof t === 'string' ? t : t.label || t.name).join(', ')}`);
        lines.push('');
      }
      
      // Anti-Hallucination Rules
      if (p.anti_hallucination_rules) {
        const rules = p.anti_hallucination_rules;
        const hasRules = rules.never_claim?.length > 0 || rules.never_mix_with?.length > 0 ||
                        rules.always_require?.length > 0 || rules.always_explain?.length > 0;
        if (hasRules) {
          lines.push('#### ⚠️ Regras Anti-Alucinação');
          if (rules.never_claim?.length > 0) lines.push(`- **NUNCA afirmar:** ${rules.never_claim.join('; ')}`);
          if (rules.never_mix_with?.length > 0) lines.push(`- **NUNCA misturar com:** ${rules.never_mix_with.join('; ')}`);
          if (rules.always_require?.length > 0) lines.push(`- **SEMPRE exigir:** ${rules.always_require.join('; ')}`);
          if (rules.always_explain?.length > 0) lines.push(`- **SEMPRE explicar:** ${rules.always_explain.join('; ')}`);
          lines.push('');
        }
      }
      
      // Required Products
      if (p.required_products && Array.isArray(p.required_products) && p.required_products.length > 0) {
        lines.push('#### 🔗 Produtos Requeridos');
        p.required_products.forEach((rp: any) => {
          lines.push(`- ${rp.product_name || rp.name}: ${rp.context || rp.reason || 'Complementar'}`);
        });
        lines.push('');
      }
      
      // Forbidden Products
      if (p.forbidden_products && Array.isArray(p.forbidden_products) && p.forbidden_products.length > 0) {
        lines.push('#### 🚫 Produtos Proibidos');
        p.forbidden_products.forEach((fp: any) => {
          lines.push(`- ${fp.product_name || fp.name}: ${fp.reason || 'Incompatível'}`);
        });
        lines.push('');
      }
      
      // Competitor Comparison
      if (p.competitor_comparison?.enabled && p.competitor_comparison.table_data?.length > 0) {
        lines.push('#### 📊 Comparativo com Concorrentes');
        if (p.competitor_comparison.title) lines.push(`**${p.competitor_comparison.title}**`);
        const headers = p.competitor_comparison.table_headers || [];
        lines.push(`| ${headers.join(' | ')} |`);
        lines.push(`|${headers.map(() => '---').join('|')}|`);
        p.competitor_comparison.table_data.forEach((row: any) => {
          const cells = headers.map((h: string) => row[h] || '-');
          lines.push(`| ${cells.join(' | ')} |`);
        });
        lines.push('');
      }
      
      // Vídeos
      const videoSections = [
        { key: 'youtube_videos', label: 'YouTube' },
        { key: 'instagram_videos', label: 'Instagram' },
        { key: 'technical_videos', label: 'Técnicos' },
        { key: 'testimonial_videos', label: 'Depoimentos' },
      ];
      videoSections.forEach(({ key, label }) => {
        const videos = p[key];
        if (videos && Array.isArray(videos) && videos.length > 0) {
          lines.push(`**Vídeos ${label}:** ${videos.map((v: any) => v.url || v.video_url).join(', ')}`);
        }
      });
      
      // Galeria de Imagens
      if (p.images_gallery && Array.isArray(p.images_gallery) && p.images_gallery.length > 0) {
        lines.push(`**Galeria:** ${p.images_gallery.length} imagem(ns)`);
        p.images_gallery.forEach((img: any) => {
          const url = typeof img === 'string' ? img : img.url || img.src;
          const alt = typeof img === 'string' ? '' : img.alt || '';
          if (url) lines.push(`- ${url}${alt ? ` (${alt})` : ''}`);
        });
      }
      
      lines.push('');
      lines.push('---');
      lines.push('');
    });
  }

  // ===== CASOS DE SUCESSO =====
  if (solution.success_cases && solution.success_cases.length > 0) {
    lines.push('## CASOS DE SUCESSO');
    lines.push('');
    solution.success_cases.forEach((sc: any, idx: number) => {
      lines.push(`### Caso ${idx + 1}: ${sc.client_name || 'Cliente'}`);
      if (sc.specialty) lines.push(`**Especialidade:** ${sc.specialty}`);
      if (sc.area) lines.push(`**Área:** ${sc.area}`);
      if (sc.city) lines.push(`**Cidade:** ${sc.city}`);
      if (sc.state) lines.push(`**Estado:** ${sc.state}`);
      if (sc.result) lines.push(`**Resultado:** ${sc.result}`);
      if (sc.photo_url) lines.push(`**Foto:** ${sc.photo_url}`);
      if (sc.testimonial) lines.push(`**Depoimento:** "${sc.testimonial}"`);
      lines.push('');
    });
  }

  // ===== CITAÇÕES REAIS =====
  if (solution.real_quotes && solution.real_quotes.length > 0) {
    lines.push('---');
    lines.push('## CITAÇÕES REAIS DE CLIENTES');
    lines.push('');
    solution.real_quotes.forEach((q: any) => {
      lines.push(`> "${q.quote}"`);
      lines.push(`> — ${q.author || 'Cliente'}${q.specialty ? `, ${q.specialty}` : ''}${q.city ? ` (${q.city})` : ''}`);
      lines.push('');
    });
  }

  // ===== FAQ DA SOLUÇÃO =====
  if (solution.faq && solution.faq.length > 0) {
    lines.push('---');
    lines.push('## PERGUNTAS FREQUENTES');
    lines.push('');
    solution.faq.forEach((f: any, i: number) => {
      lines.push(`**${i + 1}. ${f.question}**`);
      lines.push(`${stripHtml(f.answer)}`);
      lines.push('');
    });
  }

  // ===== TABELA DE COMPARAÇÃO =====
  if (solution.competitor_comparison?.enabled && solution.competitor_comparison.table_data?.length > 0) {
    lines.push('---');
    lines.push('## COMPARAÇÃO COM CONCORRENTES');
    lines.push('');
    if (solution.competitor_comparison.title) lines.push(`**${solution.competitor_comparison.title}**`);
    if (solution.competitor_comparison.subtitle) lines.push(`${solution.competitor_comparison.subtitle}`);
    lines.push('');
    const headers = solution.competitor_comparison.table_headers || [];
    lines.push(`| ${headers.join(' | ')} |`);
    lines.push(`|${headers.map(() => '---').join('|')}|`);
    solution.competitor_comparison.table_data.forEach((row: any) => {
      const cells = headers.map((h: string) => row[h] || '-');
      lines.push(`| ${cells.join(' | ')} |`);
    });
    lines.push('');
  }

  // ===== MENSAGEM WHATSAPP =====
  if (solution.whatsapp_complete_message) {
    lines.push('---');
    lines.push('## MENSAGEM WHATSAPP COMPLETA');
    lines.push('');
    lines.push('```');
    lines.push(solution.whatsapp_complete_message);
    lines.push('```');
    lines.push('');
  }

  // ===== VÍDEOS VINCULADOS =====
  if (solution.selected_video_url) {
    lines.push('---');
    lines.push('## VÍDEO PRINCIPAL');
    lines.push('');
    lines.push(`**URL:** ${solution.selected_video_url}`);
    if (solution.selected_video_title) lines.push(`**Título:** ${solution.selected_video_title}`);
    lines.push('');
  }

  // ===== VIDEO TESTIMONIALS GLOBAIS =====
  if (videoTestimonials && videoTestimonials.length > 0) {
    lines.push('---');
    lines.push(`## DEPOIMENTOS EM VÍDEO (${videoTestimonials.length})`);
    lines.push('');
    videoTestimonials.forEach((vt: any) => {
      lines.push(`- **${vt.client_name}**${vt.profession ? ` (${vt.profession})` : ''}: ${vt.video_url || ''}`);
      if (vt.testimonial_text) lines.push(`  "${vt.testimonial_text}"`);
    });
    lines.push('');
  }

  // ===== URL PERSONALIZADA =====
  if (solution.custom_url?.enabled) {
    lines.push('---');
    lines.push('## URL PERSONALIZADA');
    lines.push('');
    lines.push(`**Label:** ${solution.custom_url.label}`);
    lines.push(`**URL:** ${solution.custom_url.url}`);
    lines.push('');
  }

  // ===== GOOGLE ADS CAMPAIGN =====
  if (solution.google_ads_campaign) {
    lines.push('---');
    lines.push('## CAMPANHA GOOGLE ADS');
    lines.push('');
    const gads = solution.google_ads_campaign;
    if (gads.headlines?.length > 0) {
      lines.push('**Headlines:**');
      gads.headlines.forEach((h: string) => lines.push(`- ${h}`));
    }
    if (gads.descriptions?.length > 0) {
      lines.push('**Descrições:**');
      gads.descriptions.forEach((d: string) => lines.push(`- ${d}`));
    }
    if (gads.keywords?.length > 0) {
      lines.push(`**Keywords:** ${gads.keywords.join(', ')}`);
    }
    lines.push('');
  }

  // ===== HERO BANNER =====
  if (solution.ai_generated_images?.hero_banner) {
    const banner = solution.ai_generated_images.hero_banner;
    lines.push('---');
    lines.push('## HERO BANNER');
    lines.push('');
    lines.push(`**Modo:** ${banner.mode || 'N/A'}`);
    if (banner.manual_upload?.src) lines.push(`**Imagem:** ${banner.manual_upload.src}`);
    if (banner.manual_upload?.alt) lines.push(`**Alt:** ${banner.manual_upload.alt}`);
    lines.push('');
  }

  // ===== LANDING PAGE =====
  if (solution.landing_page_html) {
    lines.push('---');
    lines.push('## LANDING PAGE');
    lines.push('');
    lines.push(`**Gerada em:** ${solution.landing_page_generated_at || 'N/A'}`);
    lines.push(`**Tamanho HTML:** ${solution.landing_page_html.length} caracteres`);
    lines.push('');
  }

  // ===== PERSONALIZAÇÃO WHATSAPP =====
  if (solution.whatsapp_section_titles) {
    const wst = solution.whatsapp_section_titles;
    const hasCustom = wst.journey_title || wst.metrics_title;
    if (hasCustom) {
      lines.push('---');
      lines.push('## PERSONALIZAÇÃO WHATSAPP');
      lines.push('');
      if (wst.journey_title) lines.push(`**Título Jornada:** ${wst.journey_title}`);
      if (wst.journey_subtitle) lines.push(`**Subtítulo Jornada:** ${wst.journey_subtitle}`);
      if (wst.metrics_title) lines.push(`**Título Métricas:** ${wst.metrics_title}`);
      if (wst.metrics_subtitle) lines.push(`**Subtítulo Métricas:** ${wst.metrics_subtitle}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { solution_id } = await req.json();
    
    if (!solution_id) {
      throw new Error('solution_id é obrigatório');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar solução SPIN completa
    const { data: solution, error: solError } = await supabase
      .from('spin_selling_solutions')
      .select('*')
      .eq('id', solution_id)
      .single();

    if (solError || !solution) {
      throw new Error(`Solução não encontrada: ${solError?.message || 'ID inválido'}`);
    }

    // 2. Buscar produtos completos
    let products: any[] = [];
    if (solution.product_ids && solution.product_ids.length > 0) {
      const { data: prods } = await supabase
        .from('products_repository')
        .select('*')
        .in('id', solution.product_ids);
      products = prods || [];
    }

    // 3. Buscar company profile
    const { data: companyArr } = await supabase
      .from('company_profile')
      .select('*')
      .limit(1);
    const companyProfile = companyArr?.[0] || null;

    // 4. Buscar video testimonials
    const { data: videoTestimonials } = await supabase
      .from('video_testimonials')
      .select('*')
      .eq('approved', true)
      .order('display_order', { ascending: true });

    // 5. Gerar Markdown
    const markdown = generateApostilaMarkdown(solution, products, companyProfile, videoTestimonials || []);

    // 6. Salvar no metadata da solução
    const existingMetadata = solution.metadata || {};
    const { error: updateError } = await supabase
      .from('spin_selling_solutions')
      .update({
        metadata: {
          ...existingMetadata,
          apostila_content: markdown,
          apostila_generated_at: new Date().toISOString(),
          apostila_products_count: products.length,
        }
      })
      .eq('id', solution_id);

    if (updateError) {
      console.error('Erro ao salvar apostila no metadata:', updateError);
    }

    console.log(`✅ Apostila gerada: ${markdown.length} chars, ${products.length} produtos`);

    return new Response(
      JSON.stringify({
        success: true,
        markdown,
        stats: {
          solution_title: solution.title,
          products_count: products.length,
          markdown_length: markdown.length,
          saved_to_metadata: !updateError,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
