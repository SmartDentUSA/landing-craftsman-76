/**
 * Video Captions Processor
 * 
 * Funções para extrair insights de legendas de vídeos (video_captions)
 * e enriquecer conteúdo SEO com citações, keywords e contexto de especialistas.
 */

interface VideoCaptions {
  youtube_videos?: Array<{ captions?: string; analysis?: any; url?: string }>;
  instagram_videos?: Array<{ captions?: string; analysis?: any; url?: string }>;
  testimonial_videos?: Array<{ captions?: string; analysis?: any; url?: string }>;
  technical_videos?: Array<{ captions?: string; analysis?: any; url?: string }>;
  tiktok_videos?: Array<{ captions?: string; analysis?: any; url?: string }>;
}

/**
 * Extrai trechos relevantes de legendas para enriquecer blogs
 * 
 * @param videoCaptions - Objeto com legendas de diferentes tipos de vídeos
 * @param blogType - Tipo de blog ('commercial' ou 'technical')
 * @returns String formatada com trechos relevantes de legendas
 */
export function extractVideoCaptionsForBlog(
  videoCaptions: VideoCaptions | null | undefined,
  blogType: 'commercial' | 'technical'
): string {
  if (!videoCaptions || typeof videoCaptions !== 'object') {
    return '';
  }

  const excerpts: string[] = [];
  const maxExcerptLength = 500; // Máximo de caracteres por trecho
  
  // Priorizar tipos de vídeos baseado no tipo de blog
  const videoTypes = blogType === 'commercial' 
    ? ['testimonial_videos', 'youtube_videos', 'instagram_videos', 'technical_videos', 'tiktok_videos']
    : ['technical_videos', 'youtube_videos', 'testimonial_videos', 'instagram_videos', 'tiktok_videos'];

  for (const videoType of videoTypes) {
    const videos = videoCaptions[videoType as keyof VideoCaptions];
    if (!Array.isArray(videos)) continue;

    for (const video of videos) {
      const normalized = normalizeVideoCaption(video);
      if (!normalized.captions || typeof normalized.captions !== 'string') continue;
      
      // Limpar e truncar legenda se necessário
      let caption = normalized.captions.trim();
      if (caption.length > maxExcerptLength) {
        caption = caption.substring(0, maxExcerptLength) + '...';
      }
      
      // Adicionar contexto do tipo de vídeo
      const typeLabel = videoType.replace('_videos', '').replace('_', ' ');
      excerpts.push(`[${typeLabel}]: "${caption}"`);
      
      // Limitar a 5 trechos totais para não sobrecarregar o prompt
      if (excerpts.length >= 5) break;
    }
    
    if (excerpts.length >= 5) break;
  }

  if (excerpts.length === 0) {
    return '';
  }

  return `\n\nTRECHOS DE VÍDEOS E DEPOIMENTOS:
${excerpts.join('\n\n')}

(Use estes trechos autênticos para enriquecer o conteúdo com citações reais e contexto de especialistas)`;
}

/**
 * Extrai keywords únicas de todas as legendas de vídeos
 * 
 * @param videoCaptions - Objeto com legendas de diferentes tipos de vídeos
 * @returns Array de keywords únicas extraídas das legendas
 */
export function extractKeywordsFromVideoCaptions(
  videoCaptions: VideoCaptions | null | undefined
): string[] {
  if (!videoCaptions || typeof videoCaptions !== 'object') {
    return [];
  }

  const allKeywords = new Set<string>();
  const videoTypes: (keyof VideoCaptions)[] = [
    'youtube_videos',
    'instagram_videos', 
    'testimonial_videos',
    'technical_videos',
    'tiktok_videos'
  ];

  for (const videoType of videoTypes) {
    const videos = videoCaptions[videoType];
    if (!Array.isArray(videos)) continue;

    for (const video of videos) {
      const normalized = normalizeVideoCaption(video);
      
      // Extrair de captions
      if (normalized.captions && typeof normalized.captions === 'string') {
        extractWordsFromText(normalized.captions).forEach(word => allKeywords.add(word));
      }
      
      // Extrair de analysis se disponível
      if (normalized.analysis && typeof normalized.analysis === 'object') {
        const analysis = normalized.analysis as any;
        
        // Palavras-chave da análise
        if (Array.isArray(analysis.keywords)) {
          analysis.keywords.forEach((kw: string) => allKeywords.add(kw.toLowerCase()));
        }
        
        // Termos técnicos
        if (Array.isArray(analysis.technical_terms)) {
          analysis.technical_terms.forEach((term: string) => allKeywords.add(term.toLowerCase()));
        }
        
        // Tópicos principais
        if (Array.isArray(analysis.main_topics)) {
          analysis.main_topics.forEach((topic: string) => allKeywords.add(topic.toLowerCase()));
        }
      }
    }
  }

  // Filtrar keywords muito curtas ou comuns
  const filtered = Array.from(allKeywords).filter(kw => {
    return kw.length >= 4 && !isCommonWord(kw);
  });

  return filtered.slice(0, 30); // Limitar a 30 keywords mais relevantes
}

