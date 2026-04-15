import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const REPO_OWNER = 'SmartDentUSA';
const REPO_NAME = 'landing-craftsman-76';
const BRANCH = 'stable-website';
const GH_API = 'https://api.github.com';

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
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${body}`);
  return JSON.parse(body);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const githubToken = Deno.env.get('GITHUB_PAT_DEPLOY');
  if (!githubToken) {
    return new Response(JSON.stringify({ error: 'GITHUB_PAT_DEPLOY not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { files } = await req.json() as { files: { path: string; content: string }[] };

    if (!files || files.length === 0) throw new Error('No files provided');

    // Get branch ref
    const refData = await ghFetch(`/git/ref/heads/${BRANCH}`, githubToken);
    const latestCommitSha = refData.object.sha;

    // Get current commit tree
    const commitData = await ghFetch(`/git/commits/${latestCommitSha}`, githubToken);
    const baseTreeSha = commitData.tree.sha;

    // Create blobs for all files
    const treeItems = [];
    for (const file of files) {
      const blob = await ghFetch('/git/blobs', githubToken, {
        method: 'POST',
        body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      });
      treeItems.push({
        path: file.path.startsWith('/') ? file.path.slice(1) : file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      });
      console.log(`📄 Blob created for ${file.path}: ${blob.sha}`);
    }

    // Create tree
    const tree = await ghFetch('/git/trees', githubToken, {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
    });

    // Create commit
    const commit = await ghFetch('/git/commits', githubToken, {
      method: 'POST',
      body: JSON.stringify({
        message: `📄 Publish static files: ${files.map(f => f.path).join(', ')}`,
        tree: tree.sha,
        parents: [latestCommitSha],
      }),
    });

    // Update branch ref
    await ghFetch(`/git/refs/heads/${BRANCH}`, githubToken, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha }),
    });

    console.log(`✅ Published ${files.length} files, commit: ${commit.sha}`);

    return new Response(JSON.stringify({
      success: true,
      commitSha: commit.sha,
      files: files.map(f => f.path),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
