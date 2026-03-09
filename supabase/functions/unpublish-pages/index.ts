import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blake3 } from "https://esm.sh/hash-wasm@4.11.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Timeout wrapper ───
async function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── FTP Client (same as publish-ftp-pages) ───
class FTPClient {
  private conn!: Deno.Conn;
  private reader!: ReadableStreamDefaultReader<Uint8Array>;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private buffer = '';

  async connect(host: string, port: number) {
    this.conn = await Deno.connect({ hostname: host, port, transport: 'tcp' });
    this.reader = this.conn.readable.getReader();
    const welcome = await this.readResponse();
    console.log('📡 FTP Welcome:', welcome);
    if (!welcome.startsWith('220')) throw new Error(`FTP connect failed: ${welcome}`);
  }

  private async readResponse(): Promise<string> {
    while (true) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error('FTP connection closed');
      this.buffer += this.decoder.decode(value);
      const lines = this.buffer.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (/^\d{3} /.test(line)) {
          this.buffer = lines.slice(i + 1).join('\r\n');
          return line;
        }
      }
      if (lines.length > 1) {
        this.buffer = lines[lines.length - 1];
      }
    }
  }

  async sendCommand(cmd: string): Promise<string> {
    const data = this.encoder.encode(cmd + '\r\n');
    const writer = this.conn.writable.getWriter();
    await writer.write(data);
    writer.releaseLock();
    const response = await this.readResponse();
    console.log(`📤 ${cmd.startsWith('PASS') ? 'PASS ***' : cmd} → ${response}`);
    return response;
  }

  async login(user: string, pass: string) {
    const userResp = await this.sendCommand(`USER ${user}`);
    if (!userResp.startsWith('331')) throw new Error(`FTP USER failed: ${userResp}`);
    const passResp = await this.sendCommand(`PASS ${pass}`);
    if (!passResp.startsWith('230')) throw new Error(`FTP PASS failed: ${passResp}`);
  }

  async setBinary() {
    const resp = await this.sendCommand('TYPE I');
    if (!resp.startsWith('200')) throw new Error(`TYPE I failed: ${resp}`);
  }

  async cwd(path: string) {
    const resp = await this.sendCommand(`CWD ${path}`);
    if (!resp.startsWith('250')) throw new Error(`CWD ${path} failed: ${resp}`);
  }

  async dele(filename: string): Promise<boolean> {
    const resp = await this.sendCommand(`DELE ${filename}`);
    return resp.startsWith('250');
  }

  async pasv(): Promise<{ host: string; port: number }> {
    const resp = await this.sendCommand('PASV');
    if (!resp.startsWith('227')) throw new Error(`PASV failed: ${resp}`);
    const match = resp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (!match) throw new Error(`Cannot parse PASV response: ${resp}`);
    const host = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`;
    const port = parseInt(match[5]) * 256 + parseInt(match[6]);
    return { host, port };
  }

  async stor(filename: string, content: Uint8Array) {
    const { host, port } = await this.pasv();
    const dataConn = await Deno.connect({ hostname: host, port, transport: 'tcp' });
    const storResp = await this.sendCommand(`STOR ${filename}`);
    if (!storResp.startsWith('150') && !storResp.startsWith('125')) {
      dataConn.close();
      throw new Error(`STOR failed: ${storResp}`);
    }
    const writer = dataConn.writable.getWriter();
    await writer.write(content);
    await writer.close();
    const completeResp = await this.readResponse();
    if (!completeResp.startsWith('226')) {
      console.warn(`⚠️ STOR complete response: ${completeResp}`);
    }
  }

  async quit() {
    try { await this.sendCommand('QUIT'); } catch (_) { }
    try { this.conn.close(); } catch (_) { }
  }
}

// ─── Cloudflare redirect page ───
function generateRedirectHTML(domain: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=https://${domain}/">
  <link rel="canonical" href="https://${domain}/">
  <title>Redirecionando...</title>
  <meta name="robots" content="noindex, nofollow">
</head>
<body>
  <p>Redirecionando para <a href="https://${domain}/">https://${domain}/</a></p>
</body>
</html>`;
}

// ─── Cloudflare deploy helpers ───
async function calculateBlake3Hash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hash = await blake3(data);
  return hash.slice(0, 32);
}

function stringToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lpId, publicationId, entityType = 'lp' } = await req.json();

    if (!lpId && !publicationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'lpId ou publicationId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const db = createClient(supabaseUrl, supabaseServiceKey);

    let targetDomain: string;
    let pagePath: string;
    let isHomepage: boolean;

    // ─── 1. Fetch entity data ───
    if (entityType === 'blog' && publicationId) {
      const { data: pub, error } = await db
        .from('product_blog_publications')
        .select('target_domain, page_path, publish_status')
        .eq('id', publicationId)
        .single();
      if (error || !pub) throw new Error('Publicação de blog não encontrada');
      if (pub.publish_status !== 'published') throw new Error('Blog não está publicado');
      targetDomain = pub.target_domain;
      pagePath = pub.page_path;
      isHomepage = false;
    } else {
      const { data: lp, error } = await db
        .from('cloned_landing_pages')
        .select('target_domain, page_path, is_homepage, publish_status')
        .eq('id', lpId)
        .single();
      if (error || !lp) throw new Error('Landing Page não encontrada');
      if (lp.publish_status !== 'published' && lp.publish_status !== 'success') throw new Error('LP não está publicada');
      targetDomain = lp.target_domain;
      pagePath = lp.page_path || '/';
      isHomepage = lp.is_homepage || false;
    }

    if (!targetDomain) throw new Error('Domínio de destino não definido');

    console.log(`🗑️ Unpublishing ${entityType}: domain=${targetDomain}, path=${pagePath}, homepage=${isHomepage}`);

    // ─── 2. Get domain config ───
    const { data: company, error: companyError } = await db
      .from('company_profile')
      .select('seo_domains')
      .limit(1)
      .single();

    if (companyError) throw new Error(`Erro ao buscar perfil: ${companyError.message}`);

    const seoDomains = (company?.seo_domains as any[]) || [];
    const domainConfig = seoDomains.find((d: any) => d.domain === targetDomain);
    if (!domainConfig) throw new Error(`Domínio "${targetDomain}" não encontrado em seo_domains`);

    const publishMethod = domainConfig.publish_method || 'cloudflare';
    console.log(`📡 Publish method: ${publishMethod}`);

    // ─── 3. Remove from remote ───
    if (publishMethod === 'ftp') {
      // FTP: Delete index.html from the remote directory
      const ftpProfile = domainConfig.ftp_profile;
      if (!ftpProfile) throw new Error(`Sem ftp_profile para domínio ${targetDomain}`);

      const { data: pubSettings, error: pubError } = await db
        .from('publication_settings')
        .select('ftp_host, ftp_user, ftp_password_encrypted, ftp_port, ftp_remote_path')
        .eq('profile_name', ftpProfile)
        .single();

      if (pubError || !pubSettings) throw new Error(`FTP profile "${ftpProfile}" não encontrado`);

      const ftpHost = (pubSettings.ftp_host || '').replace(/^https?:\/\//, '').replace(/[\s\t\r\n]/g, '').replace(/\/+$/, '').trim();
      const ftpUser = (pubSettings.ftp_user || '').trim();
      const ftpPass = pubSettings.ftp_password_encrypted;
      let ftpPort = pubSettings.ftp_port || 21;
      if (ftpPort === 22) ftpPort = 21;

      const baseRemotePath = domainConfig.ftp_remote_path || pubSettings.ftp_remote_path || '/public_html';
      const remoteDirPath = isHomepage ? baseRemotePath : `${baseRemotePath}${pagePath}`;

      console.log(`📁 FTP delete target: ${ftpHost}:${ftpPort} → ${remoteDirPath}/index.html`);

      const ftp = new FTPClient();
      try {
        const ftpWork = (async () => {
          await ftp.connect(ftpHost, ftpPort);
          await ftp.login(ftpUser, ftpPass);
          await ftp.setBinary();
          await ftp.cwd(remoteDirPath);

          // Upload redirect page instead of deleting (safer for SEO)
          const redirectHTML = generateRedirectHTML(targetDomain);
          const redirectBytes = new TextEncoder().encode(redirectHTML);
          await ftp.stor('index.html', redirectBytes);
          console.log(`✅ Replaced index.html with redirect in ${remoteDirPath}`);

          await ftp.quit();
        })();
        await withTimeout(ftpWork, 30000);
      } catch (ftpError) {
        try { await ftp.quit(); } catch (_) { }
        throw ftpError;
      }

      // Regenerate nav-data.js excluding this page
      try {
        const { data: allPublished } = await db
          .from('cloned_landing_pages')
          .select('name, published_url, page_path, is_homepage, product, brand')
          .eq('target_domain', targetDomain)
          .eq('publish_status', 'published')
          .neq('id', lpId || '')
          .order('is_homepage', { ascending: false })
          .order('name');

        const navItems = (allPublished || []).map((p: any) => ({
          name: p.name || p.product || 'Página',
          url: p.published_url || `https://${targetDomain}${p.page_path || '/'}`,
          isHome: p.is_homepage || false,
          brand: p.brand || null,
        }));

        const navScript = `/* Smart Dent Navigation Data - Auto-generated */
window.__NAV_DATA__ = ${JSON.stringify(navItems, null, 2)};
(function() {
  var data = window.__NAV_DATA__;
  if (!data || data.length < 2) return;
  var nav = document.createElement('nav');
  nav.id = 'smartdent-nav-footer';
  nav.style.cssText = 'background:#1a1a2e;padding:24px 16px;text-align:center;margin-top:40px;border-top:2px solid #16213e;';
  var title = document.createElement('p');
  title.style.cssText = 'color:#e2e8f0;font-size:14px;font-weight:600;margin:0 0 12px 0;';
  title.textContent = 'Navegue por nossas páginas:';
  nav.appendChild(title);
  var links = document.createElement('div');
  links.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:8px;';
  data.forEach(function(item) {
    if (item.url === window.location.href) return;
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
  document.body.appendChild(nav);
})();`;

        const navBytes = new TextEncoder().encode(navScript);
        const ftp2 = new FTPClient();
        try {
          await ftp2.connect(ftpHost, ftpPort);
          await ftp2.login(ftpUser, ftpPass);
          await ftp2.setBinary();
          await ftp2.cwd(baseRemotePath);
          await ftp2.stor('nav-data.js', navBytes);
          console.log(`✅ nav-data.js updated (removed unpublished page)`);
          await ftp2.quit();
        } catch (navErr) {
          console.warn('⚠️ Failed to update nav-data.js:', (navErr as Error).message);
          try { await ftp2.quit(); } catch (_) { }
        }
      } catch (navError) {
        console.warn('⚠️ nav-data.js regeneration failed:', (navError as Error).message);
      }

    } else if (publishMethod === 'cloudflare') {
      // Cloudflare: Deploy a redirect page to replace the content
      const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');
      const CLOUDFLARE_ACCOUNT_ID = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');

      if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
        throw new Error('Credenciais Cloudflare não configuradas');
      }

      const projectName = domainConfig.cloudflare_project_name;
      if (!projectName) throw new Error('cloudflare_project_name não configurado');

      const redirectHTML = generateRedirectHTML(targetDomain);
      const filePath = isHomepage || pagePath === '/' ? '/index.html' : `/${pagePath.replace(/^\//, '')}/index.html`;

      console.log(`☁️ Cloudflare: deploying redirect to ${projectName}${filePath}`);

      // Step 1: BLAKE3 hash
      const contentHash = await calculateBlake3Hash(redirectHTML);

      // Step 2: Get upload token
      const tokenResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/upload-token`,
        { headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}` } }
      );
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.success || !tokenData.result?.jwt) {
        throw new Error(tokenData.errors?.[0]?.message || 'Falha ao obter token Cloudflare');
      }

      const jwtToken = tokenData.result.jwt;

      // Step 3: Upload redirect content
      const base64Content = stringToBase64(redirectHTML);
      const uploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/pages/assets/upload`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([{ key: contentHash, value: base64Content, metadata: { contentType: 'text/html' }, base64: true }])
        }
      );
      const uploadData = await uploadResponse.json();
      if (!uploadResponse.ok || !uploadData.success) {
        throw new Error(uploadData.errors?.[0]?.message || 'Falha no upload Cloudflare');
      }

      // Step 4: Upsert hashes
      const upsertResponse = await fetch(
        `https://api.cloudflare.com/client/v4/pages/assets/upsert-hashes`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwtToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hashes: [contentHash] })
        }
      );
      const upsertData = await upsertResponse.json();
      if (!upsertResponse.ok || !upsertData.success) {
        throw new Error(upsertData.errors?.[0]?.message || 'Falha ao registrar hashes');
      }

      // Step 5: Create deployment with manifest
      const manifest: Record<string, string> = { [filePath]: contentHash };
      const deployResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${projectName}/deployments`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ manifest })
        }
      );
      const deployData = await deployResponse.json();
      if (!deployResponse.ok || !deployData.success) {
        throw new Error(deployData.errors?.[0]?.message || 'Falha no deployment Cloudflare');
      }

      console.log(`✅ Cloudflare redirect deployed for ${filePath}`);
    } else {
      throw new Error(`Método de publicação "${publishMethod}" não suportado para despublicação`);
    }

    // ─── 4. Update database ───
    if (entityType === 'blog' && publicationId) {
      await db
        .from('product_blog_publications')
        .update({ publish_status: 'draft', published_url: null })
        .eq('id', publicationId);
    } else if (lpId) {
      await db
        .from('cloned_landing_pages')
        .update({ publish_status: 'draft', published_url: null })
        .eq('id', lpId);
    }

    console.log(`🎉 Unpublished successfully!`);

    return new Response(
      JSON.stringify({ success: true, message: 'Conteúdo despublicado e removido do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ unpublish-pages error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
