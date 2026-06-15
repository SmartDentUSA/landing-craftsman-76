import { sistemaBClient, SISTEMA_B_APP_URL } from "@/integrations/sistema-b/client";

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

export async function uploadCarouselToSmartOps(
  args: UploadCarouselArgs,
): Promise<UploadCarouselResult> {
  const { slides, produtoSlug } = args;
  if (!slides.length) throw new Error("Nenhum slide para enviar.");

  const ref = `carrosseis/${produtoSlug}/${crypto.randomUUID()}`;

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const path = `${ref}/slide-${i + 1}.png`;
    const { error } = await sistemaBClient.storage
      .from("wa-media")
      .upload(path, slide, {
        contentType: "image/png",
        upsert: false,
      });
    if (error) {
      throw new Error(`Falha no upload do slide ${i + 1}: ${error.message}`);
    }
  }

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
