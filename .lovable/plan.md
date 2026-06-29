## Slide 1 (Capa/Gancho) — Mostrar número do slide

**Problema:** O badge "1" existe no código mas está em `top: 40, right: 48`, exatamente onde o logo SmartDent é renderizado, ficando escondido. Slides 2–6 usam `bottom: 40, right: 48`.

**Correção em `src/components/EngagementCarouselPreview.tsx`:**

1. **Preview (linhas 918–927):** mover o badge do Slide 1 para `bottom: 40, right: 48` (mesma posição dos demais), mantendo o estilo escuro translúcido sobre a foto (`background: rgba(0,0,0,0.35)`, texto `rgba(255,255,255,0.9)`) para garantir contraste sobre a imagem com gradiente.

2. **Export (`generateEngagementSlideVideo` / canvas do Slide 1, ~linha 1567+):** replicar o mesmo badge no canvas exportado — círculo de 60px no canto inferior direito com o número "1", para manter paridade preview ↔ exportação.

**Fora de escopo:** demais slides, tipografia, layout de mídia, controles de upload.
