import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { trackAIUsage, extractUsageFromResponse } from '../_shared/track-ai-usage.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const AI_GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const LLM_MODEL = 'google/gemini-2.5-flash';
const SESSION_TIMEOUT_HOURS = 2;

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

// ─── LEAD MANAGEMENT ───

async function findOrCreateLead(
  supabase: any,
  identifier: { phone?: string; email?: string; name?: string }
): Promise<any> {
  const { phone, email } = identifier;
  if (!phone && !email) return null;

  // Try to find existing lead
  let query = supabase.from('lia_leads').select('*');
  if (phone) query = query.eq('phone', phone);
  else if (email) query = query.eq('email', email);

  const { data: existing } = await query.limit(1).single();
  if (existing) {
    // Update last_seen
    await supabase.from('lia_leads').update({ last_seen_at: new Date().toISOString() }).eq('id', existing.id);
    return existing;
  }

  // Create new lead
  const { data: newLead, error } = await supabase.from('lia_leads').insert({
    phone: phone || null,
    email: email || null,
    name: identifier.name || null,
  }).select().single();

  if (error) {
    console.error('Error creating lead:', error);
    return null;
  }

  return newLead;
}

// ─── SESSION MANAGEMENT ───

async function findOrCreateConversation(
  supabase: any,
  leadId: string,
  channel: string = 'web'
): Promise<any> {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_HOURS * 60 * 60 * 1000).toISOString();

  // Find active conversation (updated within timeout window)
  const { data: active } = await supabase
    .from('lia_conversations')
    .select('*')
    .eq('lead_id', leadId)
    .is('ended_at', null)
    .gte('updated_at', cutoff)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (active) return active;

  // Close any stale open conversations
  await supabase
    .from('lia_conversations')
    .update({ ended_at: new Date().toISOString(), outcome: 'timeout' })
    .eq('lead_id', leadId)
    .is('ended_at', null)
    .lt('updated_at', cutoff);

  // Create new conversation
  const { data: newConv, error } = await supabase
    .from('lia_conversations')
    .insert({ lead_id: leadId, channel })
    .select()
    .single();

  if (error) {
    console.error('Error creating conversation:', error);
    return null;
  }

  // Increment total_conversations on lead
  await supabase.rpc('', {}).catch(() => {}); // fallback: manual increment
  await supabase
    .from('lia_leads')
    .update({ total_conversations: (await supabase.from('lia_leads').select('total_conversations').eq('id', leadId).single()).data?.total_conversations + 1 || 1 })
    .eq('id', leadId);

  return newConv;
}

// ─── LONGITUDINAL MEMORY ───

