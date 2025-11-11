import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";
import * as XLSX from "https://deno.land/x/sheetjs@0.18.3/xlsx.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NPSResponse {
  timestamp: string;
  email: string;
  ip: string;
  satisfaction: number; // Q1
  recommendation: number; // Q2
  training_quality: number; // Q3
  comments: string; // Q4
  country: string;
  themes: string[]; // Interest themes
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get file data from request body
    const body = await req.json();
    const { fileData, fileName } = body;
    
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

    // Read XLSX file
    const workbook = XLSX.read(bytes, { type: 'array' });
    
    // Get second sheet (NPS Responses)
    const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

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

      // Parse scores (convert "X of 5" to numbers)
      const parseSatisfaction = (val: string): number => {
        if (!val) return 0;
        const match = val.match(/(\d+)\s*of\s*5/i);
        return match ? parseInt(match[1]) : 0;
      };

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

      processedResponses.push({
        timestamp: row['Timestamp'] || new Date().toISOString(),
        email: '', // Remove email for privacy
        ip: ip,
        satisfaction: parseSatisfaction(row['Como você avalia a qualidade do atendimento recebido?']),
        recommendation: parseSatisfaction(row['Em uma escala de 0 a 10, o quanto você recomendaria nossos cursos para um amigo ou colega?']),
        training_quality: parseSatisfaction(row['Como você avalia a qualidade dos treinamentos oferecidos?']),
        comments: row['Deixe seus comentários, sugestões ou elogios (opcional)'] || '',
        country: row['Country'] || 'Brasil',
        themes: themes,
      });
    }

    console.log(`Processed ${processedResponses.length} unique responses`);

    // Calculate aggregate metrics
    const totalResponses = processedResponses.length;
    const uniqueRespondents = processedResponses.length;

    const avgSatisfaction = processedResponses.reduce((sum, r) => sum + r.satisfaction, 0) / totalResponses;
    const avgRecommendation = processedResponses.reduce((sum, r) => sum + r.recommendation, 0) / totalResponses;
    const avgTrainingQuality = processedResponses.reduce((sum, r) => sum + r.training_quality, 0) / totalResponses;

    // Calculate NPS (recommendation 0-10 scale, but we have 1-5)
    // Convert 1-5 to 0-10 scale: (score - 1) * 2.5
    const npsScores = processedResponses.map(r => (r.recommendation - 1) * 2.5);
    const promoters = npsScores.filter(s => s >= 9).length;
    const passives = npsScores.filter(s => s >= 7 && s < 9).length;
    const detractors = npsScores.filter(s => s < 7).length;
    const npsScore = Math.round(((promoters - detractors) / totalResponses) * 100);

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
    const aiPrompt = `Analise estes dados de NPS de uma empresa de treinamentos odontológicos:

MÉTRICAS:
- Total de respostas: ${totalResponses}
- Satisfação média: ${avgSatisfaction.toFixed(1)}/5
- Qualidade dos treinamentos: ${avgTrainingQuality.toFixed(1)}/5
- Recomendação média: ${avgRecommendation.toFixed(1)}/5
- NPS Score: ${npsScore}

TEMAS MAIS DEMANDADOS:
${Object.entries(interestThemes)
  .sort((a, b) => b[1].count - a[1].count)
  .slice(0, 8)
  .map(([theme, data]) => `- ${theme}: ${data.count} (${data.percentage}%)`)
  .join('\n')}

COMENTÁRIOS DOS CLIENTES:
${processedResponses.filter(r => r.comments).slice(0, 20).map(r => `"${r.comments}"`).join('\n')}

Gere um JSON com:
1. common_themes: Array de 3-5 frases curtas descrevendo padrões de demanda
2. top_keywords: Array de 8-12 keywords long-tail SEO-validadas (ex: "protocolo impresso passo a passo")
3. content_opportunities: Array de 5-7 sugestões de conteúdo (blogs, landing pages)
4. product_correlations: Array de pares de temas que aparecem juntos frequentemente

Retorne APENAS o JSON, sem markdown.`;

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

    let insights = {
      common_themes: [],
      top_keywords: [],
      content_opportunities: [],
      product_correlations: [],
    };

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices[0].message.content;
      try {
        insights = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, ''));
      } catch (e) {
        console.error('Failed to parse AI response:', e);
      }
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

    const { error: updateError } = await supabase
      .from('company_profile')
      .update({ nps_metrics: npsMetrics })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (updateError) {
      console.error('Error updating company profile:', updateError);
      throw updateError;
    }

    console.log('NPS metrics saved successfully');

    return new Response(JSON.stringify({ 
      success: true,
      metrics: npsMetrics,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing NPS CSV:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
