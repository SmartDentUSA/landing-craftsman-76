# Hotfix WCAG — Validador 3-contrastes + Paleta dos 4 Presets

## Problema

O validador atual mede só `accentColor` vs branco (2.90:1 ✗ para `#E97935`). Mas em vários presets o CTA não usa branco como texto, então a métrica é errada **e** a paleta atual força combinações que falham WCAG AA quando renderizadas.

**Regra de ouro:** texto branco em `#E97935` = 2.90:1 ✗. Em fundo laranja, sempre usar `#1a2942` (navyDark) como texto = 5.04:1 ✓. O laranja oficial não muda — o que muda é a cor do texto sobre ele.

**Nota técnica importante:** as chaves dos presets ficam em **inglês** (`modern | minimal | bold | clinical`), porque já são o tipo `DisplayStyle` em `src/types/google-ads.ts` e são consumidas pela edge function `generate-display-banners`. Renomear para PT (`moderno | minimalista | clinico`) quebraria o type system e a função. Apenas `label` continua em PT (já é assim hoje).

## Mudanças

### 1. `src/components/google-ads/smartdent-constants.ts`

- Adicionar `bgDominant: string` em `StylePresetConfig` (cor sólida usada pelo validador, derivada do gradient — gradient continua aplicado no CSS).
- Reescrever os 4 presets conforme tabela abaixo (mantendo as chaves EN):

| Preset | bgDominant | textOnBg | ctaBg | ctaText | fdaBadgeBg | fdaBadgeText |
|---|---|---|---|---|---|---|
| modern | navy | white (10.71) | orange | **navyDark (5.04)** | white | navy |
| minimal | white | navy (10.71) | **navy** | white (10.71) | orange | **navyDark (5.04)** |
| bold | **navyDark** | white (14.59) | orange | **navyDark (5.04)** | white | navyDark |
| clinical | navy | white (10.71) | **white** | navyDark (14.59) | orange | navyDark |

- Bold: `bgGradient` passa a terminar em `navyDark` (não orangeDark) → branco mede contra navyDark.
- Minimal: CTA fica navy (não laranja); laranja vai pro FDA badge com texto navyDark.
- Clinical: CTA branco em fundo navy.
- Adicionar e exportar helpers:
  - `relativeLuminance(hex: string): number`
  - `contrastRatio(c1: string, c2: string): number`

### 2. `src/components/google-ads/display-templates.ts`

- A função `contrastRatio` que existe aqui hoje passa a ser **re-exportada** de `smartdent-constants.ts` (fonte única). Remove a duplicata local.
- CSS dos 4 renderers continua usando `preset.bgGradient` no `.b{background:...}` — sem mudança visual.
- Renderers não precisam ler `bgDominant` (é só p/ validador no front).

### 3. `src/components/google-ads/DisplayBannerGenerator.tsx`

- Remover lógica `accentContrast`/`accentContrastOk` (vs branco fixo, errado).
- Adicionar:
  ```ts
  const preset = STYLE_PRESETS[style];
  const contrastChecks = useMemo(() => {
    const h = contrastRatio(preset.textOnBg, preset.bgDominant);
    const c = contrastRatio(preset.ctaText, preset.ctaBg);
    const f = contrastRatio(preset.fdaBadgeText, preset.fdaBadgeBg);
    return {
      headline: { label: 'Headline (texto vs fundo)', ratio: h, pass: h >= 4.5 },
      cta:      { label: 'CTA (texto vs botão)',     ratio: c, pass: c >= 4.5 },
      fda:      { label: 'FDA Badge',                 ratio: f, pass: f >= 4.5 },
    };
  }, [preset]);
  const allContrastsPass = Object.values(contrastChecks).every(x => x.pass);
  ```
- Substituir o `<p>` único de "Contraste vs branco" por **3 linhas** (uma por check), cada uma com ✓/✗, label, ratio formatado e badge "(mín 4.5:1 WCAG AA)" quando falha.
- Botão "Gerar" recebe `disabled={... || !allContrastsPass}` + mensagem vermelha abaixo se falhar.
- `handleGenerate`: substituir o early-return de `accentContrastOk` por `allContrastsPass`.
- Atualizar item `contrast` do checklist para resumir os 3 ratios (ex: `Contrastes WCAG AA: H 10.71 / CTA 5.04 / FDA 10.71`).
- Os color pickers manuais (Primária/Secundária/Destaque) continuam editáveis para ajustes finos, mas a validação WCAG dos 3 ratios é **derivada do preset** — assim trocar de preset garante compliance imediato. Customização manual segue funcionando para visual; o bloqueio é pelo preset selecionado.

## Critérios de aceite

- Modern → 10.71 / 5.04 / 10.71 ✓✓✓, botão Gerar habilitado.
- Bold → 14.59 / 5.04 / 14.59, CTA laranja com texto navy escuro.
- Minimal → 10.71 / 10.71 / 5.04, CTA navy, FDA laranja com texto navy.
- Clinical → 10.71 / 14.59 / 5.04, CTA branco em fundo navy.
- HTML 300×250 Bold: `.b{background:linear-gradient(135deg,#E97935 0%,#1a2942 100%)} .c{background:#E97935;color:#1a2942}`.
- HTML 300×250 Minimal: `.c{background:#2C3E5F;color:#FFFFFF} .fda{background:#E97935;color:#1a2942}`.
- Reset para SmartDent volta ao Modern com tudo verde.

## Fora do escopo

- Não escurecer `#E97935` oficial.
- Não introduzir AAA (7:1).
- Não renomear chaves dos presets para PT (quebraria `DisplayStyle` type e edge function).
- Sem mudanças em renderers além do re-export do helper.