async function loadLongitudinalMemory(
  supabase: any,
  leadId: string
): Promise<string> {
  // Load last 5 conversations with summaries
  const { data: pastConversations } = await supabase
    .from('lia_conversations')
    .select('started_at, ended_at, current_state, outcome, extracted_entities, cognitive_analysis, message_count')
    .eq('lead_id', leadId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(5);

  // Load last 10 events
  const { data: events } = await supabase
    .from('lia_lead_events')
    .select('event_type, event_data, source, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Load lead profile
  const { data: lead } = await supabase
    .from('lia_leads')
    .select('name, company_name, role, total_conversations, lead_score, tags, profile_summary, first_seen_at')
    .eq('id', leadId)
    .single();

  if (!lead) return '';

  let memory = '## MEMÓRIA LONGITUDINAL DO LEAD:\n\n';

  // Profile
  memory += `**Perfil:** ${lead.name || 'Não identificado'}`;
  if (lead.company_name) memory += ` | ${lead.company_name}`;
  if (lead.role) memory += ` | ${lead.role}`;
  memory += `\n**Primeira interação:** ${new Date(lead.first_seen_at).toLocaleDateString('pt-BR')}`;
  memory += `\n**Total de conversas:** ${lead.total_conversations}`;
  memory += `\n**Lead Score:** ${lead.lead_score}/100`;
  if (lead.profile_summary) memory += `\n**Resumo:** ${lead.profile_summary}`;
  if (lead.tags && lead.tags.length > 0) memory += `\n**Tags:** ${JSON.stringify(lead.tags)}`;
  memory += '\n\n';

  // Past conversations
  if (pastConversations && pastConversations.length > 0) {
    memory += '### Conversas Anteriores:\n';
    for (const conv of pastConversations) {
      const date = new Date(conv.started_at).toLocaleDateString('pt-BR');
      memory += `- **${date}** — Estado final: ${conv.current_state} | Resultado: ${conv.outcome || 'não definido'}`;
      if (conv.extracted_entities && Object.keys(conv.extracted_entities).length > 0) {
        memory += ` | Entidades: ${JSON.stringify(conv.extracted_entities)}`;
      }
      if (conv.cognitive_analysis?.summary) {
        memory += `\n  Resumo: ${conv.cognitive_analysis.summary}`;
      }
      memory += '\n';
    }
    memory += '\n';
  }

  // Events timeline
  if (events && events.length > 0) {
    memory += '### Timeline de Eventos:\n';
    for (const evt of events) {
      const date = new Date(evt.created_at).toLocaleDateString('pt-BR');
      memory += `- **${date}** [${evt.event_type}] ${JSON.stringify(evt.event_data)} (fonte: ${evt.source})\n`;
    }
    memory += '\n';
  }

  return memory;
}

// ─── PERSISTENCE ───

async function persistMessage(
  supabase: any,
  conversationId: string,
  role: string,
  content: string,
  chunksUsed?: any[]
): Promise<string | null> {
  const { data, error } = await supabase
    .from('lia_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      chunks_used: chunksUsed || null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error persisting message:', error);
    return null;
  }

  // Increment message count
  await supabase.rpc('', {}).catch(() => {});
  
  return data?.id || null;
}

async function updateConversationState(
  supabase: any,
  conversationId: string,
  updates: Record<string, any>
) {
  await supabase
    .from('lia_conversations')
    .update(updates)
    .eq('id', conversationId);
}

async function registerEvent(
  supabase: any,
  leadId: string,
  eventType: string,
  eventData: Record<string, any>,
  source: string = 'lia_chat'
) {
  await supabase.from('lia_lead_events').insert({
    lead_id: leadId,
    event_type: eventType,
    event_data: eventData,
    source,
  });
}

// ─── EMBEDDING ───

// Use Supabase built-in gte-small model (384 dimensions)
const embeddingModel = new Supabase.ai.Session('gte-small');

async function generateEmbedding(text: string): Promise<number[]> {
  const output = await embeddingModel.run(text, { mean_pool: true, normalize: true });
  return Array.from(output);
}

// ─── RAG SEARCH ───

async function searchSimilarChunks(
  supabase: any,
  queryEmbedding: number[],
  options: { matchThreshold?: number; matchCount?: number } = {}
): Promise<RetrievedChunk[]> {
  const { matchThreshold = 0.6, matchCount = 8 } = options;

  const { data, error } = await supabase.rpc('match_knowledge_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_chunk_type: null,
    filter_product_id: null,
  });

  if (error) {
    console.error('Search error:', error);
    throw error;
  }

  return data || [];
}

// ─── PROMPT BUILDING ───

