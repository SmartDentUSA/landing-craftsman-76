#!/usr/bin/env tsx

/**
 * Script interativo para gerar YOUTUBE_REFRESH_TOKEN
 * 
 * Pré-requisitos:
 * 1. Criar projeto no Google Cloud Console
 * 2. Ativar YouTube Data API v3
 * 3. Criar credenciais OAuth 2.0 (Web Application)
 * 4. Adicionar redirect URI: http://localhost:3000/oauth2/callback
 * 
 * Uso:
 *   npm run oauth:youtube
 */

import * as readline from "readline";
import * as http from "http";
import { URL } from "url";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

async function startLocalServer(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!req.url) {
        res.writeHead(400);
        res.end("Invalid request");
        return;
      }

      const url = new URL(req.url, `http://localhost:${port}`);
      const code = url.searchParams.get("code");

      if (code) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h1>✅ Autorização concluída!</h1>
              <p>Feche esta janela e volte ao terminal.</p>
            </body>
          </html>
        `);
        server.close();
        resolve(code);
      } else {
        res.writeHead(400);
        res.end("Authorization code not found");
        reject(new Error("No code parameter"));
      }
    });

    server.listen(port, () => {
      console.log(`\n🌐 Servidor local rodando em http://localhost:${port}`);
    });

    server.on("error", reject);
  });
}

async function main() {
  console.log("🔑 Gerador de YOUTUBE_REFRESH_TOKEN\n");

  const clientId = await prompt("YOUTUBE_CLIENT_ID: ");
  const clientSecret = await prompt("YOUTUBE_CLIENT_SECRET: ");
  const redirectUri = "http://localhost:3000/oauth2/callback";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/youtube.force-ssl");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("\n📋 Abra este URL no navegador:\n");
  console.log(authUrl.toString());
  console.log("\n⏳ Aguardando autorização...\n");

  try {
    const code = await startLocalServer(3000);
    console.log("\n✅ Code recebido, trocando por tokens...\n");

    const tokens = await exchangeCodeForToken(code, clientId, clientSecret, redirectUri);

    console.log("🎉 Tokens obtidos com sucesso!\n");
    console.log("📝 Adicione estes secrets no Supabase Dashboard:\n");
    console.log(`YOUTUBE_CLIENT_ID=${clientId}`);
    console.log(`YOUTUBE_CLIENT_SECRET=${clientSecret}`);
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n⚠️  Guarde o REFRESH_TOKEN com segurança!\n");
  } catch (error) {
    console.error("\n❌ Erro:", (error as Error).message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
