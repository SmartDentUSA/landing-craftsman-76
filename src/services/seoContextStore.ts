/**
 * SEO Context Store
 * Persistência do SEO Context no Supabase (landing_pages.data.seo_intelligent)
 */

import { SEOContext, KeywordResolution, KeywordSuggestion, SEOIntelligentContext } from '@/types/seo';
import { supabase } from '@/integrations/supabase/client';

interface SaveSEOContextPayload {
  landingPageId: string;
  baseTextMarkdown: string;
  aiKeywords: KeywordSuggestion[];
  resolvedKeywords: KeywordResolution[];
  locale?: 'pt_BR';
}

/**
 * Salva SEO Context no Supabase (landing_pages.data.seo_intelligent)
 */
export async function saveSEOContext(payload: SaveSEOContextPayload): Promise<SEOContext> {
  const now = new Date().toISOString();
  
  console.log('🔍 [SEO Context] Iniciando salvamento para LP:', payload.landingPageId);
  
  // Fetch current landing page data
  const { data: currentLP, error: fetchError } = await supabase
    .from('landing_pages')
    .select('data, user_id')
    .eq('id', payload.landingPageId)
    .single();
  
  if (fetchError) {
    console.error('❌ [SEO Context] Erro ao buscar landing page:', fetchError);
    throw new Error(`Falha ao buscar landing page: ${fetchError.message}`);
  }
  
  console.log('📊 [SEO Context] Dados atuais da LP:', {
    hasData: !!currentLP?.data,
    userId: currentLP?.user_id,
    dataKeys: currentLP?.data ? Object.keys(currentLP.data) : []
  });
  
  // Prepare SEO Intelligent data
  const seoIntelligent: SEOIntelligentContext = {
    enabled: true,
    generated_at: now,
    base_text_markdown: payload.baseTextMarkdown,
    ai_keywords: payload.aiKeywords,
    resolved_keywords: payload.resolvedKeywords,
    locale: payload.locale ?? 'pt_BR',
  };
  
  // Merge with existing data AND mirror to seo block
  const existingData = (typeof currentLP?.data === 'object' && currentLP?.data !== null) ? currentLP.data : {};
  const updatedData = {
    ...existingData,
    seo_intelligent: seoIntelligent,
    seo: {
      ...(existingData as any).seo,
      seo_hidden_content: payload.baseTextMarkdown,
      ai_keywords: payload.aiKeywords,
      seo_generated_by_ai: true,
      ai_seo_enabled: true,
    }
  } as any;
  
  console.log('💾 [SEO Context] Preparando para salvar:', {
    existingDataKeys: Object.keys(existingData),
    seoIntelligentEnabled: seoIntelligent.enabled,
    aiKeywordsCount: seoIntelligent.ai_keywords.length
  });
  
  // Update landing page with timestamps
  const { data: updatedLP, error: updateError } = await supabase
    .from('landing_pages')
    .update({ 
      data: updatedData,
      updated_at: now,
      last_modified: now
    })
    .eq('id', payload.landingPageId)
    .select('data');
  
  if (updateError) {
    console.error('❌ [SEO Context] Erro ao salvar:', updateError);
    console.error('❌ [SEO Context] Detalhes do erro:', {
      message: updateError.message,
      details: updateError.details,
      hint: updateError.hint,
      code: updateError.code
    });
    throw new Error(`Falha ao salvar SEO Context: ${updateError.message}`);
  }
  
  console.log('✅ [SEO Context] Salvo com sucesso!', {
    landingPageId: payload.landingPageId,
    dataUpdated: !!updatedLP?.[0]?.data
  });
  
  return {
    id: `ctx_${Date.now()}`,
    landingPageId: payload.landingPageId,
    baseTextMarkdown: payload.baseTextMarkdown,
    aiKeywords: payload.aiKeywords,
    resolvedKeywords: payload.resolvedKeywords,
    createdAt: now,
    updatedAt: now,
    locale: payload.locale ?? 'pt_BR',
  };
}

/**
 * Retorna o SEO Context de uma landing page (de landing_pages.data.seo_intelligent)
 */
export async function getLatestSEOContext(landingPageId: string): Promise<SEOContext | null> {
  const { data, error } = await supabase
    .from('landing_pages')
    .select('data')
    .eq('id', landingPageId)
    .maybeSingle();
  
  const lpData = typeof data?.data === 'object' && data?.data !== null ? data.data as any : null;
  
  if (error || !lpData?.seo_intelligent) {
    console.log('ℹ️ Nenhum SEO Context encontrado para:', landingPageId);
    return null;
  }
  
  const seoInt = lpData.seo_intelligent;
  
  return {
    id: `ctx_${landingPageId}`,
    landingPageId,
    baseTextMarkdown: seoInt.base_text_markdown,
    aiKeywords: seoInt.ai_keywords,
    resolvedKeywords: seoInt.resolved_keywords,
    createdAt: seoInt.generated_at,
    updatedAt: seoInt.generated_at,
    locale: seoInt.locale as 'pt_BR',
  };
}

/**
 * Limpa o SEO Context de uma landing page
 */
export async function clearSEOContext(landingPageId: string): Promise<void> {
  const { data: currentLP, error: fetchError } = await supabase
    .from('landing_pages')
    .select('data')
    .eq('id', landingPageId)
    .single();
  
  if (fetchError) {
    console.error('❌ Erro ao buscar landing page:', fetchError);
    throw new Error(`Falha ao buscar landing page: ${fetchError.message}`);
  }
  
  // Remove seo_intelligent from data
  const existingData = (typeof currentLP?.data === 'object' && currentLP?.data !== null) ? currentLP.data : {};
  const updatedData = { ...existingData } as any;
  delete updatedData.seo_intelligent;
  
  const { error: updateError } = await supabase
    .from('landing_pages')
    .update({ data: updatedData })
    .eq('id', landingPageId);
  
  if (updateError) {
    console.error('❌ Erro ao limpar SEO Context:', updateError);
    throw new Error(`Falha ao limpar SEO Context: ${updateError.message}`);
  }
  
  console.log('✅ SEO Context limpo:', landingPageId);
}
