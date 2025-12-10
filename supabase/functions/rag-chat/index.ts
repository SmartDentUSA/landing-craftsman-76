import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface RetrievedChunk {
  id: string;
  product_id: string;
  product_name: string;
  chunk_type: string;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}

// Gerar embedding usando Lovable AI (Gemini)
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-004',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding API error: ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Buscar chunks similares no banco
async function searchSimilarChunks(
  supabase: any, 
  queryEmbedding: number[], 
  options: {
    matchThreshold?: number;
    matchCount?: number;
    filterChunkType?: string;
    filterProductId?: string;
  } = {}
): Promise<RetrievedChunk[]> {
  const { 
    matchThreshold = 0.6, 
    matchCount = 8,
    filterChunkType = null,
    filterProductId = null
  } = options;

  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_chunk_type: filterChunkType,
    filter_product_id: filterProductId
  });

  if (error) {
    console.error('Search error:', error);
    throw error;
  }

  return data || [];
}

// Construir prompt do sistema com regras anti-alucinação
function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  // Extrair regras anti-alucinação dos chunks recuperados
  const antiHallucinationChunks = chunks.filter(c => c.chunk_type === 'anti_hallucination');
  const safetyRules = antiHallucinationChunks.map(c => c.content).join('\n\n');

  return `Você é um especialista em vendas e suporte técnico da Smart Dent, uma empresa líder em soluções odontológicas digitais.

## DIRETRIZES FUNDAMENTAIS:

1. **RESPONDA APENAS COM BASE NO CONTEXTO FORNECIDO**
   - Use EXCLUSIVAMENTE as informações dos chunks recuperados
   - Se a informação não estiver no contexto, diga "Não tenho essa informação específica, mas posso ajudar de outra forma"
   - NUNCA invente especificações, preços ou características

2. **REGRAS DE SEGURANÇA (ANTI-ALUCINAÇÃO)**
${safetyRules || '   - Siga rigorosamente as especificações técnicas fornecidas'}

3. **ESTILO DE COMUNICAÇÃO**
   - Seja profissional, empático e consultivo
   - Use linguagem técnica quando apropriado, mas explique termos complexos
   - Foque em resolver o problema/dúvida do cliente
   - Sugira produtos complementares quando relevante (cross-sell)

4. **FORMATO DAS RESPOSTAS**
   - Seja conciso mas completo
   - Use bullet points para listas de especificações
   - Destaque preços e disponibilidade quando relevantes
   - Inclua CTAs suaves quando apropriado

5. **QUANDO NÃO SOUBER**
   - Admita limitações honestamente
   - Sugira entrar em contato com a equipe comercial
   - Ofereça alternativas dentro do seu conhecimento`;
}

// Construir contexto a partir dos chunks recuperados
function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'Nenhuma informação relevante encontrada na base de conhecimento.';
  }

  // Agrupar por produto para melhor organização
  const byProduct = chunks.reduce((acc, chunk) => {
    const key = chunk.product_name || 'Geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(chunk);
    return acc;
  }, {} as Record<string, RetrievedChunk[]>);

  let context = '## CONTEXTO RECUPERADO DA BASE DE CONHECIMENTO:\n\n';

  for (const [productName, productChunks] of Object.entries(byProduct)) {
    context += `### ${productName}\n`;
    for (const chunk of productChunks) {
      context += `[${chunk.chunk_type.toUpperCase()}] (relevância: ${(chunk.similarity * 100).toFixed(1)}%)\n`;
      context += `${chunk.content}\n\n`;
    }
  }

  return context;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      query, 
      messages = [], 
      stream = true,
      match_threshold = 0.6,
      match_count = 8
    } = await req.json();

    if (!query && messages.length === 0) {
      throw new Error('Query or messages required');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('🔍 RAG Chat query:', query || messages[messages.length - 1]?.content);

    // Criar cliente Supabase
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 1. Gerar embedding da pergunta
    const userQuery = query || messages[messages.length - 1]?.content || '';
    console.log('📊 Generating query embedding...');
    const queryEmbedding = await generateEmbedding(userQuery);

    // 2. Buscar chunks similares
    console.log('🔎 Searching similar chunks...');
    const retrievedChunks = await searchSimilarChunks(supabase, queryEmbedding, {
      matchThreshold: match_threshold,
      matchCount: match_count
    });

    console.log(`📚 Retrieved ${retrievedChunks.length} relevant chunks`);

    // 3. Construir prompts
    const systemPrompt = buildSystemPrompt(retrievedChunks);
    const context = buildContext(retrievedChunks);

    // 4. Montar mensagens para o LLM
    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10), // Últimas 10 mensagens do histórico
      { 
        role: 'user', 
        content: `${context}\n\n---\n\n**PERGUNTA DO CLIENTE:**\n${userQuery}` 
      }
    ];

    // 5. Chamar Lovable AI (Gemini) 
    console.log('🤖 Calling LLM...');
    
    if (stream) {
      // Streaming response
      const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: llmMessages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
      }

      // Retornar stream com metadados
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      const transformStream = new TransformStream({
        start(controller) {
          // Enviar metadados primeiro
          const metadata = JSON.stringify({
            type: 'metadata',
            retrieved_chunks: retrievedChunks.map(c => ({
              product_name: c.product_name,
              chunk_type: c.chunk_type,
              similarity: c.similarity
            }))
          });
          controller.enqueue(encoder.encode(`data: ${metadata}\n\n`));
        },
        async transform(chunk, controller) {
          controller.enqueue(chunk);
        }
      });

      return new Response(
        response.body?.pipeThrough(transformStream),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          } 
        }
      );
    } else {
      // Non-streaming response
      const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: llmMessages,
          stream: false,
          max_tokens: 2048,
          temperature: 0.7
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error: ${error}`);
      }

      const llmData = await response.json();
      const assistantMessage = llmData.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

      return new Response(
        JSON.stringify({
          success: true,
          response: assistantMessage,
          sources: retrievedChunks.map(c => ({
            product_id: c.product_id,
            product_name: c.product_name,
            chunk_type: c.chunk_type,
            similarity: c.similarity,
            excerpt: c.content.substring(0, 200) + '...'
          })),
          metadata: {
            chunks_retrieved: retrievedChunks.length,
            model: 'gemini-2.0-flash',
            threshold: match_threshold
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ RAG Chat error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
