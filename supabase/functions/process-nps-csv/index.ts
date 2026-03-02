import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
import { trackFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('📊 NPS Processing Function initialized');

interface NPSResponse {
  timestamp: string;
  email: string;
  ip: string;
  satisfaction: number; // 1-5 scale
  recommendation: number; // 0-10 scale (converted)
  training_quality: number; // 1-5 scale
  comments: string;
  country: string;
  themes: string[];
}

// Parser robusto para "X of 5" → número 1-5
function parseScore5(val: any): number {
  if (!val) return 0;
  const str = String(val).trim();
  
  // "5 of 5", "4 of 5", etc.
  const match = str.match(/(\d+)\s*(?:of|\/)\s*5/i);
  if (match) {
    const score = Number(match[1]);
    return (score >= 1 && score <= 5) ? score : 0;
  }
  
  // Número direto (1-5)
  const num = Number(str);
  return (num >= 1 && num <= 5) ? num : 0;
}

// Conversão EXATA para escala NPS 0-10
function convertScore5ToNPS(score5: number): number {
  const mapping: { [key: number]: number } = {
    5: 10, // 🟢 Promoter
    4: 9,  // 🟢 Promoter
    3: 8,  // 🟡 Passive
    2: 7,  // 🟡 Passive
    1: 6,  // 🔴 Detractor
  };
  return mapping[score5] || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get file data from request body
    const body = await req.json();
    const { fileData, fileName, user_id, userId } = body;
    const resolvedUserId = user_id || userId || null;
    if (!fileData) {
      throw new Error('No file data provided');
    }

    console.log(`Processing file: ${fileName}`);

    // Decode base64 to array buffer
    const binaryString = atob(fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let rawData: any[] = [];
    const isCSV = fileName.toLowerCase().endsWith('.csv');

    if (isCSV) {
      // Parse CSV manually for simplicity
      const csvText = new TextDecoder().decode(bytes);
      const lines = csvText.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Map CSV columns to expected format
      for (let i = 1; i < lines.length; i++) {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        
        // Parse CSV line respecting quotes
        for (const char of lines[i]) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim().replace(/^"|"$/g, ''));
        
        // Extract themes from column 2
        const themesStr = values[1] || '';
        const themes = themesStr.split(',').map(t => t.trim()).filter(Boolean);
        
        // Create row object
        const row: any = {
          'Email Address': values[0] || '',
          'Anonymized IP': '',
          'Como você avalia a qualidade do atendimento recebido?': values[2] || '',
          'Como você avalia a qualidade dos treinamentos oferecidos?': values[3] || '',
          'Em uma escala de 0 a 10, o quanto você recomendaria nossos cursos para um amigo ou colega?': values[4] || '',
          'Deixe seus comentários, sugestões ou elogios (opcional)': '',
          'Timestamp': new Date().toISOString(),
          'Country': 'Brasil',
        };
        
        // Add theme columns
        themes.forEach(theme => {
          row[theme] = true;
        });
        
        rawData.push(row);
      }
    } else {
      // Read XLSX file
      const workbook = XLSX.read(bytes, { type: 'array' });
      
      // Get second sheet (NPS Responses)
      const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      rawData = XLSX.utils.sheet_to_json(worksheet);
    }

    console.log(`Processing ${rawData.length} responses`);

    // Process and clean data
    const processedResponses: NPSResponse[] = [];
    const seenIPs = new Set<string>();

    for (const row of rawData as any[]) {
      const ip = row['Anonymized IP'] || '';
      const email = row['Email Address'] || '';
      
      // Deduplicate by IP
      const dedupeKey = `${ip}-${email}`;
      if (seenIPs.has(dedupeKey)) continue;
      seenIPs.add(dedupeKey);

      // Extract interest themes from multi-select columns
      const themes: string[] = [];
      const themeColumns = [
        'MEDIT ClinicCAD',
        'MEDIT Link',
        'MEDIT APPS',
        'PLANEJAMENTO 3D EXOCAD',
        'PROTOCOLOS IMPRESSOS',
        'CIRURGIA GUIADA',
        'IMPRESSÃO 3D',
        'APARELHOS ORTODÔNTICOS',
        'COROAS E FACETAS',
        'CARACTERIZAÇÃO',
        'ANÁLISE FACIAL',
      ];

      for (const col of themeColumns) {
        if (row[col]) {
          themes.push(col);
        }
      }
      
      const satisfaction5 = parseScore5(row['Como você avalia a qualidade do atendimento recebido?']);
      const trainingQuality5 = parseScore5(row['Como você avalia a qualidade dos treinamentos oferecidos?']);
      const recommendation5 = parseScore5(row['Em uma escala de 0 a 10, o quanto você recomendaria nossos cursos para um amigo ou colega?']);

      processedResponses.push({
        timestamp: row['Timestamp'] || new Date().toISOString(),
        email: '', // Remove email for privacy
        ip: ip,
        satisfaction: satisfaction5,                         // 1-5 (original)
        training_quality: trainingQuality5,                  // 1-5 (original)
        recommendation: convertScore5ToNPS(recommendation5), // 🎯 CONVERTIDO para 0-10!
        comments: row['Deixe seus comentários, sugestões ou elogios (opcional)'] || '',
        country: row['Country'] || 'Brasil',
        themes: themes,
      });
    }

    console.log(`Processed ${processedResponses.length} unique responses`);

    // Calculate aggregate metrics
    const totalResponses = processedResponses.length;
    const uniqueRespondents = processedResponses.length;

    // Médias (satisfação e treinamento em 1-5, recomendação em 0-10)
    const avgSatisfaction = totalResponses > 0
      ? processedResponses.reduce((sum, r) => sum + r.satisfaction, 0) / totalResponses
      : 0;

    const avgTrainingQuality = totalResponses > 0
      ? processedResponses.reduce((sum, r) => sum + r.training_quality, 0) / totalResponses
      : 0;

    const avgRecommendation = totalResponses > 0
      ? processedResponses.reduce((sum, r) => sum + r.recommendation, 0) / totalResponses
      : 0;

    // NPS com escala 0-10 (já convertida!)
    const promoters = processedResponses.filter(r => r.recommendation >= 9).length;
    const passives = processedResponses.filter(r => r.recommendation >= 7 && r.recommendation <= 8).length;
    const detractors = processedResponses.filter(r => r.recommendation <= 6).length;

    const npsScore = totalResponses > 0
      ? Math.round(((promoters - detractors) / totalResponses) * 100)
      : 0;

    // Analyze interest themes
    const themeCounts: Record<string, number> = {};
    for (const response of processedResponses) {
      for (const theme of response.themes) {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      }
    }

    const interestThemes: Record<string, { count: number; percentage: number }> = {};
    for (const [theme, count] of Object.entries(themeCounts)) {
      interestThemes[theme] = {
        count,
        percentage: Math.round((count / totalResponses) * 100),
      };
    }

    // Identify theme correlations
    const themeCorrelations: Record<string, string[]> = {};
    for (const response of processedResponses) {
      if (response.themes.length >= 2) {
        for (let i = 0; i < response.themes.length; i++) {
          for (let j = i + 1; j < response.themes.length; j++) {
            const key = [response.themes[i], response.themes[j]].sort().join(' + ');
            themeCorrelations[key] = [response.themes[i], response.themes[j]];
          }
        }
      }
    }

    // Generate AI insights
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const aiPrompt = `Analise estes dados de NPS de uma empresa de treinamentos odontológicos:

MÉTRICAS:
- Total de respostas: ${totalResponses}
- Satisfação média: ${avgSatisfaction.toFixed(1)}/5
- Qualidade dos treinamentos: ${avgTrainingQuality.toFixed(1)}/5
- Recomendação média (NPS): ${avgRecommendation.toFixed(1)}/10
- NPS Score: ${npsScore}

TEMAS DE MAIOR INTERESSE (Produtos & Cursos):
${Object.entries(interestThemes)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 8)
  .map(([theme, data]) => `- ${theme}: ${data.count} interessados (${data.percentage}%)`)
  .join('\n')}

COMENTÁRIOS DOS CLIENTES:
${processedResponses.filter(r => r.comments).slice(0, 20).map(r => `"${r.comments}"`).join('\n')}

⚠️ IMPORTANTE: Os "temas" acima representam produtos e cursos que os clientes MAIS QUEREM comprar/aprender.
São tendências de demanda do mercado odontológico.

Gere um JSON com:
1. common_themes: Array de 3-5 frases curtas descrevendo padrões de demanda de produtos/cursos
2. top_keywords: Array de 8-12 keywords long-tail SEO-validadas para landing pages (ex: "protocolo impresso passo a passo")
3. content_opportunities: Array de 5-7 sugestões de conteúdo (blogs, LPs) baseadas na demanda
4. product_correlations: Array de pares de temas que aparecem juntos (ex: "Clientes interessados em X também buscam Y")

Retorne APENAS o JSON, sem markdown.`;

    let insights = {
      common_themes: [],
      top_keywords: [],
      content_opportunities: [],
      product_correlations: [],
    };

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você é um especialista em SEO e análise de mercado odontológico.' },
              { role: 'user', content: aiPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          await trackFromResponse(aiData, 'process-nps-csv', 'NPS Insights');
          const content = aiData.choices[0].message.content;
          try {
            insights = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
            console.log('✅ AI insights generated successfully');
          } catch (e) {
            console.warn('⚠️ Failed to parse AI response, using empty insights:', e);
          }
        } else {
          console.warn(`⚠️ AI API returned error: ${aiResponse.status}`);
        }
      } catch (error) {
        console.warn('⚠️ Failed to generate AI insights, continuing without them:', error);
      }
    } else {
      console.warn('⚠️ LOVABLE_API_KEY not found, skipping AI insights generation');
    }

    // Save to company_profile.nps_metrics
    const npsMetrics = {
      enabled: true,
      aggregate_rating: parseFloat(avgSatisfaction.toFixed(1)),
      total_responses: totalResponses,
      unique_respondents: uniqueRespondents,
      satisfaction_score: parseFloat(avgSatisfaction.toFixed(1)),
      recommendation_score: parseFloat(avgRecommendation.toFixed(1)),
      training_quality_score: parseFloat(avgTrainingQuality.toFixed(1)),
      nps_score: npsScore,
      promoters_percentage: Math.round((promoters / totalResponses) * 100),
      passives_percentage: Math.round((passives / totalResponses) * 100),
      detractors_percentage: Math.round((detractors / totalResponses) * 100),
      interest_themes: interestThemes,
      insights: insights,
      last_updated: new Date().toISOString(),
    };

    let updateQuery = supabase
      .from('company_profile')
      .update({ nps_metrics: npsMetrics });

    if (resolvedUserId) {
      updateQuery = updateQuery.eq('user_id', resolvedUserId);
    } else {
      updateQuery = updateQuery.eq('id', '00000000-0000-0000-0000-000000000001');
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error('Error updating company profile:', updateError);
      throw updateError;
    }

    console.log('✅ NPS metrics saved successfully');

    return new Response(JSON.stringify({ 
      success: true,
      metrics: npsMetrics,
      message: `Processadas ${totalResponses} respostas NPS com sucesso!`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error processing NPS CSV:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
