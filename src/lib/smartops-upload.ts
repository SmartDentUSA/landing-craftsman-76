import {
  sistemaBClient,
  SISTEMA_B_APP_URL,
  SISTEMA_B_ANON_KEY,
  SISTEMA_B_SUPABASE_URL,
} from "@/integrations/sistema-b/client";

export type CarouselTipo = "visual" | "engajamento";

export function slugify(name: string): string {
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface UploadCarouselArgs {
  slides: Blob[];
  produtoSlug: string;
  tipo: CarouselTipo;
}

export interface UploadCarouselResult {
  ref: string;
  total: number;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Timeout (${ms}ms): ${label}`)),
      ms,
    );
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

export async function uploadCarouselToSmartOps(
  args: UploadCarouselArgs,
): Promise<UploadCarouselResult> {
  const { slides, produtoSlug } = args;
  if (!slides.length) throw new Error("Nenhum slide para enviar.");

  const ref = `carrosseis/${produtoSlug}/${crypto.randomUUID()}`;
  console.log(`[SMARTOPS_UPLOAD] iniciando ref=${ref} total=${slides.length}`);
  console.log("[SMARTOPS_UPLOAD] Sistema B URL:", SISTEMA_B_SUPABASE_URL || "(vazio)");
  console.log(
    "[SMARTOPS_UPLOAD] Anon key presente:",
    !!SISTEMA_B_ANON_KEY,
    "len:",
    SISTEMA_B_ANON_KEY?.length || 0,
  );
  if (!SISTEMA_B_SUPABASE_URL || !SISTEMA_B_ANON_KEY) {
    throw new Error(
      "Envs do Sistema B ausentes (VITE_SISTEMA_B_SUPABASE_URL / VITE_SISTEMA_B_SUPABASE_ANON_KEY). Configure em Settings → Environment Variables do Lovable.",
    );
  }


  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const path = `${ref}/slide-${i + 1}.png`;
    console.log(
      `[SMARTOPS_UPLOAD] enviando slide ${i + 1}/${slides.length} (${slide.size} bytes) → ${path}`,
    );
    try {
      const { error } = await withTimeout(
        sistemaBClient.storage
          .from("wa-media")
          .upload(path, slide, {
            contentType: "image/png",
            upsert: false,
          }),
        30_000,
        `upload slide ${i + 1}`,
      );
      if (error) {
        console.error(`[SMARTOPS_UPLOAD] erro slide ${i + 1}:`, error);
        throw new Error(
          `Falha no upload do slide ${i + 1}: ${error.message}`,
        );
      }
      console.log(`[SMARTOPS_UPLOAD] ok slide ${i + 1}`);
    } catch (err: any) {
      console.error(`[SMARTOPS_UPLOAD] exceção slide ${i + 1}:`, err);
      throw err instanceof Error
        ? err
        : new Error(`Falha no upload do slide ${i + 1}`);
    }
  }

  console.log(`[SMARTOPS_UPLOAD] concluído ref=${ref}`);
  return { ref, total: slides.length };
}

export function buildSocialPublisherUrl(params: {
  ref: string;
  produtoSlug: string;
  tipo: CarouselTipo;
  total: number;
}): string {
  const qs = new URLSearchParams({
    source: "carrossel",
    ref: params.ref,
    produto: params.produtoSlug,
    tipo: params.tipo,
    total: String(params.total),
  });
  return `${SISTEMA_B_APP_URL}/ferramentas/social-publisher/criar?${qs.toString()}`;
}
