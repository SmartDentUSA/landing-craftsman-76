/**
 * Blog Index Extractors
 * Extracts metadata (image, description, date, author) from a blog post's
 * transformed_html for use in the /blog index card grid.
 */

export interface PostCardMeta {
  ogImage: string | null;
  description: string;
  publishedTime: string | null;
  author: string | null;
  readingTimeMin: number;
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

const firstMatch = (html: string, regex: RegExp): string | null => {
  const m = html.match(regex);
  return m && m[1] ? decodeEntities(m[1].trim()) : null;
};

export function extractPostCardMeta(html: string): PostCardMeta {
  const safe = html || '';

  // og:image (try property and name variants)
  let ogImage =
    firstMatch(safe, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
    firstMatch(safe, /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
    firstMatch(safe, /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);

  // Fallback: first <img> in body that isn't a tracking pixel/data URI
  if (!ogImage) {
    const imgMatches = safe.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    for (const m of imgMatches) {
      const src = m[1];
      if (
        src &&
        !src.startsWith('data:') &&
        !/pixel|track|beacon|1x1|spacer/i.test(src) &&
        /\.(jpe?g|png|webp|gif|avif)/i.test(src)
      ) {
        ogImage = src;
        break;
      }
    }
  }

  // description
  const description =
    firstMatch(safe, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
    firstMatch(safe, /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    firstMatch(safe, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) ||
    '';

  // article:published_time
  const publishedTime = firstMatch(
    safe,
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i
  );

  // article:author
  let author = firstMatch(
    safe,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i
  );
  if (!author) {
    author = firstMatch(safe, /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i);
  }

  // Reading time estimate (200 wpm) from text content
  const text = safe
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const readingTimeMin = Math.max(1, Math.round(words / 200));

  return {
    ogImage,
    description: description.slice(0, 220),
    publishedTime,
    author,
    readingTimeMin,
  };
}

export function formatPtDate(iso: string | null, fallback: string): string {
  const d = new Date(iso || fallback);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}
