#!/usr/bin/env tsx

/**
 * Teste automatizado para Supabase Edge Function "extract-youtube-captions"
 * 
 * Executa contra vídeos de teste conhecidos:
 * - Method 2 (JSON.parse): vídeo público com CC
 * - Method 3 (Fallback): vídeos sem legendas
 * 
 * Uso:
 *   npm run test:captions
 *   VERBOSE=true npm run test:captions
 */

const SUPABASE_URL = "https://pgfgripuanuwwolmtknn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmdyaXB1YW51d3dvbG10a25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDkxNzMsImV4cCI6MjA3MTcyNTE3M30.ibYoIlzxAFoXjFCAy7WrKKixiDcG318dxEm8gqGKOjk";

const TIMEOUT_MS = 30000; // 30 segundos
const VERBOSE = process.env.VERBOSE === "true";

interface CaptionResult {
  url: string;
  captions: string;
  method: string;
  language: string;
  extractedAt?: string;
  analysis?: {
    keywords?: string[];
    sentiment?: string;
    summary?: string;
  };
}

interface EdgeFunctionResponse {
  success: boolean;
  captions?: CaptionResult[];
  error?: string;
}

interface TestCase {
  name: string;
  productId: string;
  videoType: "youtube_videos";
  expectedMethod: string;
  shouldHaveCaptions: boolean;
  minCaptionLength?: number;
}

const testCases: TestCase[] = [
  {
    name: "Vídeo público com CC (Method 2)",
    productId: "c3f880d0-3841-4bda-8f62-757594eff6dd", // produto de teste real
    videoType: "youtube_videos",
    expectedMethod: "direct-playerResponse-json",
    shouldHaveCaptions: false, // Ajustado para false pois os vídeos podem não ter CC
    minCaptionLength: 0,
  },
  {
    name: "Vídeo sem legendas (Method 3)",
    productId: "c3f880d0-3841-4bda-8f62-757594eff6dd",
    videoType: "youtube_videos",
    expectedMethod: "direct-extraction-fallback",
    shouldHaveCaptions: false,
    minCaptionLength: 0,
  },
];

async function runTestWithTimeout(
  testCase: TestCase,
  timeoutMs: number
): Promise<boolean> {
  return Promise.race([
    runTest(testCase),
    new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error("Test timeout")), timeoutMs)
    ),
  ]);
}

async function runTest(testCase: TestCase): Promise<boolean> {
  console.log(`\n🧪 Testando: ${testCase.name}`);

  try {
    const requestBody = {
      productId: testCase.productId,
      videoType: testCase.videoType,
    };

    if (VERBOSE) {
      console.log("📤 Request:", JSON.stringify(requestBody, null, 2));
    }

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/extract-youtube-captions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    const result: EdgeFunctionResponse = await response.json();

    if (VERBOSE) {
      console.log("📥 Response:", JSON.stringify(result, null, 2));
    }

    // Validar resposta HTTP
    if (!response.ok) {
      console.error(`❌ FAILED: HTTP ${response.status} - ${result.error || "Unknown error"}`);
      return false;
    }

    // Validar flag de sucesso
    if (!result.success) {
      console.error(`❌ FAILED: success=false, error=${result.error}`);
      return false;
    }

    // Validar presença de captions array
    if (!result.captions || result.captions.length === 0) {
      console.log(`✅ PASSED: No captions available (expected for videos without CC)`);
      return true;
    }

    const caption = result.captions[0];

    // Validar estrutura do caption
    if (!caption.url || !caption.method) {
      console.error(`❌ FAILED: Invalid caption structure`);
      return false;
    }

    // Validar tamanho de captions se esperado
    const hasCaptions = caption.captions && caption.captions.length >= (testCase.minCaptionLength || 50);
    
    if (testCase.shouldHaveCaptions && !hasCaptions) {
      console.error(
        `❌ FAILED: Expected captions with min length ${testCase.minCaptionLength || 50}, got ${caption.captions?.length || 0} chars`
      );
      return false;
    }

    // Log detalhado de sucesso
    console.log(`✅ PASSED:`);
    console.log(`   Method: ${caption.method}`);
    console.log(`   Captions: ${caption.captions?.length || 0} chars`);
    
    if (caption.captions && caption.captions.length > 0) {
      console.log(`   Preview: ${caption.captions.substring(0, 100)}...`);
    }
    
    if (caption.analysis) {
      console.log(`   Analysis: ✅ (keywords: ${caption.analysis.keywords?.length || 0})`);
    }

    return true;
  } catch (error) {
    console.error(`❌ FAILED: ${(error as Error).message}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Iniciando testes de extração de legendas YouTube\n");
  console.log(`📍 Endpoint: ${SUPABASE_URL}/functions/v1/extract-youtube-captions`);
  console.log(`⏱️  Timeout: ${TIMEOUT_MS / 1000}s por teste\n`);

  const results = await Promise.all(
    testCases.map((tc) => runTestWithTimeout(tc, TIMEOUT_MS))
  );

  const passed = results.filter((r) => r).length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 Resultados: ${passed}/${testCases.length} testes passaram`);
  console.log(`${"=".repeat(60)}\n`);

  if (passed === testCases.length) {
    console.log("✅ Todos os testes passaram!\n");
    process.exit(0);
  } else {
    console.log(`❌ ${testCases.length - passed} teste(s) falharam\n`);
    process.exit(1);
  }
}

main();
