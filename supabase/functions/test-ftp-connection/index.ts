import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FTP_TIMEOUT = 15000;

class RealFTPClient {
  private conn: Deno.TcpConn | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private buffer = '';
  private serverBanner = '';

  async connect(hostname: string, port: number): Promise<string> {
    this.conn = await Deno.connect({ hostname, port });
    this.reader = this.conn.readable.getReader();
    const welcome = await this.readResponse();
    this.serverBanner = welcome;
    if (!welcome.startsWith('220')) {
      throw new Error(`Servidor não respondeu 220. Resposta: ${welcome}`);
    }
    return welcome;
  }

  async login(user: string, pass: string): Promise<string> {
    const userResp = await this.sendCommand(`USER ${user}`);
    if (!userResp.startsWith('331')) {
      throw new Error(`USER falhou. Resposta: ${userResp}`);
    }
    const passResp = await this.sendCommand(`PASS ${pass}`);
    if (!passResp.startsWith('230')) {
      throw new Error(`Login falhou. Resposta: ${passResp}`);
    }
    return passResp;
  }

  async cwd(path: string): Promise<string> {
    const resp = await this.sendCommand(`CWD ${path}`);
    if (!resp.startsWith('250')) {
      throw new Error(`CWD falhou para "${path}". Resposta: ${resp}`);
    }
    return resp;
  }

  async pwd(): Promise<string> {
    const resp = await this.sendCommand('PWD');
    return resp;
  }

  async quit(): Promise<void> {
    try {
      await this.sendCommand('QUIT');
    } catch { /* ignore */ }
    this.close();
  }

  close() {
    try { this.reader?.cancel(); } catch { /* */ }
    try { this.conn?.close(); } catch { /* */ }
    this.conn = null;
    this.reader = null;
  }

  get banner() { return this.serverBanner; }

  private async sendCommand(cmd: string): Promise<string> {
    if (!this.conn) throw new Error('Não conectado');
    const writer = this.conn.writable.getWriter();
    await writer.write(this.encoder.encode(cmd + '\r\n'));
    writer.releaseLock();
    return await this.readResponse();
  }

  private async readResponse(): Promise<string> {
    if (!this.reader) throw new Error('Não conectado');
    
    while (true) {
      // Check if we have a complete line in buffer
      const nlIdx = this.buffer.indexOf('\n');
      if (nlIdx !== -1) {
        const line = this.buffer.substring(0, nlIdx).replace(/\r$/, '');
        this.buffer = this.buffer.substring(nlIdx + 1);
        // FTP multi-line: if line matches "NNN-..." keep reading until "NNN ..."
        if (line.length >= 4 && line[3] === '-') {
          const code = line.substring(0, 3);
          let full = line;
          // Read until we get the final line "NNN ..."
          while (true) {
            const nextLine = await this.readSingleLine();
            full += '\n' + nextLine;
            if (nextLine.startsWith(code + ' ')) break;
          }
          return full;
        }
        return line;
      }
      
      const { value, done } = await this.reader.read();
      if (done) throw new Error('Conexão encerrada pelo servidor');
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }

  private async readSingleLine(): Promise<string> {
    if (!this.reader) throw new Error('Não conectado');
    while (true) {
      const nlIdx = this.buffer.indexOf('\n');
      if (nlIdx !== -1) {
        const line = this.buffer.substring(0, nlIdx).replace(/\r$/, '');
        this.buffer = this.buffer.substring(nlIdx + 1);
        return line;
      }
      const { value, done } = await this.reader.read();
      if (done) throw new Error('Conexão encerrada');
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { host, user, password, port = 21, remotePath = 'public_html' } = await req.json();

    // Sanitizar inputs
    if (host) {
      host = host.replace(/^https?:\/\//, '').replace(/[\s\t\r\n]/g, '').replace(/\/+$/, '').trim();
    }
    if (user) user = user.trim();

    if (!host || !user || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Host, usuário e senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Testando conexão FTP REAL: ${user}@${host}:${port}`);
    console.log(`📁 Caminho remoto: ${remotePath}`);

    const ftp = new RealFTPClient();
    const steps: string[] = [];

    // Wrap everything in a timeout
    const result = await Promise.race([
      (async () => {
        try {
          // Step 1: TCP Connect
          const banner = await ftp.connect(host, port);
          steps.push(`✅ Conectado: ${banner.substring(0, 100)}`);
          console.log(`✅ Banner: ${banner}`);

          // Step 2: Login
          await ftp.login(user, password);
          steps.push(`✅ Login OK: ${user}`);
          console.log(`✅ Login OK`);

          // Step 3: CWD to remote path
          if (remotePath) {
            await ftp.cwd(remotePath);
            steps.push(`✅ Diretório OK: ${remotePath}`);
            console.log(`✅ CWD OK: ${remotePath}`);
          }

          // Step 4: PWD to confirm
          const pwdResp = await ftp.pwd();
          steps.push(`✅ PWD: ${pwdResp.substring(0, 100)}`);

          // Step 5: Quit
          await ftp.quit();
          steps.push(`✅ Desconectado`);

          return { success: true, steps, banner: ftp.banner.substring(0, 200) };
        } catch (err) {
          ftp.close();
          return { success: false, error: err.message, steps };
        }
      })(),
      new Promise((_, reject) =>
        setTimeout(() => {
          ftp.close();
          reject(new Error(`FTP timeout após ${FTP_TIMEOUT / 1000}s`));
        }, FTP_TIMEOUT)
      )
    ]);

    const res = result as { success: boolean; error?: string; steps?: string[]; banner?: string };

    console.log(res.success ? '✅ Teste FTP completo' : `❌ Teste FTP falhou: ${res.error}`);

    return new Response(
      JSON.stringify({
        success: res.success,
        message: res.success ? 'Conexão FTP real testada com sucesso' : undefined,
        error: res.error,
        steps: res.steps,
        server_banner: res.banner,
      }),
      {
        status: res.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Erro no teste FTP:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
