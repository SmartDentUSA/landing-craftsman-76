// Submete sitemaps de todos os domínios publicados ao Google Search Console
// via gateway de conector Lovable.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console";

type SiteEntry = { siteUrl: string; permissionLevel: string };

function encode(s: string) {
  return encodeURIComponent(s);
}

async function listSites(lovableKey: string, gscKey: string): Promise<SiteEntry[]> {
  const r = await fetch(`${GATEWAY}/webmasters/v3/sites`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gscKey,
    },
  });
  if (!r.ok) throw new Error(`listSites failed [${r.status}]: ${await r.text()}`);
  const data = await r.json();
  return data.siteEntry || [];
}

function pickSiteUrl(domain: string, sites: SiteEntry[]): string | null {
  // Prefer sc-domain (Domain property), else https://domain/
  const sc = sites.find((s) => s.siteUrl === `sc-domain:${domain}`);
  if (sc) return sc.siteUrl;
  const https = sites.find((s) => s.siteUrl === `https://${domain}/`);
  if (https) return https.siteUrl;
  return null;
}

async function submitSitemap(
  lovableKey: string,
  gscKey: string,
  siteUrl: string,
  sitemapUrl: string,
) {
  const url = `${GATEWAY}/webmasters/v3/sites/${encode(siteUrl)}/sitemaps/${encode(sitemapUrl)}`;
  const r = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gscKey,
    },
  });
  const body = await r.text();
  return { ok: r.ok, status: r.status, body };
}

async function deleteSitemap(
  lovableKey: string,
  gscKey: string,
  siteUrl: string,
  sitemapUrl: string,
) {
  const url = `${GATEWAY}/webmasters/v3/sites/${encode(siteUrl)}/sitemaps/${encode(sitemapUrl)}`;
  const r = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gscKey,
    },
  });
  const body = await r.text();
  return { ok: r.ok, status: r.status, body };
}

async function listSitemaps(
  lovableKey: string,
  gscKey: string,
  siteUrl: string,
) {
  const url = `${GATEWAY}/webmasters/v3/sites/${encode(siteUrl)}/sitemaps`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": gscKey,
    },
  });
  if (!r.ok) return [];
  const data = await r.json();
  return data.sitemap || [];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GOOGLE_SEARCH_CONSOLE_API_KEY = Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
    if (!GOOGLE_SEARCH_CONSOLE_API_KEY) throw new Error("GOOGLE_SEARCH_CONSOLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let payload: { domains?: string[]; cleanupBadSitemaps?: boolean } = {};
    try {
      payload = await req.json();
    } catch { /* no body */ }

    // 1. Find domains with published content
    const { data: published, error: pubErr } = await supabase
      .from("cloned_landing_pages")
      .select("target_domain")
      .in("publish_status", ["success", "pending_deploy", "published"]);
    if (pubErr) throw pubErr;

    const publishedDomains = new Set<string>(
      (published || []).map((r) => r.target_domain).filter(Boolean) as string[],
    );

    const targetDomains = payload.domains?.length
      ? payload.domains.filter((d) => publishedDomains.has(d))
      : [...publishedDomains];

    // 2. List GSC properties
    const sites = await listSites(LOVABLE_API_KEY, GOOGLE_SEARCH_CONSOLE_API_KEY);

    const results: any[] = [];

    for (const domain of targetDomains) {
      const siteUrl = pickSiteUrl(domain, sites);
      const sitemapUrl = `https://${domain}/sitemap.xml`;

      if (!siteUrl) {
        const logRow = {
          domain,
          site_url: `(missing)`,
          sitemap_url: sitemapUrl,
          action: "submit",
          status_code: 0,
          success: false,
          error_message: "Property not found in GSC — needs verification first",
        };
        await supabase.from("gsc_submission_log").insert(logRow);
        results.push({ domain, ...logRow });
        continue;
      }

      // Optional cleanup: delete sitemaps with errors that don't match canonical
      if (payload.cleanupBadSitemaps) {
        const existing = await listSitemaps(LOVABLE_API_KEY, GOOGLE_SEARCH_CONSOLE_API_KEY, siteUrl);
        for (const s of existing) {
          const path = s.path as string;
          const isBad = (s.errors ?? 0) > 0 && path !== sitemapUrl;
          if (isBad) {
            const del = await deleteSitemap(
              LOVABLE_API_KEY,
              GOOGLE_SEARCH_CONSOLE_API_KEY,
              siteUrl,
              path,
            );
            await supabase.from("gsc_submission_log").insert({
              domain,
              site_url: siteUrl,
              sitemap_url: path,
              action: "delete",
              status_code: del.status,
              success: del.ok,
              error_message: del.ok ? null : del.body.slice(0, 500),
            });
          }
        }
      }

      // Submit canonical sitemap
      const res = await submitSitemap(
        LOVABLE_API_KEY,
        GOOGLE_SEARCH_CONSOLE_API_KEY,
        siteUrl,
        sitemapUrl,
      );

      await supabase.from("gsc_submission_log").insert({
        domain,
        site_url: siteUrl,
        sitemap_url: sitemapUrl,
        action: "submit",
        status_code: res.status,
        success: res.ok,
        error_message: res.ok ? null : res.body.slice(0, 500),
      });

      if (res.ok) {
        await supabase
          .from("domain_config")
          .update({
            sitemap_url: sitemapUrl,
            gsc_last_sitemap_submission_at: new Date().toISOString(),
          })
          .eq("domain", domain);
      }

      results.push({ domain, siteUrl, sitemapUrl, status: res.status, ok: res.ok });
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("gsc-submit-sitemaps error:", e);
    return new Response(
      JSON.stringify({ success: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
