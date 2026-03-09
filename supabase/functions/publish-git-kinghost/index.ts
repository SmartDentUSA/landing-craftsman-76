import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const REPO_OWNER = 'SmartDentUSA';
const REPO_NAME = 'landing-craftsman-76';
const BRANCH = 'stable-website';
const GH_API = 'https://api.github.com';

interface RequestBody {
  html?: string;
  pagePath: string;
  isHomepage?: boolean;
  lpId: string;
  domain: string;
}

async function ghFetch(path: string, token: string, options: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${GH_API}/repos/${REPO_OWNER}/${REPO_NAME}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${body}`);
  }
  return JSON.parse(body);
}

function injectTrackingPixels(html: string, trackingPixels: any): string {
  if (!trackingPixels || typeof trackingPixels !== 'object') return html;

  const snippets: string[] = [];

  // GTM
  if (trackingPixels.gtm_id) {
    snippets.push(`<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${trackingPixels.gtm_id}');</script>
<!-- End Google Tag Manager -->`);
  }

  // GA4
  if (trackingPixels.ga4_id) {
    snippets.push(`<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${trackingPixels.ga4_id}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${trackingPixels.ga4_id}');</script>`);
  }

  // Meta Pixel
  if (trackingPixels.meta_pixel_id) {
    snippets.push(`<!-- Meta Pixel -->
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;
n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${trackingPixels.meta_pixel_id}');fbq('track','PageView');</script>`);
  }

  if (snippets.length === 0) return html;

  const injection = snippets.join('\n');

  // Inject before </head>
  if (html.includes('</head>')) {
    return html.replace('</head>', `${injection}\n</head>`);
  }
  // Fallback: prepend
  return injection + '\n' + html;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const githubToken = Deno.env.get('GITHUB_PAT_DEPLOY');

  if (!githubToken) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT_DEPLOY secret not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body: RequestBody = await req.json();
    const { lpId, domain, isHomepage } = body;
    let { html, pagePath } = body;

    console.log(`🐙 Git Deploy: lpId=${lpId}, domain=${domain}, path=${pagePath}, homepage=${isHomepage}`);

    // 1. If no HTML provided, fetch from cloned_landing_pages
    if (!html) {
      const { data: lp, error } = await supabase
        .from('cloned_landing_pages')
        .select('transformed_html, original_html')
        .eq('id', lpId)
        .single();

      if (error || !lp) throw new Error(`LP not found: ${error?.message}`);
      html = lp.transformed_html || lp.original_html;
    }

    if (!html) throw new Error('No HTML content to publish');

    // 2. Inject tracking pixels from domain config
    const { data: companyData } = await supabase
      .from('company_profile')
      .select('seo_domains')
      .limit(1)
      .maybeSingle();

    if (companyData?.seo_domains && Array.isArray(companyData.seo_domains)) {
      const domainConfig = (companyData.seo_domains as any[]).find((d: any) => d.domain === domain);
      if (domainConfig?.tracking_pixels) {
        console.log('📊 Injecting tracking pixels');
        html = injectTrackingPixels(html, domainConfig.tracking_pixels);
      }
    }

    // 3. Determine file path in repo
    if (isHomepage) pagePath = '/';
    const repoPath = isHomepage
      ? 'public/index.html'
      : `public${pagePath.startsWith('/') ? pagePath : '/' + pagePath}/index.html`;

    console.log(`📁 Repo path: ${repoPath}`);

    // 4. Git flow via GitHub REST API
    // Step A: Get branch ref
    const refData = await ghFetch(`/git/ref/heads/${BRANCH}`, githubToken);
    const latestCommitSha = refData.object.sha;
    console.log(`🔗 Branch ${BRANCH} at ${latestCommitSha}`);

    // Step B: Get commit to find tree
    const commitData = await ghFetch(`/git/commits/${latestCommitSha}`, githubToken);
    const baseTreeSha = commitData.tree.sha;

    // Step C: Create blob with HTML content (base64)
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);
    const base64Content = btoa(String.fromCharCode(...htmlBytes));

    const blobData = await ghFetch('/git/blobs', githubToken, {
      method: 'POST',
      body: JSON.stringify({
        content: base64Content,
        encoding: 'base64',
      }),
    });
    console.log(`📦 Blob created: ${blobData.sha}`);

    // Step D: Create tree with new file
    const treeData = await ghFetch('/git/trees', githubToken, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [{
          path: repoPath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        }],
      }),
    });
    console.log(`🌳 Tree created: ${treeData.sha}`);

    // Step E: Create commit
    const newCommitData = await ghFetch('/git/commits', githubToken, {
      method: 'POST',
      body: JSON.stringify({
        message: `🚀 Publish: ${domain}${pagePath} (LP: ${lpId})`,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });
    console.log(`✅ Commit created: ${newCommitData.sha}`);

    // Step F: Update branch ref
    await ghFetch(`/git/refs/heads/${BRANCH}`, githubToken, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false,
      }),
    });
    console.log(`🎯 Branch ${BRANCH} updated to ${newCommitData.sha}`);

    // 5. Update cloned_landing_pages
    const publishedUrl = `https://${domain}${pagePath === '/' ? '' : pagePath}`;
    const { error: updateError } = await supabase
      .from('cloned_landing_pages')
      .update({
        publish_status: 'published',
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
        publish_error_message: null,
      })
      .eq('id', lpId);

    if (updateError) {
      console.error('⚠️ DB update failed (but git push succeeded):', updateError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      commitSha: newCommitData.sha,
      publishedUrl,
      repoPath,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Git deploy error:', error.message);

    // Try to update status to error
    try {
      const body = await req.clone().json();
      if (body.lpId) {
        await supabase
          .from('cloned_landing_pages')
          .update({
            publish_status: 'error',
            publish_error_message: error.message,
          })
          .eq('id', body.lpId);
      }
    } catch (_) { /* ignore */ }

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
