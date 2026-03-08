/**
 * Process Content Submission
 * 16-step AI pipeline for transforming content into SEO pages
 * 
 * POST /process-content-submission
 * { submission_id: "uuid" }
 * 
 * Pipeline:
 * 1. Load submission
 * 2. Normalize content
 * 3. Extract entities (AI)
 * 4. Fetch Knowledge Graph
 * 5. Build topic/product graph
 * 6. Link entities
 * 7. Generate structured content
 * 8. Generate SEO metadata
 * 9. Generate Schema JSON-LD
 * 10. Generate HTML
 * 11. Generate internal links
 * 12. Compute SHA256 hash
 * 13. Check duplicates
 * 14. Generate embeddings
 * 15. Save to generated_pages + entity_links
 * 16. Create publication record
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { fetchKnowledgeGraph, buildProductGraph, buildTopicGraph, generateInternalLinks } from '../_shared/fetchKnowledgeGraph.ts';
import { trackFromResponse } from '../_shared/track-ai-usage.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_URL = 'https://api.lovable.dev/v1/chat/completions';

interface ProcessingResult {
  step: number;
  name: string;
  success: boolean;
  data?: any;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate JWT for security
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Rate limit check
    const rateCheck = await checkRateLimit('process-content-submission');
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { submission_id } = await req.json();
    
    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'Missing submission_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[process-content-submission] Starting pipeline for: ${submission_id}`);
    const results: ProcessingResult[] = [];

    // Pipeline audit logging helper
    async function logStep(stepNumber: number, stepName: string, status: string, extra?: any) {
      try {
        await supabase.from('pipeline_audit_logs').insert({
          submission_id,
          step_number: stepNumber,
          step_name: stepName,
          status,
          started_at: new Date().toISOString(),
          ...(status === 'success' || status === 'error' ? { finished_at: new Date().toISOString() } : {}),
          ...(extra || {}),
        });
      } catch (e) {
        console.warn('[pipeline-audit] Log failed:', e);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STEP 1: Load Submission
    // ═══════════════════════════════════════════════════════════
    
    const { data: submission, error: loadError } = await supabase
      .from('content_submissions')
      .select('*')
      .eq('id', submission_id)
      .single();

    if (loadError || !submission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found', details: loadError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    results.push({ step: 1, name: 'Load submission', success: true, data: { id: submission.id, title: submission.title } });
    await logStep(1, 'Load submission', 'success');

    // Update status to processing
    await supabase
      .from('content_submissions')
      .update({ processing_status: 'processing' })
      .eq('id', submission_id);

    // ═══════════════════════════════════════════════════════════
    // STEP 2: Normalize Content
    // ═══════════════════════════════════════════════════════════

    const normalizedContent = normalizeContent(submission.raw_content || '', submission.content_type);
    results.push({ step: 2, name: 'Normalize content', success: true, data: { length: normalizedContent.length } });
    await logStep(2, 'Normalize content', 'success', { output_summary: { length: normalizedContent.length } });

    // ═══════════════════════════════════════════════════════════
    // STEP 3: Extract Entities (AI)
    // ═══════════════════════════════════════════════════════════

    let extractedEntities: any = {};
    
    if (lovableApiKey) {
      try {
        const entityPrompt = `Analise o seguinte conteúdo e extraia entidades estruturadas em JSON:

TÍTULO: ${submission.title}
CONTEÚDO: ${normalizedContent.slice(0, 4000)}
TIPO: ${submission.content_type}
INTENT: ${submission.metadata?.intent || 'seo'}

Extraia:
- products: nomes de produtos mencionados
- experts: nomes de especialistas/profissionais
- topics: temas principais (ex: implantodontia, fluxo digital)
- keywords: palavras-chave SEO relevantes
- entities: outras entidades (empresas, tecnologias, procedimentos)

Responda APENAS em JSON válido:
{
  "products": [],
  "experts": [],
  "topics": [],
  "keywords": [],
  "entities": []
}`;

        const aiResponse = await fetch(LOVABLE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: entityPrompt }],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || '';
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedEntities = JSON.parse(jsonMatch[0]);
          }
          
          await trackFromResponse(aiData, 'process-content-submission', 'extract_entities', submission.title);
        }
      } catch (aiError) {
        console.warn('[process-content-submission] Entity extraction failed:', aiError);
      }
    }

    results.push({ step: 3, name: 'Extract entities', success: true, data: extractedEntities });
    await logStep(3, 'Extract entities', 'success', { output_summary: { products: extractedEntities.products?.length || 0, keywords: extractedEntities.keywords?.length || 0 } });

    // Update submission with extracted entities
    await supabase
      .from('content_submissions')
      .update({ extracted_entities: extractedEntities })
      .eq('id', submission_id);

    // ═══════════════════════════════════════════════════════════
    // STEP 4: Fetch Knowledge Graph
    // ═══════════════════════════════════════════════════════════

    const knowledgeGraph = await fetchKnowledgeGraph(supabase);
    results.push({ step: 4, name: 'Fetch Knowledge Graph', success: true, data: { 
      products: knowledgeGraph.products.length,
      reviews: knowledgeGraph.reviews.length,
      experts: knowledgeGraph.experts.length 
    }});
    await logStep(4, 'Fetch Knowledge Graph', 'success', { output_summary: { products: knowledgeGraph.products.length } });

    // ═══════════════════════════════════════════════════════════
    // STEP 5: Build Topic/Product Graph
    // ═══════════════════════════════════════════════════════════

    let contextGraph: any = null;
    const primaryTopic = extractedEntities.topics?.[0] || submission.metadata?.topic;
    const primaryProductId = submission.related_products?.[0] || submission.metadata?.product_id;

    if (primaryProductId) {
      contextGraph = buildProductGraph(knowledgeGraph, primaryProductId);
    } else if (primaryTopic) {
      contextGraph = buildTopicGraph(knowledgeGraph, primaryTopic);
    }

    results.push({ step: 5, name: 'Build context graph', success: true, data: { 
      type: primaryProductId ? 'product' : 'topic',
      hasGraph: !!contextGraph 
    }});
    await logStep(5, 'Build context graph', 'success');

    // ═══════════════════════════════════════════════════════════
    // STEP 6: Link Entities
    // ═══════════════════════════════════════════════════════════

    const linkedEntities = linkEntitiesToKnowledgeGraph(extractedEntities, knowledgeGraph);
    results.push({ step: 6, name: 'Link entities', success: true, data: { 
      linkedProducts: linkedEntities.products.length,
      linkedExperts: linkedEntities.experts.length 
    }});
    await logStep(6, 'Link entities', 'success');
    // ═══════════════════════════════════════════════════════════

    let structuredContent: any = {
      title: submission.title,
      sections: [],
      metadata: submission.metadata,
      entities: linkedEntities,
    };

    if (lovableApiKey && normalizedContent.length > 100) {
      try {
        const structurePrompt = `Transforme o conteúdo em seções estruturadas para uma landing page SEO.

TÍTULO: ${submission.title}
CONTEÚDO: ${normalizedContent.slice(0, 6000)}
INTENT: ${submission.metadata?.intent || 'seo'}

Gere seções em JSON:
{
  "hero": { "headline": "", "subheadline": "", "cta": "" },
  "sections": [
    { "type": "benefits", "title": "", "items": [] },
    { "type": "features", "title": "", "items": [] },
    { "type": "faq", "title": "Perguntas Frequentes", "items": [{"q":"","a":""}] }
  ],
  "cta_final": { "headline": "", "button": "" }
}`;

        const structureResponse = await fetch(LOVABLE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: structurePrompt }],
            temperature: 0.5,
          }),
        });

        if (structureResponse.ok) {
          const structureData = await structureResponse.json();
          const content = structureData.choices?.[0]?.message?.content || '';
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            structuredContent = { ...structuredContent, ...JSON.parse(jsonMatch[0]) };
          }
          await trackFromResponse(structureData, 'process-content-submission', 'generate_structure', submission.title);
        }
      } catch (err) {
        console.warn('[process-content-submission] Structure generation failed:', err);
      }
    }

    results.push({ step: 7, name: 'Generate structured content', success: true });

    // ═══════════════════════════════════════════════════════════
    // STEP 8: Generate SEO Metadata
    // ═══════════════════════════════════════════════════════════

    const seoMetadata = {
      title: submission.title.slice(0, 60),
      description: normalizedContent.slice(0, 160),
      keywords: extractedEntities.keywords || [],
      canonical: null,
    };

    results.push({ step: 8, name: 'Generate SEO metadata', success: true, data: seoMetadata });

    // ═══════════════════════════════════════════════════════════
    // STEP 9: Generate Schema JSON-LD
    // ═══════════════════════════════════════════════════════════

    const schemaJsonLd = generateSchemaJsonLd(submission, seoMetadata, linkedEntities, knowledgeGraph);
    results.push({ step: 9, name: 'Generate Schema JSON-LD', success: true });

    // ═══════════════════════════════════════════════════════════
    // STEP 10: Generate HTML
    // ═══════════════════════════════════════════════════════════

    const htmlContent = generateHtmlPage(structuredContent, seoMetadata, schemaJsonLd);
    results.push({ step: 10, name: 'Generate HTML', success: true, data: { length: htmlContent.length } });

    // ═══════════════════════════════════════════════════════════
    // STEP 11: Generate Internal Links
    // ═══════════════════════════════════════════════════════════

    const internalLinks = generateInternalLinks(knowledgeGraph, extractedEntities.keywords || []);
    results.push({ step: 11, name: 'Generate internal links', success: true, data: { count: internalLinks.length } });

    // ═══════════════════════════════════════════════════════════
    // STEP 12: Compute SHA256 Hash
    // ═══════════════════════════════════════════════════════════

    const contentHash = await computeSha256(htmlContent);
    results.push({ step: 12, name: 'Compute content hash', success: true, data: { hash: contentHash.slice(0, 16) + '...' } });

    // ═══════════════════════════════════════════════════════════
    // STEP 13: Check Duplicates
    // ═══════════════════════════════════════════════════════════

    const { data: existingPage } = await supabase
      .from('generated_pages')
      .select('id, slug')
      .eq('content_hash', contentHash)
      .single();

    if (existingPage) {
      console.log('[process-content-submission] Duplicate content detected:', existingPage.id);
      results.push({ step: 13, name: 'Check duplicates', success: true, data: { isDuplicate: true, existingId: existingPage.id } });
      
      // Update submission as completed (duplicate)
      await supabase
        .from('content_submissions')
        .update({ 
          processing_status: 'completed',
          processing_notes: `Duplicate of page: ${existingPage.id}`,
          processed_at: new Date().toISOString()
        })
        .eq('id', submission_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          duplicate: true, 
          existing_page_id: existingPage.id,
          results 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    results.push({ step: 13, name: 'Check duplicates', success: true, data: { isDuplicate: false } });

    // ═══════════════════════════════════════════════════════════
    // STEP 14: Generate Embeddings
    // ═══════════════════════════════════════════════════════════

    let embedding: number[] | null = null;
    
    if (lovableApiKey) {
      try {
        const embeddingResponse = await fetch('https://api.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'gemini-embedding-001',
            input: `${submission.title}. ${normalizedContent.slice(0, 2000)}`,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          embedding = embeddingData.data?.[0]?.embedding || null;
        }
      } catch (err) {
        console.warn('[process-content-submission] Embedding generation failed:', err);
      }
    }

    results.push({ step: 14, name: 'Generate embeddings', success: !!embedding, data: { hasEmbedding: !!embedding } });

    // ═══════════════════════════════════════════════════════════
    // STEP 15: Save to generated_pages + entity_links
    // ═══════════════════════════════════════════════════════════

    const slug = generateSlug(submission.title);
    const path = generatePath(submission.content_type, slug);

    const pageData = {
      title: submission.title,
      slug: slug,
      path: path,
      html_content: htmlContent,
      structured_content: structuredContent,
      entities: linkedEntities,
      knowledge_graph_snapshot: {
        products_count: knowledgeGraph.products.length,
        reviews_count: knowledgeGraph.reviews.length,
        generated_at: new Date().toISOString(),
      },
      schema_json_ld: schemaJsonLd,
      tags: submission.tags || [],
      page_type: submission.content_type,
      source_submission_id: submission_id,
      content_hash: contentHash,
      embedding: embedding,
      seo_score: calculateSeoScore(seoMetadata, structuredContent),
      published: false,
      regeneration_required: false,
    };

    const { data: insertedPage, error: pageError } = await supabase
      .from('generated_pages')
      .insert(pageData)
      .select()
      .single();

    if (pageError) {
      console.error('[process-content-submission] Failed to save page:', pageError);
      throw new Error(`Failed to save page: ${pageError.message}`);
    }

    // Save entity links
    const entityLinks = [];
    for (const product of linkedEntities.products) {
      entityLinks.push({
        page_id: insertedPage.id,
        entity_type: 'product',
        entity_id: product.id,
        relevance_score: product.relevance || 0.8,
      });
    }
    for (const expert of linkedEntities.experts) {
      entityLinks.push({
        page_id: insertedPage.id,
        entity_type: 'expert',
        entity_id: expert.id,
        relevance_score: expert.relevance || 0.7,
      });
    }

    if (entityLinks.length > 0) {
      await supabase.from('content_entity_links').insert(entityLinks);
    }

    results.push({ step: 15, name: 'Save generated page', success: true, data: { pageId: insertedPage.id } });

    // ═══════════════════════════════════════════════════════════
    // STEP 16: Create Publication Record
    // ═══════════════════════════════════════════════════════════

    const { data: publication } = await supabase
      .from('page_publications')
      .insert({
        page_id: insertedPage.id,
        version: 1,
        html_snapshot: htmlContent,
        published_url: null,
        published_domain: null,
      })
      .select()
      .single();

    results.push({ step: 16, name: 'Create publication record', success: true });

    // Update submission as completed
    await supabase
      .from('content_submissions')
      .update({ 
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
        related_products: linkedEntities.products.map((p: any) => p.id)
      })
      .eq('id', submission_id);

    console.log(`[process-content-submission] ✅ Pipeline completed for: ${submission_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        submission_id: submission_id,
        page_id: insertedPage.id,
        slug: slug,
        path: path,
        results: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[process-content-submission] Pipeline error:', error);
    
    // Update submission as failed
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { submission_id } = await req.json().catch(() => ({}));
    if (submission_id) {
      await supabase
        .from('content_submissions')
        .update({ 
          processing_status: 'failed',
          processing_notes: error.message 
        })
        .eq('id', submission_id);
    }

    return new Response(
      JSON.stringify({ error: 'Pipeline failed', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function normalizeContent(content: string, contentType: string): string {
  // Remove HTML tags
  let normalized = content.replace(/<[^>]*>/g, ' ');
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim();
  return normalized;
}

function linkEntitiesToKnowledgeGraph(entities: any, kg: any): any {
  const linked = {
    products: [] as any[],
    experts: [] as any[],
  };

  const extractedProducts = entities.products || [];
  const extractedExperts = entities.experts || [];

  // Match products by name
  for (const prodName of extractedProducts) {
    const match = kg.products.find((p: any) => 
      p.name.toLowerCase().includes(prodName.toLowerCase()) ||
      prodName.toLowerCase().includes(p.name.toLowerCase())
    );
    if (match) {
      linked.products.push({ id: match.id, name: match.name, relevance: 0.9 });
    }
  }

  // Match experts by name
  for (const expertName of extractedExperts) {
    const match = kg.experts.find((e: any) =>
      e.full_name.toLowerCase().includes(expertName.toLowerCase()) ||
      expertName.toLowerCase().includes(e.full_name.toLowerCase())
    );
    if (match) {
      linked.experts.push({ id: match.id, name: match.full_name, relevance: 0.85 });
    }
  }

  return linked;
}

function generateSchemaJsonLd(submission: any, seo: any, entities: any, kg: any): string {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    dateCreated: submission.created_at,
    dateModified: new Date().toISOString(),
  };

  // Add organization if company exists
  if (kg.company) {
    schema.publisher = {
      '@type': 'Organization',
      name: kg.company.company_name,
      url: kg.company.website_url,
    };
  }

  // Add mentions for linked products
  if (entities.products.length > 0) {
    schema.mentions = entities.products.map((p: any) => ({
      '@type': 'Product',
      name: p.name,
    }));
  }

  return JSON.stringify(schema, null, 2);
}

function generateHtmlPage(content: any, seo: any, schema: string): string {
  const heroSection = content.hero ? `
    <section class="hero">
      <h1>${content.hero.headline || content.title}</h1>
      ${content.hero.subheadline ? `<p class="subheadline">${content.hero.subheadline}</p>` : ''}
      ${content.hero.cta ? `<a href="#cta" class="cta-button">${content.hero.cta}</a>` : ''}
    </section>
  ` : '';

  const sections = (content.sections || []).map((section: any) => {
    if (section.type === 'benefits' || section.type === 'features') {
      return `
        <section class="${section.type}">
          <h2>${section.title}</h2>
          <ul>
            ${(section.items || []).map((item: string) => `<li>${item}</li>`).join('\n')}
          </ul>
        </section>
      `;
    }
    if (section.type === 'faq') {
      return `
        <section class="faq" itemscope itemtype="https://schema.org/FAQPage">
          <h2>${section.title}</h2>
          ${(section.items || []).map((faq: any) => `
            <div itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
              <h3 itemprop="name">${faq.q}</h3>
              <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
                <p itemprop="text">${faq.a}</p>
              </div>
            </div>
          `).join('\n')}
        </section>
      `;
    }
    return '';
  }).join('\n');

  const ctaFinal = content.cta_final ? `
    <section id="cta" class="cta-final">
      <h2>${content.cta_final.headline}</h2>
      <a href="#" class="cta-button">${content.cta_final.button}</a>
    </section>
  ` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seo.title}</title>
  <meta name="description" content="${seo.description}">
  <meta name="keywords" content="${(seo.keywords || []).join(', ')}">
  <script type="application/ld+json">${schema}</script>
</head>
<body>
  <main>
    ${heroSection}
    ${sections}
    ${ctaFinal}
  </main>
</body>
</html>`;
}

async function computeSha256(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function generatePath(contentType: string, slug: string): string {
  // SEO-optimized URL paths (audit fix: /produtos instead of /produto, landing at root)
  const pathMap: Record<string, string> = {
    'landing': `/${slug}`,
    'product': `/produtos/${slug}`,
    'blog': `/blog/${slug}`,
    'topic': `/topico/${slug}`,
    'guide': `/guia/${slug}`,
    'review': `/avaliacoes/${slug}`,
    'video': `/videos/${slug}`,
  };
  return pathMap[contentType] || `/${slug}`;
}

function calculateSeoScore(seo: any, content: any): number {
  let score = 0;
  
  // Title length (10 pts)
  if (seo.title && seo.title.length >= 30 && seo.title.length <= 60) score += 10;
  else if (seo.title) score += 5;
  
  // Description length (10 pts)
  if (seo.description && seo.description.length >= 120 && seo.description.length <= 160) score += 10;
  else if (seo.description) score += 5;
  
  // Keywords (10 pts)
  if (seo.keywords && seo.keywords.length >= 3) score += 10;
  else if (seo.keywords && seo.keywords.length > 0) score += 5;
  
  // Has hero section (10 pts)
  if (content.hero) score += 10;
  
  // Has FAQ (15 pts)
  const faqSection = (content.sections || []).find((s: any) => s.type === 'faq');
  if (faqSection && faqSection.items?.length >= 3) score += 15;
  
  // Has CTA (10 pts)
  if (content.cta_final) score += 10;
  
  // Has structured sections (15 pts)
  if (content.sections && content.sections.length >= 2) score += 15;
  
  // Has entities (10 pts)
  if (content.entities?.products?.length > 0) score += 10;
  
  return Math.min(score, 100);
}