function buildSystemPrompt(chunks: RetrievedChunk[], longitudinalMemory: string): string {
  const antiHallucinationChunks = chunks.filter(c => c.chunk_type === 'anti_hallucination');
  const safetyRules = antiHallucinationChunks.map(c => c.content).join('\n\n');

  return `Você é a Dra. L.I.A., especialista em vendas e suporte técnico da Smart Dent, uma empresa líder em soluções odontológicas digitais (impressão 3D, resinas, scanners intraorais, CAD/CAM).

## REGRA DE ESCOPO (PRIORIDADE MÁXIMA):
- Você SÓ responde sobre: odontologia digital, impressão 3D odontológica, resinas Smart Print, scanners intraorais, fresadoras, CAD/CAM, e produtos/serviços da Smart Dent.
- Se a pergunta estiver FORA desse escopo (ex: perguntas gerais, curiosidades, política, etc.), responda educadamente: "Sou especializada em odontologia digital e produtos Smart Dent. Posso ajudar com parâmetros de impressão, resinas, scanners ou alguma dúvida técnica?"
- NUNCA force um fluxo de seleção de marca/impressora quando a pergunta não é sobre parâmetros de impressão.

## CLASSIFICAÇÃO DE INTENÇÃO (avalie ANTES de responder):
1. **TROUBLESHOOTING** — Se o usuário reportar um PROBLEMA técnico (descascando, falhando, não aderindo, camadas separando, peça quebrando, warping, delaminação, over-curing, under-curing, bolhas, distorção):
   - RESPONDA DIRETAMENTE com possíveis causas e soluções baseadas no contexto RAG
   - Pergunte detalhes adicionais (impressora, resina, configurações) DEPOIS de oferecer hipóteses iniciais
   - NÃO redirecione para menu de marcas
2. **PARÂMETROS DIRETOS** — Se o usuário já informou impressora E resina na mesma pergunta:
   - Busque e retorne os parâmetros diretamente do contexto RAG
   - NÃO peça para selecionar marca novamente
3. **COMPARAÇÃO/CONHECIMENTO** — Se o usuário perguntar diferenças entre produtos, especificações, indicações:
   - Responda diretamente com as informações do contexto
4. **PARÂMETROS SEM CONTEXTO** — Se o usuário quer parâmetros mas NÃO especificou impressora ou resina:
   - Pergunte qual impressora e qual resina de forma natural, SEM menu engessado
5. **FORA DE ESCOPO** — Aplique a regra de escopo acima

## DIRETRIZES FUNDAMENTAIS:

1. **RESPONDA APENAS COM BASE NO CONTEXTO FORNECIDO**
   - Use EXCLUSIVAMENTE as informações dos chunks recuperados e da memória longitudinal
   - Se a informação não estiver no contexto, diga "Não tenho essa informação específica no momento. Posso direcionar você para nosso time técnico via WhatsApp."
   - NUNCA invente especificações, preços, parâmetros ou características

2. **REGRAS DE SEGURANÇA (ANTI-ALUCINAÇÃO)**
${safetyRules || '   - Siga rigorosamente as especificações técnicas fornecidas'}

3. **MEMÓRIA LONGITUDINAL — USE ATIVAMENTE**
   - Você tem acesso ao histórico completo deste lead
   - Personalize a conversa com base em interações anteriores
   - Mencione interesses passados, produtos já discutidos, e estágio anterior
   - Se o lead abandonou antes, ajuste a abordagem para reconquistar

4. **ESTILO DE COMUNICAÇÃO**
   - Seja profissional, empática e consultiva
   - Use linguagem técnica quando apropriado, mas explique termos complexos
   - Foque em resolver o problema/dúvida do cliente
   - Sugira produtos complementares quando relevante (cross-sell)

5. **FORMATO DAS RESPOSTAS**
   - Seja concisa mas completa
   - Use bullet points para listas de especificações
   - Destaque preços e disponibilidade quando relevantes
   - Inclua CTAs suaves quando apropriado

6. **TRANSBORDO HUMANO**
   - Se você não conseguir resolver em 2 tentativas, ofereça: "Posso conectar você com nosso especialista via WhatsApp para um atendimento personalizado."
   - Se detectar que está repetindo as mesmas opções/menu, ofereça transbordo imediatamente
   - Admita limitações honestamente

${longitudinalMemory}`;
}

function buildContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'Nenhuma informação relevante encontrada na base de conhecimento.';
  }

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

// ─── FIRE-AND-FORGET: EVALUATE INTERACTION ───

async function triggerEvaluation(messageId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/evaluate-interaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message_id: messageId }),
    });
  } catch (err) {
    console.warn('Failed to trigger evaluation:', err);
  }
}

