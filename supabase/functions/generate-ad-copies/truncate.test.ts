/**
 * Unit tests for intelligentTruncate (the v3 fix).
 * Run with: deno test supabase/functions/generate-ad-copies/truncate.test.ts
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { intelligentTruncate, normalize, detectMetaPattern } from "../_shared/text-utils.ts";

Deno.test("intelligentTruncate: text shorter than max returns unchanged", () => {
  assertEquals(intelligentTruncate("Antibacteriana", 30), "Antibacteriana");
});

Deno.test("intelligentTruncate: exactly maxLength returns unchanged", () => {
  // 30 chars exactly
  const text = "Exato com 30 caracteres hoje!!"; // 30 chars
  assertEquals(text.length, 30);
  assertEquals(intelligentTruncate(text, 30), text);
});

Deno.test("intelligentTruncate: cuts at last space when above 50% threshold", () => {
  // "Resina 3D Smart Print Bio Vitality" = 34 chars
  // truncated[0..30] = "Resina 3D Smart Print Bio Vita" → lastSpace at 25 → 25/30 = 0.83 → cut
  const result = intelligentTruncate("Resina 3D Smart Print Bio Vitality", 30);
  assertEquals(result, "Resina 3D Smart Print Bio");
});

Deno.test("intelligentTruncate: hard-cuts when last space is below 50%", () => {
  // "Super ResinaOdontologicaPremium3DParaCoroas" — first space at index 5 (Super<space>)
  // truncated[0..30] lastSpace = 5 → 5/30 = 0.17 < 0.5 → hard cut at 30
  const result = intelligentTruncate("Super ResinaOdontologicaPremium3DParaCoroas", 30);
  assertEquals(result, "Super ResinaOdontologicaPremi");
});

Deno.test("intelligentTruncate: single long word with no space → hard-cut", () => {
  const result = intelligentTruncate("Palavraunicaextremamentelongasemespacos", 30);
  assertEquals(result, "Palavraunicaextremamentelongas");
});

Deno.test("intelligentTruncate: empty string returns empty", () => {
  assertEquals(intelligentTruncate("", 30), "");
});

Deno.test("intelligentTruncate: null input returns empty", () => {
  assertEquals(intelligentTruncate(null, 30), "");
});

Deno.test("intelligentTruncate: undefined input returns empty", () => {
  assertEquals(intelligentTruncate(undefined, 30), "");
});

Deno.test("intelligentTruncate: never appends ellipsis", () => {
  const result = intelligentTruncate("Long copy that needs truncating for sure", 20);
  assertEquals(result.endsWith("..."), false);
});

Deno.test("normalize: case + accent insensitive", () => {
  assertEquals(normalize("Resina 3D Premium"), "resina 3d premium");
  assertEquals(normalize("RESINA 3D PRÊMIUM"), "resina 3d premium");
  assertEquals(normalize("resina 3d prêmium"), "resina 3d premium");
});

Deno.test("normalize: handles null/undefined", () => {
  assertEquals(normalize(null), "");
  assertEquals(normalize(undefined), "");
});

Deno.test("detectMetaPattern: catches 'palavras-chave do produto'", () => {
  assertEquals(detectMetaPattern("palavras-chave do produto"), "LLM_META_PATTERN");
});

Deno.test("detectMetaPattern: catches 'taxonomia dos produtos'", () => {
  assertEquals(detectMetaPattern("taxonomia dos produtos"), "LLM_META_PATTERN");
});

Deno.test("detectMetaPattern: catches without accents 'glossario do produto'", () => {
  assertEquals(detectMetaPattern("glossario do produto"), "LLM_META_PATTERN");
});

Deno.test("detectMetaPattern: catches template placeholder", () => {
  assertEquals(detectMetaPattern("[nome do produto]"), "TEMPLATE_PLACEHOLDER");
});

Deno.test("detectMetaPattern: does NOT catch legitimate 'categorias de resina dental'", () => {
  assertEquals(detectMetaPattern("categorias de resina dental"), null);
});

Deno.test("detectMetaPattern: does NOT catch 'resina 3d para coroas'", () => {
  assertEquals(detectMetaPattern("resina 3d para coroas"), null);
});

Deno.test("detectMetaPattern: catches standalone 'ai_keywords'", () => {
  assertEquals(detectMetaPattern("ai_keywords"), "STANDALONE:ai_keywords");
});
