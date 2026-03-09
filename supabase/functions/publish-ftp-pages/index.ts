import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Timeout wrapper ───
async function withTimeout<T>(promise: Promise<T>, ms = 30000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`FTP timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ─── FTP Client via Deno.connect() ───
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
    // Read until we get a complete response line (code + space)
    while (true) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error('FTP connection closed');
      this.buffer += this.decoder.decode(value);
      
      const lines = this.buffer.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        // Multi-line response ends with "code space" pattern
        if (/^\d{3} /.test(line)) {
          this.buffer = lines.slice(i + 1).join('\r\n');
          return line;
        }
      }
      // Keep incomplete data in buffer
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

  async mkd(path: string): Promise<boolean> {
    const resp = await this.sendCommand(`MKD ${path}`);
    // 257 = created, 550 = already exists (ok)
    return resp.startsWith('257');
  }

  async ensureDirectory(path: string) {
    const parts = path.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current += '/' + part;
      await this.mkd(current);
      // Ignore errors — directory may already exist
    }
  }

  async pasv(): Promise<{ host: string; port: number }> {
    // Try EPSV first (more reliable, returns only port)
    try {
      const epsvResp = await this.sendCommand('EPSV');
      if (epsvResp.startsWith('229')) {
        const epsvMatch = epsvResp.match(/\|{3}(\d+)\|/);
        if (epsvMatch) {
          return { host: this.host, port: parseInt(epsvMatch[1]) };
        }
      }
    } catch {
      // Fall through to PASV
    }

    const resp = await this.sendCommand('PASV');
    if (!resp.startsWith('227')) throw new Error(`PASV failed: ${resp}`);
    
    // Standard 6-number format: (h1,h2,h3,h4,p1,p2)
    const match6 = resp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/);
    if (match6) {
      const host = `${match6[1]}.${match6[2]}.${match6[3]}.${match6[4]}`;
      const port = parseInt(match6[5]) * 256 + parseInt(match6[6]);
      return { host, port };
    }
    
    // Some servers return non-standard responses - extract any numbers we can find
    const allNums = resp.match(/(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
    if (allNums) {
      const host = `${allNums[1]}.${allNums[2]}.${allNums[3]}.${allNums[4]}`;
      const port = parseInt(allNums[5]) * 256 + parseInt(allNums[6]);
      return { host, port };
    }
    
    throw new Error(`Cannot parse PASV response: ${resp}`);
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
    
    // Wait for transfer complete
    const completeResp = await this.readResponse();
    if (!completeResp.startsWith('226')) {
      console.warn(`⚠️ STOR complete response: ${completeResp}`);
    }
  }

  async quit() {
    try {
      await this.sendCommand('QUIT');
    } catch (_) {
      // Ignore errors on quit
    }
    try {
      this.conn.close();
    } catch (_) {
      // Ignore
    }
  }
}

// ─── Tracking pixel injection (inline, same as publish-cloudflare-pages) ───
function injectTrackingPixels(html: string, trackingPixels: any): string {
  if (!trackingPixels) return html;
  
  const scripts: string[] = [];
  
  // GTM
  if (trackingPixels.google_tag_manager?.enabled && trackingPixels.google_tag_manager?.container_id) {
    const gtmId = trackingPixels.google_tag_manager.container_id;
    scripts.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');</script>`);
  }
  
  // GA4 (only if GTM not active)
  if (!trackingPixels.google_tag_manager?.enabled && trackingPixels.google_analytics?.enabled && trackingPixels.google_analytics?.measurement_id) {
    const gaId = trackingPixels.google_analytics.measurement_id;
    scripts.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');</script>`);
  }
  
  // Meta Pixel
  if (trackingPixels.meta_pixel?.enabled && trackingPixels.meta_pixel?.pixel_id) {
    const pixelId = trackingPixels.meta_pixel.pixel_id;
    scripts.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');</script>`);
  }
  
  // TikTok Pixel
  if (trackingPixels.tiktok_pixel?.enabled && trackingPixels.tiktok_pixel?.pixel_id) {
    const pixelId = trackingPixels.tiktok_pixel.pixel_id;
    scripts.push(`<script>!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=[\"page\",\"track\",\"identify\",\"instances\",\"debug\",\"on\",\"off\",\"once\",\"ready\",\"alias\",\"group\",\"enableCookie\",\"disableCookie\"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i=\"https://analytics.tiktok.com/i18n/pixel/events.js\";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement(\"script\");o.type=\"text/javascript\";o.async=!0;o.src=i+\"?sdkid=\"+e+\"&lib=\"+t;var a=document.getElementsByTagName(\"script\")[0];a.parentNode.insertBefore(o,a)};ttq.load('${pixelId}');ttq.page()}(window,document,'ttq');</script>`);
  }
  
  if (scripts.length === 0) return html;
  
  const trackingBlock = scripts.join('\n');
  
  if (html.includes('</head>')) {
    return html.replace('</head>', `${trackingBlock}\n</head>`);
  }
  if (html.includes('</body>')) {
    return html.replace('</body>', `${trackingBlock}\n</body>`);
  }
  
  return html + trackingBlock;
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

    // Service role client for DB operations
    const db = createClient(supabaseUrl, supabaseServiceKey);

    // ─── Parse input ───
    const { lpId, domain, pagePath, isHomepage } = await req.json();
    
    if (!lpId || !domain) {
      return new Response(JSON.stringify({ success: false, error: 'lpId and domain are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📋 Publishing LP ${lpId} to ${domain}${pagePath || '/'}`);

    // ─── 1. Fetch LP HTML ───
    const { data: lp, error: lpError } = await db
      .from('cloned_landing_pages')
      .select('transformed_html, original_html, name, seo_config')
      .eq('id', lpId)
      .single();

    if (lpError || !lp) {
      throw new Error(`LP not found: ${lpError?.message}`);
    }

    let html = lp.transformed_html || lp.original_html;
    if (!html) throw new Error('LP has no HTML content');

    // ─── 2. Fetch domain config from seo_domains ───
    const { data: company, error: companyError } = await db
      .from('company_profile')
      .select('seo_domains, tracking_pixels')
      .limit(1)
      .single();

    if (companyError) throw new Error(`Company profile error: ${companyError.message}`);

    const seoDomains = (company?.seo_domains as any[]) || [];
    const domainConfig = seoDomains.find((d: any) => d.domain === domain);
    
    if (!domainConfig) throw new Error(`Domain ${domain} not found in seo_domains`);
    if (domainConfig.publish_method !== 'ftp') throw new Error(`Domain ${domain} is not configured for FTP`);
    
    const ftpProfile = domainConfig.ftp_profile;
    if (!ftpProfile) throw new Error(`No ftp_profile configured for domain ${domain}`);

    // ─── 3. Fetch FTP credentials from publication_settings ───
    const { data: pubSettings, error: pubError } = await db
      .from('publication_settings')
      .select('ftp_host, ftp_user, ftp_password_encrypted, ftp_port, ftp_remote_path')
      .eq('profile_name', ftpProfile)
      .single();

    if (pubError || !pubSettings) {
      throw new Error(`FTP profile "${ftpProfile}" not found in publication_settings`);
    }

    // ✅ Sanitizar credenciais FTP (remover protocolo, espaços, tabs)
    const ftpHost = (pubSettings.ftp_host || '').replace(/^https?:\/\//, '').replace(/[\s\t\r\n]/g, '').replace(/\/+$/, '').trim();
    const ftpUser = (pubSettings.ftp_user || '').trim();
    const ftpPass = pubSettings.ftp_password_encrypted;
    const baseRemotePath = domainConfig.ftp_remote_path || pubSettings.ftp_remote_path || '/public_html';
    
    // ✅ FTP usa porta 21, porta 22 é SSH/SFTP (não suportado)
    let ftpPort = pubSettings.ftp_port || 21;
    if (ftpPort === 22) {
      console.warn('⚠️ Porta 22 é SSH/SFTP, não FTP. Usando porta 21 como fallback.');
      ftpPort = 21;
    }

    if (!ftpHost || !ftpUser || !ftpPass) {
      throw new Error(`Incomplete FTP credentials for profile "${ftpProfile}"`);
    }

    // ─── 4. Inject tracking pixels ───
    const trackingPixels = company?.tracking_pixels;
    html = injectTrackingPixels(html, trackingPixels);
    console.log('✅ Tracking pixels injected');

    // ─── 4b. Inject nav-data.js script for incremental footer ───
    const navScript = `<script src="/nav-data.js" defer></script>`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${navScript}\n</body>`);
    } else {
      html += navScript;
    }

    // ─── 5. FTP Upload ───
    const finalPath = pagePath || '/';
    const remoteDirPath = isHomepage 
      ? baseRemotePath 
      : `${baseRemotePath}${finalPath}`;
    
    const publishedUrl = isHomepage 
      ? `https://${domain}/` 
      : `https://${domain}${finalPath}`;

    console.log(`📁 FTP target: ${ftpHost}:${ftpPort} → ${remoteDirPath}/index.html`);

    const ftp = new FTPClient();
    
    try {
      const ftpWork = (async () => {
        await ftp.connect(ftpHost, ftpPort);
        await ftp.login(ftpUser, ftpPass);
        await ftp.setBinary();
        
        // Ensure directory exists
        await ftp.ensureDirectory(remoteDirPath);
        await ftp.cwd(remoteDirPath);
        
        // Upload HTML
        const htmlBytes = new TextEncoder().encode(html);
        await ftp.stor('index.html', htmlBytes);
        
        console.log(`✅ Uploaded index.html (${htmlBytes.length} bytes) to ${remoteDirPath}`);
        
        await ftp.quit();
      })();
      await withTimeout(ftpWork, 30000);
    } catch (ftpError) {
      // Try to quit gracefully
      try { await ftp.quit(); } catch (_) { }
      throw ftpError;
    }

    // ─── 6. Update DB ───
    const { error: updateError } = await db
      .from('cloned_landing_pages')
      .update({
        publish_status: 'published',
        published_url: publishedUrl,
        published_at: new Date().toISOString(),
      })
      .eq('id', lpId);

    if (updateError) {
      console.error('⚠️ DB update failed (but FTP upload succeeded):', updateError);
    }

    // ─── 7. Generate and upload nav-data.js (incremental footer) ───
    try {
      const { data: allPublished } = await db
        .from('cloned_landing_pages')
        .select('name, published_url, page_path, is_homepage, product, brand')
        .eq('target_domain', domain)
        .eq('publish_status', 'published')
        .order('is_homepage', { ascending: false })
        .order('name');

      if (allPublished && allPublished.length > 0) {
        const navItems = allPublished.map((p: any) => ({
          name: p.name || p.product || 'Página',
          url: p.published_url || `https://${domain}${p.page_path || '/'}`,
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

        // Upload nav-data.js to the root of the domain
        const ftp2 = new FTPClient();
        try {
          await ftp2.connect(ftpHost, ftpPort);
          await ftp2.login(ftpUser, ftpPass);
          await ftp2.setBinary();
          await ftp2.cwd(baseRemotePath);
          await ftp2.stor('nav-data.js', navBytes);
          console.log(`✅ nav-data.js uploaded (${navBytes.length} bytes) with ${navItems.length} pages`);
          await ftp2.quit();
        } catch (navErr) {
          console.warn('⚠️ Failed to upload nav-data.js:', (navErr as Error).message);
          try { await ftp2.quit(); } catch (_) { }
        }
      }
    } catch (navError) {
      console.warn('⚠️ nav-data.js generation failed:', (navError as Error).message);
    }

    console.log(`🎉 Published successfully: ${publishedUrl}`);

    return new Response(JSON.stringify({
      success: true,
      deployment: {
        publishedUrl,
        method: 'ftp',
        domain,
        path: finalPath,
        remotePath: remoteDirPath,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ publish-ftp-pages error:', error);
    
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