// ─── MAIN HANDLER ───

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
      match_count = 8,
      // Longitudinal memory fields
      phone,
      email,
      lead_name,
      channel = 'web',
      conversation_id: requestConversationId,
    } = await req.json();

    if (!query && messages.length === 0) {
      throw new Error('Query or messages required');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const userQuery = query || messages[messages.length - 1]?.content || '';

    console.log('🔍 RAG Chat query:', userQuery);

    // ─── 1. LEAD IDENTIFICATION ───
    let lead = null;
    let conversation = null;
    let longitudinalMemory = '';

    if (phone || email) {
      lead = await findOrCreateLead(supabase, { phone, email, name: lead_name });
      console.log(`👤 Lead: ${lead?.id || 'anonymous'} (${lead?.name || phone || email})`);

      if (lead) {
        // ─── 2. SESSION MANAGEMENT ───
        conversation = requestConversationId
          ? (await supabase.from('lia_conversations').select('*').eq('id', requestConversationId).single()).data
          : await findOrCreateConversation(supabase, lead.id, channel);

        console.log(`💬 Conversation: ${conversation?.id}`);

        // ─── 3. LOAD LONGITUDINAL MEMORY ───
        longitudinalMemory = await loadLongitudinalMemory(supabase, lead.id);
        console.log(`🧠 Memory loaded: ${longitudinalMemory.length} chars`);

        // ─── 4. PERSIST USER MESSAGE ───
        if (conversation) {
          await persistMessage(supabase, conversation.id, 'user', userQuery);
        }
      }
    }

    // ─── 5. RAG: EMBEDDING + SEARCH ───
    console.log('📊 Generating query embedding...');
    const queryEmbedding = await generateEmbedding(userQuery);

    console.log('🔎 Searching similar chunks...');
    const retrievedChunks = await searchSimilarChunks(supabase, queryEmbedding, {
      matchThreshold: match_threshold,
      matchCount: match_count,
    });
    console.log(`📚 Retrieved ${retrievedChunks.length} chunks`);

    // ─── 6. BUILD PROMPTS ───
    const systemPrompt = buildSystemPrompt(retrievedChunks, longitudinalMemory);
    const context = buildContext(retrievedChunks);

    const llmMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-10),
      { role: 'user', content: `${context}\n\n---\n\n**PERGUNTA DO CLIENTE:**\n${userQuery}` },
    ];

    // ─── 7. CALL LLM ───
    console.log('🤖 Calling LLM...');

    if (stream) {
      const response = await fetch(`${AI_GATEWAY}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: llmMessages,
          stream: true,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error (${response.status}): ${error}`);
      }

      // For streaming: collect tokens, persist after stream ends
      const encoder = new TextEncoder();
      let fullResponse = '';

      const transformStream = new TransformStream({
        start(controller) {
          // Send metadata first
          const metadata = JSON.stringify({
            type: 'metadata',
            conversation_id: conversation?.id || null,
            lead_id: lead?.id || null,
            retrieved_chunks: retrievedChunks.map(c => ({
              product_name: c.product_name,
              chunk_type: c.chunk_type,
              similarity: c.similarity,
            })),
          });
          controller.enqueue(encoder.encode(`data: ${metadata}\n\n`));
        },
        transform(chunk, controller) {
          // Pass through SSE chunks and collect full response
          const text = new TextDecoder().decode(chunk);
          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6));
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {}
            }
          }
          controller.enqueue(chunk);
        },
        async flush() {
          // Persist assistant response after stream completes
          if (conversation && fullResponse) {
            const chunksUsedMeta = retrievedChunks.map(c => ({
              id: c.id,
              product_name: c.product_name,
              chunk_type: c.chunk_type,
              similarity: c.similarity,
            }));
            const msgId = await persistMessage(supabase, conversation.id, 'assistant', fullResponse, chunksUsedMeta);

            // Update conversation state
            await updateConversationState(supabase, conversation.id, {
              message_count: (conversation.message_count || 0) + 2,
            });

            // Fire-and-forget: trigger evaluation
            if (msgId) {
              triggerEvaluation(msgId);
            }

            // Detect product interest and register event
            const mentionedProducts = retrievedChunks
              .filter(c => c.product_name && c.similarity > 0.75)
              .map(c => c.product_name);
            if (mentionedProducts.length > 0 && lead) {
              registerEvent(supabase, lead.id, 'interest_shown', {
                products: [...new Set(mentionedProducts)],
                query: userQuery,
              });
            }
          }

          // Track AI usage
          trackAIUsage({
            edgeFunctionId: 'rag-chat',
            actionName: 'chat_completion_stream',
            model: LLM_MODEL,
            productName: retrievedChunks[0]?.product_name,
          }).catch(() => {});
        },
      });

      return new Response(response.body?.pipeThrough(transformStream), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming response
      const response = await fetch(`${AI_GATEWAY}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: llmMessages,
          stream: false,
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`LLM API error (${response.status}): ${error}`);
      }

      const llmData = await response.json();
      const assistantMessage = llmData.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';

      // Track usage
      const usage = extractUsageFromResponse(llmData);
      trackAIUsage({
        edgeFunctionId: 'rag-chat',
        actionName: 'chat_completion',
        model: usage.model || LLM_MODEL,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        productName: retrievedChunks[0]?.product_name,
      }).catch(() => {});

      // Persist messages
      if (conversation) {
        const chunksUsedMeta = retrievedChunks.map(c => ({
          id: c.id,
          product_name: c.product_name,
          chunk_type: c.chunk_type,
          similarity: c.similarity,
        }));
        const msgId = await persistMessage(supabase, conversation.id, 'assistant', assistantMessage, chunksUsedMeta);

        await updateConversationState(supabase, conversation.id, {
          message_count: (conversation.message_count || 0) + 2,
        });

        if (msgId) triggerEvaluation(msgId);

        // Detect interest
        const mentionedProducts = retrievedChunks
          .filter(c => c.product_name && c.similarity > 0.75)
          .map(c => c.product_name);
        if (mentionedProducts.length > 0 && lead) {
          registerEvent(supabase, lead.id, 'interest_shown', {
            products: [...new Set(mentionedProducts)],
            query: userQuery,
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          response: assistantMessage,
          conversation_id: conversation?.id || null,
          lead_id: lead?.id || null,
          sources: retrievedChunks.map(c => ({
            product_id: c.product_id,
            product_name: c.product_name,
            chunk_type: c.chunk_type,
            similarity: c.similarity,
            excerpt: c.content.substring(0, 200) + '...',
          })),
          metadata: {
            chunks_retrieved: retrievedChunks.length,
            model: LLM_MODEL,
            threshold: match_threshold,
            has_memory: longitudinalMemory.length > 0,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('❌ RAG Chat error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
