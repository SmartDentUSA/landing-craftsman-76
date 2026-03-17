import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ✅ Tracking v2.0: usar módulo centralizado
import { injectTrackingIntoHTML, type TrackingPixels } from "../_shared/tracking-injector.ts";

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

// ✅ Tracking inline removido — agora usa _shared/tracking-injector.ts

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

    // 2. Inject tracking pixels from company_profile (centralizado)
    const { data: companyData } = await supabase
      .from('company_profile')
      .select('tracking_pixels, seo_domains')
      .limit(1)
      .maybeSingle();

    if (companyData?.tracking_pixels) {
      console.log('📊 Injecting tracking pixels via shared module');
      html = injectTrackingIntoHTML(html, companyData.tracking_pixels as TrackingPixels, {
        generatorName: 'publish-git-kinghost',
        domain,
      });
    }

    // 3. Inject nav-data.js script tag for incremental footer
    const navScriptTag = `<script src="/nav-data.js" defer></script>`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${navScriptTag}\n</body>`);
    } else {
      html += navScriptTag;
    }

    // 4. Determine file path in repo
    if (isHomepage) pagePath = '/';
    const repoPath = isHomepage
      ? 'index.html'
      : `${pagePath.startsWith('/') ? pagePath.slice(1) : pagePath}/index.html`;

    console.log(`📁 Repo path: ${repoPath}`);

    // 5. Git flow via GitHub REST API
    // Step A: Get branch ref
    const refData = await ghFetch(`/git/ref/heads/${BRANCH}`, githubToken);
    const latestCommitSha = refData.object.sha;
    console.log(`🔗 Branch ${BRANCH} at ${latestCommitSha}`);

    // Step B: Get commit to find tree
    const commitData = await ghFetch(`/git/commits/${latestCommitSha}`, githubToken);
    const baseTreeSha = commitData.tree.sha;

    // Step C: Create blob with HTML content
    const blobData = await ghFetch('/git/blobs', githubToken, {
      method: 'POST',
      body: JSON.stringify({
        content: html,
        encoding: 'utf-8',
      }),
    });
    console.log(`📦 HTML blob created: ${blobData.sha}`);

    // Step D: Generate nav-data.js and create its blob
    let navBlobSha: string | null = null;
    try {
      const { data: allPublished } = await supabase
        .from('cloned_landing_pages')
        .select('name, published_url, page_path, is_homepage, product, brand')
        .eq('target_domain', domain)
        .eq('publish_status', 'published')
        .order('is_homepage', { ascending: false })
        .order('name');

      if (allPublished && allPublished.length > 0) {
        const rawNavItems = allPublished.map((p: any) => ({
          name: p.name || p.product || 'Página',
          url: p.published_url || `https://${domain}${p.page_path || '/'}`,
          isHome: p.is_homepage || false,
          brand: p.brand || null,
        }));

        // Deduplicate by URL
        const seen = new Set<string>();
        const navItems = rawNavItems.filter((item: any) => {
          if (seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        });

        const navDataJS = `/* Smart Dent Navigation Data - Auto-generated */
window.__NAV_DATA__ = ${JSON.stringify(navItems, null, 2)};
(function() {
  var data = window.__NAV_DATA__;
  if (!data || data.length < 2) return;
  var nav = document.createElement('nav');
  nav.id = 'smartdent-nav-footer';
  nav.style.cssText = 'background:#1a1a2e;padding:24px 16px;text-align:center;';
  var title = document.createElement('p');
  title.style.cssText = 'color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 12px 0;';
  title.textContent = 'Navegue por nossas páginas:';
  nav.appendChild(title);
  var links = document.createElement('div');
  links.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:8px;';
   var currentUrl = window.location.href.replace(/\\/$/, '');
   data.forEach(function(item) {
    if (item.url.replace(/\\/$/, '') === currentUrl) return;
    var a = document.createElement('a');
    a.href = item.url;
    a.textContent = item.isHome ? '🏠 Home' : item.name;
    a.style.cssText = 'color:#60a5fa;text-decoration:none;font-size:13px;padding:4px 10px;background:#16213e;border-radius:4px;transition:background 0.2s;';
    a.onmouseover = function() { this.style.background = '#1e3a5f'; };
    a.onmouseout = function() { this.style.background = '#16213e'; };
    links.appendChild(a);
  });
  nav.appendChild(links);
  var existing = document.getElementById('smartdent-nav-footer');
  if (existing) existing.remove();
  var footer = document.querySelector('footer');
  if (footer) {
    var copyright = null;
    var allEls = footer.querySelectorAll('*');
    for (var i = 0; i < allEls.length; i++) {
      var txt = allEls[i].textContent || '';
      if ((txt.indexOf('©') !== -1 || txt.toLowerCase().indexOf('direitos') !== -1) && allEls[i].children.length === 0) {
        copyright = allEls[i];
        break;
      }
    }
    if (!copyright) {
      var directChildren = footer.children;
      for (var j = directChildren.length - 1; j >= 0; j--) {
        var t = directChildren[j].textContent || '';
        if (t.indexOf('©') !== -1 || t.toLowerCase().indexOf('direitos') !== -1) {
          copyright = directChildren[j];
          break;
        }
      }
    }
    if (copyright) {
      copyright.parentNode.insertBefore(nav, copyright);
    } else {
      footer.appendChild(nav);
    }
  } else {
    document.body.appendChild(nav);
  }
})();`;

        const navBlob = await ghFetch('/git/blobs', githubToken, {
          method: 'POST',
          body: JSON.stringify({
            content: navDataJS,
            encoding: 'utf-8',
          }),
        });
        navBlobSha = navBlob.sha;
        console.log(`📦 nav-data.js blob created: ${navBlobSha}`);
      }
    } catch (navErr: any) {
      console.warn('⚠️ nav-data.js generation failed (continuing without it):', navErr.message);
    }

    // Step E: Create tree with HTML + optional nav-data.js (single commit)
    const treeFiles: any[] = [{
      path: repoPath,
      mode: '100644',
      type: 'blob',
      sha: blobData.sha,
    }];

    if (navBlobSha) {
      treeFiles.push({
        path: 'nav-data.js',
        mode: '100644',
        type: 'blob',
        sha: navBlobSha,
      });
    }

    const treeData = await ghFetch('/git/trees', githubToken, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeFiles,
      }),
    });
    console.log(`🌳 Tree created: ${treeData.sha} (${treeFiles.length} files)`);

    // Step F: Create commit
    const newCommitData = await ghFetch('/git/commits', githubToken, {
      method: 'POST',
      body: JSON.stringify({
        message: `🚀 Publish: ${domain}${pagePath} (LP: ${lpId})`,
        tree: treeData.sha,
        parents: [latestCommitSha],
      }),
    });
    console.log(`✅ Commit created: ${newCommitData.sha}`);

    // Step G: Update branch ref
    await ghFetch(`/git/refs/heads/${BRANCH}`, githubToken, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false,
      }),
    });
    console.log(`🎯 Branch ${BRANCH} updated to ${newCommitData.sha}`);

    // 6. Update cloned_landing_pages
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
      navDataIncluded: !!navBlobSha,
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
