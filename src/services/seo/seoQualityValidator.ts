/**
 * SEO Quality Validator
 * Valida HTML gerado e retorna métricas de qualidade
 * ✅ APENAS LOGA - não bloqueia fluxo
 * ✅ FAIL-SAFE: Todo código em try/catch
 */

export interface SEOValidationResult {
  seoScore: number;
  geoScore: number;
  iaScore: number;
  performanceScore: number;
  overallScore: number;
  errors: string[];
  warnings: string[];
  info: string[];
  timestamp: string;
}

/**
 * Valida HTML gerado e retorna métricas de qualidade SEO/GEO/IA
 * @param html - HTML string para validar
 * @returns Resultado da validação com scores e mensagens
 */
export function validateGeneratedHTML(html: string): SEOValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];
  
  // ✅ Todo o código em try/catch - nunca falha o fluxo
  try {
    // ============ QA SEO ============
    let seoPoints = 10;
    
    if (!html.includes('<title>') || html.includes('>Nova Empresa<')) {
      errors.push('Title inválido ou genérico');
      seoPoints -= 2;
    }
    
    if (!html.includes('<meta name="description"')) {
      errors.push('Meta description ausente');
      seoPoints -= 1.5;
    }
    
    if (!html.includes('<link rel="canonical"')) {
      warnings.push('Canonical URL ausente');
      seoPoints -= 0.5;
    }
    
    if (!html.includes('alt="') && html.includes('<img')) {
      warnings.push('Imagens sem atributo alt');
      seoPoints -= 0.5;
    }
    
    // Verificar H1 único
    const h1Matches = html.match(/<h1[^>]*>/gi);
    if (!h1Matches || h1Matches.length === 0) {
      errors.push('H1 ausente');
      seoPoints -= 1;
    } else if (h1Matches.length > 1) {
      warnings.push(`Múltiplos H1 detectados (${h1Matches.length})`);
      seoPoints -= 0.5;
    }
    
    // ============ QA GEO ============
    let geoPoints = 10;
    
    if (!html.includes('"@type":"Organization"') && !html.includes('"@type": "Organization"') &&
        !html.includes('"@type":"LocalBusiness"') && !html.includes('"@type": "LocalBusiness"')) {
      errors.push('Schema Organization/LocalBusiness ausente');
      geoPoints -= 2;
    }
    
    if (!html.includes('class="geo-context"')) {
      warnings.push('Bloco GEO invisível ausente');
      geoPoints -= 1;
    }
    
    if (!html.includes('addressLocality') && !html.includes('addressRegion')) {
      info.push('Dados de localização incompletos');
      geoPoints -= 0.5;
    }
    
    // ============ QA IA-READINESS ============
    let iaPoints = 10;
    
    if (!html.includes('SpeakableSpecification')) {
      warnings.push('SpeakableSpecification ausente');
      iaPoints -= 1;
    }
    
    if (!html.includes('"about"')) {
      warnings.push('Campo about ausente nos schemas');
      iaPoints -= 0.5;
    }
    
    if (!html.includes('"mentions"')) {
      info.push('Campo mentions pode melhorar IA-readiness');
      iaPoints -= 0.25;
    }
    
    if (!html.includes('<article') && !html.includes('<main')) {
      warnings.push('Estrutura semântica HTML5 incompleta');
      iaPoints -= 0.5;
    }
    
    // Verificar data-semantic-enhanced
    if (html.includes('data-semantic-enhanced="true"')) {
      info.push('Estrutura semântica aplicada');
      iaPoints = Math.min(10, iaPoints + 0.5);
    }
    
    // ============ QA PERFORMANCE ============
    let perfPoints = 10;
    
    if (html.includes('data:image/')) {
      warnings.push('Imagem base64 detectada (hero deve ser arquivo real)');
      perfPoints -= 1;
    }
    
    if (!html.includes('font-display: swap') && !html.includes('font-display:swap')) {
      info.push('font-display: swap recomendado em fontes');
      perfPoints -= 0.25;
    }
    
    if (!html.includes('loading="lazy"') && html.includes('<img')) {
      info.push('Lazy loading recomendado em imagens');
      perfPoints -= 0.25;
    }
    
    // Tamanho do HTML
    const htmlSizeKB = new Blob([html]).size / 1024;
    if (htmlSizeKB > 500) {
      warnings.push(`HTML muito grande: ${htmlSizeKB.toFixed(1)}KB`);
      perfPoints -= 1;
    } else {
      info.push(`Tamanho HTML: ${htmlSizeKB.toFixed(1)}KB`);
    }
    
    // Calcular scores finais (mínimo 0, máximo 10)
    const seoScore = Math.max(0, Math.min(10, Math.round(seoPoints * 10) / 10));
    const geoScore = Math.max(0, Math.min(10, Math.round(geoPoints * 10) / 10));
    const iaScore = Math.max(0, Math.min(10, Math.round(iaPoints * 10) / 10));
    const performanceScore = Math.max(0, Math.min(10, Math.round(perfPoints * 10) / 10));
    
    // Média ponderada (SEO 30%, GEO 25%, IA 25%, Perf 20%)
    const overallScore = Math.round(
      (seoScore * 0.30 + geoScore * 0.25 + iaScore * 0.25 + performanceScore * 0.20) * 10
    ) / 10;
    
    const result: SEOValidationResult = {
      seoScore,
      geoScore,
      iaScore,
      performanceScore,
      overallScore,
      errors,
      warnings,
      info,
      timestamp: new Date().toISOString()
    };
    
    // ✅ Log formatado
    const getIcon = (score: number) => score >= 9 ? '✅' : score >= 7 ? '⚠️' : '❌';
    const getOverallIcon = (score: number) => score >= 9 ? '🎯' : score >= 7 ? '👍' : '⚠️';
    
    console.log(`
📊 [SEO QUALITY REPORT]
━━━━━━━━━━━━━━━━━━━━━━━━━
SEO:         ${seoScore}/10 ${getIcon(seoScore)}
GEO:         ${geoScore}/10 ${getIcon(geoScore)}
IA-Ready:    ${iaScore}/10 ${getIcon(iaScore)}
Performance: ${performanceScore}/10 ${getIcon(performanceScore)}
━━━━━━━━━━━━━━━━━━━━━━━━━
OVERALL:     ${overallScore}/10 ${getOverallIcon(overallScore)}
━━━━━━━━━━━━━━━━━━━━━━━━━
Errors:   ${errors.length}${errors.length > 0 ? ' - ' + errors.join(', ') : ''}
Warnings: ${warnings.length}${warnings.length > 0 ? ' - ' + warnings.join(', ') : ''}
Info:     ${info.length}
    `);
    
    return result;
    
  } catch (error) {
    console.error('[SEO Validator] Erro na validação:', error);
    return {
      seoScore: 0,
      geoScore: 0,
      iaScore: 0,
      performanceScore: 0,
      overallScore: 0,
      errors: ['Erro interno na validação'],
      warnings: [],
      info: [],
      timestamp: new Date().toISOString()
    };
  }
}
