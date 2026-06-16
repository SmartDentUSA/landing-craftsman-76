## Diagnóstico
As imagens chegam **achatadas/distorcidas** no Sistema B porque o `html2canvas` (usado para snapshot dos slides em PNG) **não respeita `object-fit: cover` em tags `<img>`** — esticando a imagem para 100%×100% do container, ignorando o aspect ratio. No preview do navegador parece correto (o DOM honra `object-fit`), mas o PNG enviado fica deformado. Daí a queixa "totalmente diferente do que está no nosso sistema".

Isso afeta:
- **Slide 1** (full-bleed cover) — `src/components/EngagementCarouselPreview.tsx` linhas 620–630
- **Slides 2–6** via `MediaBlock` — linhas 572–587

(Vídeos não são afetados porque vão por outro pipeline `generateEngagementSlideVideo` com canvas próprio.)

## Mudança
Editar apenas `src/components/EngagementCarouselPreview.tsx`. Trocar as duas tags `<img>` por um `<div>` com `background-image` — `html2canvas` honra `background-size: cover` e `background-position: center` corretamente, preservando o aspect ratio.

**Slide 1 — full-bleed (linhas 620–630):**
```tsx
imageUrl ? (
  <div
    aria-label=""
    style={{
      position: 'absolute', top: 0, left: 0,
      width: '100%', height: '100%',
      backgroundImage: `url("${imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      transform: `scale(${imageScale / 100})`,
      transformOrigin: 'center center',
    }}
  />
) : ...
```
Mantém um `<img hidden>` "fantasma" com `src={imageUrl}` e `onLoad`/`onError` somente para o `img.decode()` do exportador detectar e aguardar — fora isso, fica invisível (`display:none` não funciona aqui, então `position:absolute; opacity:0; width:1; height:1; pointer-events:none`). Sem esse helper, `container.querySelectorAll('img')` no exporter retorna 0 e o `setTimeout(80ms)` pode disparar antes do bg-image decodificar.

**MediaBlock (linhas 572–587):** mesma troca dentro do wrapper já existente:
```tsx
<div style={{ width:'100%', height, overflow:'hidden', borderRadius:16 }}>
  <div style={{
    width:'100%', height:'100%',
    backgroundImage:`url("${imageUrl}")`,
    backgroundSize:'cover',
    backgroundPosition:'center',
    backgroundRepeat:'no-repeat',
    transform:`scale(${imageScale / 100})`,
    transformOrigin:'center center',
  }} />
  <img src={imageUrl} alt="" aria-hidden style={{position:'absolute',opacity:0,width:1,height:1,pointerEvents:'none'}} onError={...}/>
</div>
```
(Wrapper externo passa a `position:relative` para conter o `<img>` fantasma.)

## Fora de escopo
- Nada muda no `generateEngagementSlidePNG`, no upload `smartops-upload.ts`, no indexing dos slides, no fluxo de vídeo, nem nos demais componentes (Estratégico, Loja, etc.).
- Layout dos textos do Slide 1 (já corrigido na rodada anterior) permanece.

## Validação
Após o ajuste:
1. Re-enviar o carrossel para o Sistema B.
2. Comparar visualmente um slide com photo de boca (slide 2/5) entre o preview do gerador e o thumbnail no Sistema B — devem ter o mesmo enquadramento, sem esticamento vertical.
3. Console deve continuar logando `imgs.length > 0` em `[ENGAGEMENT_PNG] slide N: rendered` (graças ao `<img>` fantasma).