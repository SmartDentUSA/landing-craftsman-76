## Problema
No Slide 1 (Capa/Gancho) do Carrossel Engajamento, o título e subtítulo estão grudados na borda inferior da imagem (`bottom: 60px` em canvas de 1350px ≈ 4% do fim), passando a sensação de "caindo fora".

## Mudança
Editar apenas `src/components/EngagementCarouselPreview.tsx`, bloco do `slideNum === 1` (linhas ~642–679):

1. **Subir o bloco de texto**: `bottom: 60` → `bottom: 200` (texto passa a ocupar ~15–35% da altura, com respiro generoso da borda).
2. **Aumentar o gradiente** para acompanhar o novo ponto do texto e manter legibilidade: `height: '60%'` → `height: '70%'` e ajustar o stop para `rgba(0,0,0,0.85) 20%` (escuro segue a faixa do texto, topo continua transparente).
3. **Reposicionar o badge "1"** para não colidir com o texto reerguido: `bottom: 40, right: 48` → `top: 40, right: 48` (canto superior direito, padrão típico de capa de carrossel).

Sem mudanças nos demais slides, lógica de captura, render de vídeo, upload ou envio para Sistema A.

## Validação
Visualizar slide 1 no preview: título deve ficar centralizado verticalmente na metade inferior (não colado na borda), badge "1" no canto superior direito sem sobrepor o rosto/produto, gradiente cobre o texto sem clarear demais o topo.