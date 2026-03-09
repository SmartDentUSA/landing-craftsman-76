import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GITHUB_OWNER = "SmartDentUSA";
const GITHUB_REPO = "landing-craftsman-76";
const GITHUB_BRANCH = "stable-website";
const DOMAIN = "smartdent.com.br";

const GITHUB_API = "https://api.github.com";

async function githubFetch(pat: string, path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${GITHUB_API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${pat}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  return res;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── Auth ───
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = claimsData.claims.sub;
    console.log(`🔐 User authenticated: ${userId}`);

    // ─── GitHub PAT ───
    const githubPat = Deno.env.get('GITHUB_PAT_DEPLOY');
    if (!githubPat) {
      throw new Error('GITHUB_PAT_DEPLOY secret not configured');
    }

    // Service role client for DB operations
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Parse input ───
    const { html: htmlFromBody, pagePath, isHomepage, lpId, domain } = await req.json();

    let html = htmlFromBody;

    // If html not provided directly, fetch from DB using lpId (same as publish-ftp-pages)
    if (!html && lpId) {
      const { data: lp, error: lpError } = await db
        .from('cloned_landing_pages')
        .select('transformed_html, original_html')
        .eq('id', lpId)
        .single();

      if (lpError || !lp) {
        throw new Error(`LP not found: ${lpError?.message}`);
      }
      html = lp.transformed_html || lp.original_html;
    }

    if (!html) {
      return new Response(JSON.stringify({ success: false, error: 'html is required (provide html in body or a valid lpId)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ─── Determine file path ───
    // isHomepage → "index.html"
    // pagePath="/produtos/xxx" → "produtos/xxx/index.html"
    let filePath: string;
    if (isHomepage) {
      filePath = 'index.html';
    } else {
      const cleanPath = (pagePath || '/').replace(/^\//, '').replace(/\/$/, '');
      filePath = cleanPath ? `${cleanPath}/index.html` : 'index.html';
    }

    console.log(`📦 Publishing to GitHub: ${GITHUB_BRANCH}/${filePath}`);

    // ─── Step a: GET current branch SHA ───
    const refRes = await githubFetch(githubPat, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH}`);
    if (!refRes.ok) {
      const body = await refRes.text();
      throw new Error(`Failed to get branch ref: ${refRes.status} ${body}`);
    }
    const refData = await refRes.json();
    const currentSha: string = refData.object.sha;
    console.log(`📌 Current branch SHA: ${currentSha}`);

    // ─── Step b: GET commit to find tree SHA ───
    const commitRes = await githubFetch(githubPat, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits/${currentSha}`);
    if (!commitRes.ok) {
      const body = await commitRes.text();
      throw new Error(`Failed to get commit: ${commitRes.status} ${body}`);
    }
    const commitData = await commitRes.json();
    const treeSha: string = commitData.tree.sha;
    console.log(`🌳 Base tree SHA: ${treeSha}`);

    // ─── Step c: POST blob with HTML content ───
    // Encode HTML to base64 (handles UTF-8 correctly)
    const base64Content = btoa(unescape(encodeURIComponent(html)));

    const blobRes = await githubFetch(githubPat, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/blobs`, {
      method: 'POST',
      body: JSON.stringify({
        content: base64Content,
        encoding: 'base64',
      }),
    });
    if (!blobRes.ok) {
      const body = await blobRes.text();
      throw new Error(`Failed to create blob: ${blobRes.status} ${body}`);
    }
    const blobData = await blobRes.json();
    const blobSha: string = blobData.sha;
    console.log(`📄 Blob SHA: ${blobSha}`);

    // ─── Step d: POST new tree ───
    const treeRes = await githubFetch(githubPat, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: treeSha,
        tree: [
          {
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: blobSha,
          }
        ],
      }),
    });
    if (!treeRes.ok) {
      const body = await treeRes.text();
      throw new Error(`Failed to create tree: ${treeRes.status} ${body}`);
    }
    const newTreeData = await treeRes.json();
    const newTreeSha: string = newTreeData.sha;
    console.log(`🌿 New tree SHA: ${newTreeSha}`);

    // ─── Step e: POST commit ───
    const now = new Date().toISOString();
    const commitMessage = `deploy: ${filePath} → ${DOMAIN} [${now}]`;

    const newCommitRes = await githubFetch(githubPat, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message: commitMessage,
        tree: newTreeSha,
        parents: [currentSha],
      }),
    });
    if (!newCommitRes.ok) {
      const body = await newCommitRes.text();
      throw new Error(`Failed to create commit: ${newCommitRes.status} ${body}`);
    }
    const newCommitData = await newCommitRes.json();
    const commitSha: string = newCommitData.sha;
    console.log(`✅ New commit SHA: ${commitSha}`);

    // ─── Step f: PATCH ref to update branch ───
    const patchRes = await githubFetch(githubPat, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: commitSha,
        force: false,
      }),
    });
    if (!patchRes.ok) {
      const body = await patchRes.text();
      throw new Error(`Failed to update branch ref: ${patchRes.status} ${body}`);
    }
    console.log(`🚀 Branch ${GITHUB_BRANCH} updated to ${commitSha}`);

    // ─── Build published URL ───
    const publishedUrl = isHomepage
      ? `https://${DOMAIN}/`
      : `https://${DOMAIN}${pagePath?.startsWith('/') ? pagePath : '/' + (pagePath || '')}`;

    // ─── Update DB if lpId provided ───
    if (lpId) {
      const { error: updateError } = await db
        .from('cloned_landing_pages')
        .update({
          publish_status: 'published',
          published_url: publishedUrl,
          published_at: new Date().toISOString(),
        })
        .eq('id', lpId);

      if (updateError) {
        console.error('⚠️ DB update failed (but Git push succeeded):', updateError);
      } else {
        console.log(`✅ DB updated for LP ${lpId}`);
      }
    }

    console.log(`🎉 Published successfully: ${publishedUrl}`);

    return new Response(JSON.stringify({
      success: true,
      publishedUrl,
      commitSha,
      filePath,
      branch: GITHUB_BRANCH,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ publish-git-kinghost error:', error);

    // Try to update LP with error status
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.lpId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const db = createClient(supabaseUrl, supabaseServiceKey);
        await db.from('cloned_landing_pages').update({
          publish_status: 'error',
          publish_error_message: (error as Error).message,
        }).eq('id', body.lpId);
      }
    } catch (_) { }

    return new Response(JSON.stringify({
      success: false,
      error: (error as Error).message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