/**
 * Identifica citações impactantes de KOLs e depoimentos
 * 
 * @param videoCaptions - Objeto com legendas de diferentes tipos de vídeos
 * @returns Array de objetos com citação e fonte
 */
export function extractQuotesFromCaptions(
  videoCaptions: VideoCaptions | null | undefined
): Array<{ quote: string; source: string }> {
  if (!videoCaptions || typeof videoCaptions !== 'object') {
    return [];
  }

  const quotes: Array<{ quote: string; source: string }> = [];
  
  // Priorizar depoimentos e vídeos do YouTube (geralmente têm conteúdo mais rico)
  const priorityTypes: (keyof VideoCaptions)[] = [
    'testimonial_videos',
    'youtube_videos',
    'technical_videos'
  ];

  for (const videoType of priorityTypes) {
    const videos = videoCaptions[videoType];
    if (!Array.isArray(videos)) continue;

    for (const video of videos) {
      const normalized = normalizeVideoCaption(video);
      if (!normalized.captions || typeof normalized.captions !== 'string') continue;
      
      const caption = normalized.captions.trim();
      
      // Procurar frases com sentimento positivo ou impacto
      const impactfulPhrases = extractImpactfulPhrases(caption);
      
      for (const phrase of impactfulPhrases) {
        quotes.push({
          quote: phrase,
          source: videoType.replace('_videos', '').replace('_', ' ')
        });
        
        // Limitar a 3 citações por tipo de vídeo
        if (quotes.length >= 3) break;
      }
      
      if (quotes.length >= 10) break; // Limitar total de citações
    }
    
    if (quotes.length >= 10) break;
  }

  return quotes;
}

// ===== Helper Functions =====

/**
 * Extrai palavras relevantes de um texto (mínimo 4 caracteres)
 */
function extractWordsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  // Remove pontuação e divide em palavras
  const words = text
    .toLowerCase()
    .replace(/[^\w\sáàâãéêíóôõúç]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 4);
  
  return words;
}

/**
 * Verifica se é uma palavra comum (stop words em português)
 */
function isCommonWord(word: string): boolean {
  const stopWords = [
    'para', 'com', 'este', 'esta', 'esse', 'essa', 'aquele', 'aquela',
    'mais', 'muito', 'muita', 'menos', 'como', 'quando', 'onde', 'qual',
    'quais', 'quem', 'sobre', 'pela', 'pelo', 'pelos', 'pelas', 'uma',
    'outro', 'outra', 'outros', 'outras', 'mesmo', 'mesma', 'mesmos', 'mesmas',
    'também', 'ainda', 'apenas', 'sempre', 'nunca', 'cada', 'todo', 'toda',
    'todos', 'todas', 'após', 'antes', 'durante', 'depois', 'entre', 'desde'
  ];
  
  return stopWords.includes(word.toLowerCase());
}

/**
 * Extrai frases impactantes de um texto (com sentimento positivo ou técnico)
 */
function extractImpactfulPhrases(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  const phrases: string[] = [];
  
  // Divide em frases por pontuação
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  
  // Palavras-chave que indicam impacto/benefício
  const impactKeywords = [
    'resultado', 'melhor', 'excelente', 'incrível', 'transformou', 'revolucionou',
    'eficiente', 'rápido', 'preciso', 'qualidade', 'profissional', 'recomendo',
    'impressionante', 'satisfeito', 'superou', 'expectativa', 'diferença', 'sucesso'
  ];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    // Verifica se contém palavras de impacto
    const hasImpact = impactKeywords.some(keyword => lowerSentence.includes(keyword));
    
    if (hasImpact && sentence.length <= 200) {
      phrases.push(sentence);
      if (phrases.length >= 5) break;
    }
  }
  
  return phrases;
}

/**
 * Verifica se há legendas disponíveis
 */
export function hasCaptions(videoCaptions: VideoCaptions | null | undefined): boolean {
  if (!videoCaptions || typeof videoCaptions !== 'object') {
    return false;
  }

  const videoTypes: (keyof VideoCaptions)[] = [
    'youtube_videos',
    'instagram_videos',
    'testimonial_videos',
    'technical_videos',
    'tiktok_videos'
  ];

  for (const videoType of videoTypes) {
    const videos = videoCaptions[videoType];
    if (Array.isArray(videos) && videos.length > 0) {
      const hasCaption = videos.some(v => {
        const normalized = normalizeVideoCaption(v);
        return normalized.captions && typeof normalized.captions === 'string' && normalized.captions.trim().length > 0;
      });
      if (hasCaption) return true;
    }
  }

  return false;
}

/**
 * Normaliza estrutura de dados para compatibilidade retroativa
 * Suporta tanto "caption" (antigo) quanto "captions" (novo)
 */
function normalizeVideoCaption(video: any): { captions?: string; analysis?: any } {
  return {
    captions: video.captions || video.caption,
    analysis: video.analysis || video.ai_analysis
  };
}
