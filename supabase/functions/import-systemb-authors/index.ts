import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_B_URL = 'https://okeogjgqijbfkudfjadz.supabase.co/functions/v1/data-export?format=ai_ready';
const TIMEOUT_MS = 30_000;

// ─── Mapeamento de campos (múltiplos nomes possíveis) ───────────────────────

function pickField(obj: Record<string, any>, ...keys: string[]): string | null {
  for (const key of keys) {
    const val = obj[key];
    if (val && typeof val === 'string' && val.trim().length > 0) return val.trim();
  }
  return null;
}

function mapAuthor(raw: any): { full_name: string; photo_url?: string; mini_cv?: string; specialty?: string; instagram_url?: string; youtube_url?: string; lattes_url?: string; website_url?: string; display_order?: number } | null {
  const full_name = pickField(raw, 'nome', 'name', 'nome_completo', 'full_name');
  if (!full_name) return null;

  return {
    full_name,
    photo_url:    pickField(raw, 'foto', 'photo_url', 'foto_url', 'imagem', 'avatar', 'avatar_url') ?? undefined,
    mini_cv:      pickField(raw, 'bio', 'mini_cv', 'descricao', 'biografia', 'description', 'about') ?? undefined,
    specialty:    pickField(raw, 'especialidade', 'specialty', 'cargo', 'title', 'role', 'area') ?? undefined,
    instagram_url: pickField(raw, 'instagram', 'instagram_url', 'instagram_handle') ?? undefined,
    youtube_url:  pickField(raw, 'youtube', 'youtube_url', 'youtube_channel') ?? undefined,
    lattes_url:   pickField(raw, 'lattes', 'lattes_url', 'curriculo_lattes', 'cv_lattes') ?? undefined,
    website_url:  pickField(raw, 'site', 'website', 'website_url', 'url', 'homepage') ?? undefined,
    display_order: typeof raw.ordem === 'number' ? raw.ordem : typeof raw.display_order === 'number' ? raw.display_order : undefined,
  };
}

// ─── Localiza lista de autores tentando múltiplos caminhos no payload ───────

function findAuthors(payload: any): any[] {
  const candidates = [
    payload?.autores,
    payload?.profissionais,
    payload?.key_opinion_leaders,
    payload?.kols,
    payload?.authors,
    payload?.especialistas,
    payload?.perfil_empresa?.equipe,
    payload?.perfil_empresa?.profissionais,
    payload?.perfil_empresa?.team,
    payload?.perfil_empresa?.autores,
    payload?.empresa?.equipe,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }
  return [];
}

// ─── Handler principal ──────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = new Date().toISOString();
  console.log(`🚀 [import-systemb-authors] Iniciando importação — ${startedAt}`);

  try {
    // 1. Buscar payload do Sistema B com timeout de 30s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let payload: any;
    try {
      const response = await fetch(SYSTEM_B_URL, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Sistema B respondeu com status ${response.status}`);
      }

      const raw = await response.json();
      payload = raw?.data ?? raw;
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        throw new Error('Timeout: Sistema B não respondeu em 30 segundos');
      }
      throw fetchErr;
    }

    // 2. Logar chaves raiz para diagnóstico
    const rootKeys = Object.keys(payload || {});
    console.log(`📦 [import-systemb-authors] Chaves raiz do payload: ${JSON.stringify(rootKeys)}`);

    // Logar sub-chaves de perfil_empresa se existir
    if (payload?.perfil_empresa) {
      console.log(`🏢 [import-systemb-authors] perfil_empresa chaves: ${JSON.stringify(Object.keys(payload.perfil_empresa))}`);
    }

    // 3. Localizar lista de autores
    const rawAuthors = findAuthors(payload);
    console.log(`👥 [import-systemb-authors] Autores encontrados no payload: ${rawAuthors.length}`);

    if (rawAuthors.length === 0) {
      console.warn('⚠️ [import-systemb-authors] Nenhum autor encontrado nos caminhos esperados');
      console.warn('Caminhos tentados: autores, profissionais, key_opinion_leaders, kols, authors, especialistas, perfil_empresa.equipe, perfil_empresa.profissionais, perfil_empresa.team, perfil_empresa.autores, empresa.equipe');
      
      return new Response(
        JSON.stringify({
          success: true,
          summary: { encontrados: 0, importados: 0, ignorados: 0, erros: 0 },
          message: 'Nenhum autor encontrado no payload do Sistema B. Verifique os logs para diagnóstico.',
          root_keys: rootKeys,
          started_at: startedAt,
          finished_at: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Mapear autores para o formato key_opinion_leaders
    const mapped = rawAuthors
      .map(mapAuthor)
      .filter((a): a is NonNullable<ReturnType<typeof mapAuthor>> => a !== null);

    console.log(`✅ [import-systemb-authors] Autores mapeados com full_name: ${mapped.length}`);

    // 5. Fazer upsert no Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let importados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const author of mapped) {
      try {
        // Verificar se já existe pelo full_name
        const { data: existing } = await supabase
          .from('key_opinion_leaders')
          .select('id, full_name')
          .eq('full_name', author.full_name)
          .maybeSingle();

        if (existing) {
          // Atualizar campos não-nulos sem sobrescrever approved
          const updatePayload: Record<string, any> = {};
          if (author.photo_url) updatePayload.photo_url = author.photo_url;
          if (author.mini_cv) updatePayload.mini_cv = author.mini_cv;
          if (author.specialty) updatePayload.specialty = author.specialty;
          if (author.instagram_url) updatePayload.instagram_url = author.instagram_url;
          if (author.youtube_url) updatePayload.youtube_url = author.youtube_url;
          if (author.lattes_url) updatePayload.lattes_url = author.lattes_url;
          if (author.website_url) updatePayload.website_url = author.website_url;
          if (author.display_order !== undefined) updatePayload.display_order = author.display_order;

          if (Object.keys(updatePayload).length > 0) {
            await supabase
              .from('key_opinion_leaders')
              .update(updatePayload)
              .eq('id', existing.id);
          }

          ignorados++;
          console.log(`↩️ [import-systemb-authors] KOL já existe, atualizado: ${author.full_name}`);
        } else {
          // Inserir novo KOL com approved: false
          const { error: insertErr } = await supabase
            .from('key_opinion_leaders')
            .insert({
              ...author,
              approved: false,
            });

          if (insertErr) {
            console.error(`❌ [import-systemb-authors] Erro ao inserir ${author.full_name}: ${insertErr.message}`);
            erros++;
          } else {
            importados++;
            console.log(`✅ [import-systemb-authors] KOL importado (pendente aprovação): ${author.full_name}`);
          }
        }
      } catch (authorErr: any) {
        console.error(`❌ [import-systemb-authors] Erro processando ${author.full_name}: ${authorErr.message}`);
        erros++;
      }
    }

    const summary = {
      encontrados: rawAuthors.length,
      mapeados: mapped.length,
      importados,
      atualizados: ignorados,
      erros,
    };

    console.log(`🏁 [import-systemb-authors] Concluído: ${JSON.stringify(summary)}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        message: `Importação concluída: ${importados} novos KOLs importados, ${ignorados} atualizados, ${erros} erros.`,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`❌ [import-systemb-authors] Erro fatal: ${error.message}`);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
