import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blake3 } from "https://deno.land/x/blake3@0.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function stringToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function calculateBlake3Hash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hash = await blake3(data);
  return hash.slice(0, 32);
}

interface StaticFile {
  path: string;     // e.g. "llms.txt", ".well-known/llms.txt"
  content: string;
  contentType?: string; // defaults to "text/plain"
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
  const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return new Response(JSON.stringify({ error: 'Cloudflare credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { files, domains } = await req.json() as { 
      files: StaticFile[]; 
      domains?: string[];  // if empty, publish to ALL cloudflare-enabled domains
    };

    if (!files || files.length === 0) throw new Error('No files provided');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all cloudflare-enabled domains from company_profile
    const { data: company } = await supabase
      .from('company_profile')
      .select('seo_domains')
      .limit(1)
      .maybeSingle();

    const seoDomains = (company?.seo_domains || []) as any[];
    const cloudflareDomains = seoDomains.filter((d: any) => 
      d.cloudflare_enabled && 
      d.cloudflare_project_name &&
      (!domains || domains.length === 0 || domains.includes(d.domain))
    );

    if (cloudflareDomains.length === 0) {
      return new Response(JSON.stringify({ error: 'No Cloudflare-enabled domains found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📄 Publishing ${files.length} static files to ${cloudflareDomains.length} Cloudflare domains`);

    const results: any[] = [];

    for (const domainConfig of cloudflareDomains) {
      const projectName = domainConfig.cloudflare_project_name;
      const domain = domainConfig.domain;
      console.log(`\n🌐 Domain: ${domain} (project: ${projectName})`);

      try {
        // Step 1: Calculate hashes for all files
        const fileEntries: { path: string; hash: string; content: string; contentType: string }[] = [];
        for (const file of files) {
          const hash = await calculateBlake3Hash(file.content);
          const filePath = file.path.startsWith('/') ? file.path : `/${file.path}`;
          fileEntries.push({
            path: filePath,
            hash,
            content: file.content,
            contentType: file.contentType || 'text/plain',
          });
          console.log(`  📄 ${filePath} → hash: ${hash}`);
        }

        // Step 2: Get upload token
        const tokenRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/upload-token`,
          { headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` } }
        );
        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.success || !tokenData.result?.jwt) {
          throw new Error(`Upload token failed: ${tokenData.errors?.[0]?.message || tokenRes.status}`);
        }
        const jwt = tokenData.result.jwt;

        // Step 3: Upload all file contents
        const uploadPayload = fileEntries.map(f => ({
          key: f.hash,
          value: stringToBase64(f.content),
          metadata: { contentType: f.contentType },
          base64: true,
        }));

        const uploadRes = await fetch('https://api.cloudflare.com/client/v4/pages/assets/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadPayload),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(`Upload failed: ${uploadData.errors?.[0]?.message || uploadRes.status}`);
        }

        // Step 4: Upsert hashes
        const hashes = fileEntries.map(f => f.hash);
        const upsertRes = await fetch('https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hashes }),
        });
        const upsertData = await upsertRes.json();
        if (!upsertRes.ok || !upsertData.success) {
          throw new Error(`Upsert hashes failed: ${upsertData.errors?.[0]?.message || upsertRes.status}`);
        }

        // Step 5: Create deployment with manifest
        const manifest: Record<string, string> = {};
        for (const f of fileEntries) {
          manifest[f.path] = f.hash;
        }

        const formData = new FormData();
        formData.append('manifest', JSON.stringify(manifest));

        const deployRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` },
            body: formData,
          }
        );
        const deployData = await deployRes.json();
        if (!deployRes.ok || !deployData.success) {
          throw new Error(`Deployment failed: ${deployData.errors?.[0]?.message || deployRes.status}`);
        }

        const deploymentUrl = deployData.result?.url || deployData.result?.aliases?.[0];
        console.log(`  ✅ Deployed to ${domain}: ${deploymentUrl}`);

        results.push({
          domain,
          project: projectName,
          success: true,
          deploymentId: deployData.result?.id,
          url: deploymentUrl,
          files: fileEntries.map(f => f.path),
        });

      } catch (error) {
        console.error(`  ❌ Failed for ${domain}:`, error);
        results.push({
          domain,
          project: projectName,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 Results: ${successCount}/${cloudflareDomains.length} domains succeeded`);

    return new Response(JSON.stringify({
      success: successCount > 0,
      totalDomains: cloudflareDomains.length,
      successCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
