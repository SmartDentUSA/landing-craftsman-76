import { supabase } from "@/integrations/supabase/client";

/**
 * Migrate SEO hidden content from approved_reviews to company_profile
 * This script helps move existing SEO data to the new transparent structure
 */
export async function migrateSEOData() {
  try {
    console.log('🔄 Starting SEO data migration...');
    
    // 1. Get existing contextual SEO info from approved_reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('approved_reviews')
      .select('contextual_seo_info')
      .not('contextual_seo_info', 'is', null);
    
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return { success: false, error: reviewsError.message };
    }
    
    // 2. Get existing company profile
    const { data: companyProfile, error: profileError } = await supabase
      .from('company_profile')
      .select('*')
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching company profile:', profileError);
      return { success: false, error: profileError.message };
    }
    
    // 3. Analyze and migrate contextual SEO info
    const seoContents = reviews
      ?.map(r => r.contextual_seo_info)
      .filter(Boolean) || [];
    
    if (seoContents.length === 0) {
      console.log('✅ No contextual SEO info found to migrate');
      return { success: true, message: 'No data to migrate' };
    }
    
    // Extract keywords and context from existing content
    const extractedKeywords = extractKeywordsFromContent(seoContents);
    const extractedPositioning = extractPositioningFromContent(seoContents);
    const extractedAdvantages = extractAdvantagesFromContent(seoContents);
    const extractedExpertise = extractExpertiseFromContent(seoContents);
    const extractedServiceAreas = extractServiceAreasFromContent(seoContents);
    
    // 4. Update company profile with extracted data
    const updates = {
      seo_context_keywords: extractedKeywords,
      seo_market_positioning: extractedPositioning,
      seo_competitive_advantages: extractedAdvantages,
      seo_technical_expertise: extractedExpertise,
      seo_service_areas: extractedServiceAreas
    };
    
    let updateError;
    if (companyProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('company_profile')
        .update(updates)
        .eq('id', companyProfile.id);
      updateError = error;
    } else {
      // Create new profile with minimum required fields
      const { error } = await supabase
        .from('company_profile')
        .insert({
          company_name: 'Nossa Empresa',
          user_id: 'migration-user', // This should be replaced with actual user ID
          ...updates
        });
      updateError = error;
    }
    
    if (updateError) {
      console.error('Error updating company profile:', updateError);
      return { success: false, error: updateError.message };
    }
    
    console.log('✅ SEO data migration completed successfully');
    console.log('📊 Migrated data:', {
      keywords: extractedKeywords.length,
      positioning: extractedPositioning ? 'Yes' : 'No',
      advantages: extractedAdvantages ? 'Yes' : 'No',
      expertise: extractedExpertise ? 'Yes' : 'No',
      serviceAreas: extractedServiceAreas ? 'Yes' : 'No'
    });
    
    return { 
      success: true, 
      message: 'SEO data migrated successfully',
      migrated: updates
    };
    
  } catch (error) {
    console.error('Migration error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function extractKeywordsFromContent(contents: string[]): string[] {
  const keywords = new Set<string>();
  
  contents.forEach(content => {
    // Look for keyword patterns in content
    const keywordMatches = content.match(/\b\w+(?:\s+\w+){0,2}\b/g) || [];
    keywordMatches
      .filter(keyword => keyword.length > 3 && keyword.length < 50)
      .forEach(keyword => keywords.add(keyword.toLowerCase().trim()));
  });
  
  return Array.from(keywords).slice(0, 20); // Limit to 20 keywords
}

function extractPositioningFromContent(contents: string[]): string {
  const positioningIndicators = [
    'líder', 'referência', 'especialista', 'pioneiro', 'inovador',
    'primeiro', 'melhor', 'único', 'exclusivo', 'premium'
  ];
  
  for (const content of contents) {
    for (const indicator of positioningIndicators) {
      if (content.toLowerCase().includes(indicator)) {
        // Extract sentence containing positioning indicator
        const sentences = content.split('.').filter(s => s.trim().length > 10);
        const positioningSentence = sentences.find(s => 
          s.toLowerCase().includes(indicator)
        );
        if (positioningSentence) {
          return positioningSentence.trim();
        }
      }
    }
  }
  
  return '';
}

function extractAdvantagesFromContent(contents: string[]): string {
  const advantageIndicators = [
    'vantagem', 'diferencial', 'benefício', 'exclusivo',
    'único', 'melhor', 'superior', 'garantia', 'qualidade'
  ];
  
  const advantages: string[] = [];
  
  contents.forEach(content => {
    advantageIndicators.forEach(indicator => {
      if (content.toLowerCase().includes(indicator)) {
        const sentences = content.split('.').filter(s => s.trim().length > 10);
        const advantageSentence = sentences.find(s => 
          s.toLowerCase().includes(indicator)
        );
        if (advantageSentence && !advantages.includes(advantageSentence.trim())) {
          advantages.push(advantageSentence.trim());
        }
      }
    });
  });
  
  return advantages.join('. ');
}

function extractExpertiseFromContent(contents: string[]): string {
  const expertiseIndicators = [
    'especialista', 'especialização', 'expertise', 'conhecimento',
    'técnico', 'profissional', 'certificado', 'qualificado'
  ];
  
  for (const content of contents) {
    for (const indicator of expertiseIndicators) {
      if (content.toLowerCase().includes(indicator)) {
        const sentences = content.split('.').filter(s => s.trim().length > 10);
        const expertiseSentence = sentences.find(s => 
          s.toLowerCase().includes(indicator)
        );
        if (expertiseSentence) {
          return expertiseSentence.trim();
        }
      }
    }
  }
  
  return '';
}

function extractServiceAreasFromContent(contents: string[]): string {
  const areaIndicators = [
    'atendemos', 'atuamos', 'cobertura', 'região', 'brasil',
    'nacional', 'local', 'presencial', 'remoto', 'online'
  ];
  
  for (const content of contents) {
    for (const indicator of areaIndicators) {
      if (content.toLowerCase().includes(indicator)) {
        const sentences = content.split('.').filter(s => s.trim().length > 10);
        const areaSentence = sentences.find(s => 
          s.toLowerCase().includes(indicator)
        );
        if (areaSentence) {
          return areaSentence.trim();
        }
      }
    }
  }
  
  return '';
}