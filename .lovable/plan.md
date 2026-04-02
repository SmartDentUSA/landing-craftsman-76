

## Adicionar controles de faixa e overlay no Slide 1 do Carrossel

### O que será feito

Adicionar 3 novos controles no editor do Slide 1:
- **Toggle** para mostrar/esconder a faixa central escura
- **Cor da faixa** — color picker para mudar a cor da faixa
- **Transparência do overlay** — slider para controlar a opacidade do filtro escuro sobre a imagem (0% a 80%)

### Mudanças técnicas

**Arquivo: `src/components/StrategicCarouselPreview.tsx`**

**1. Tipo `SlideTextsType` (linha 46)**
Adicionar campos opcionais ao slide 1:
- `overlayOpacity?: string` (0-80, default 28)
- `faixaVisible?: string` ("true"/"false", default "true")
- `faixaColor?: string` (hex, default "#000000")

**2. `SLIDE_EDITOR_FIELDS` (linhas 85-90)**
Adicionar 3 campos novos ao slide 1:
```
{ key: 'faixaVisible', label: 'Mostrar faixa central', type: 'toggle' }
{ key: 'faixaColor', label: 'Cor da faixa', type: 'color' }
{ key: 'overlayOpacity', label: 'Transparência do overlay (%)', type: 'slider' }
```

**3. Editor field types (linha 84)**
Adicionar `'toggle'` ao union type dos fields. No renderer do editor (linhas 293-366), adicionar case para `toggle`:
```tsx
field.type === 'toggle' ? (
  <button onClick={...} className="...">
    {value === 'false' ? 'Desativado' : 'Ativado'}
  </button>
)
```

**4. `Slide1Hook` (linhas 408-447)**
- Ler `overlayOpacity` (default 28), `faixaVisible` (default "true"), `faixaColor` (default "#000000")
- Overlay (linha 421): usar `rgba(0,0,0, overlayOpacity/100)` em vez do valor fixo
- Faixa central (linhas 428-440): renderizar condicionalmente com `faixaVisible !== 'false'`, e usar `faixaColor` com opacidade 0.58

**5. Canvas export do Slide 1 (linhas 1308-1322)**
- Overlay (linha 1309): usar `rgba(0,0,0, overlayOpacity/100)`
- Faixa (linhas 1313-1317): condicionar a `faixaVisible`, usar `faixaColor`

### Slider de overlay
- Range: 0 a 80 (em %)
- Default: 28 (valor atual hardcoded)
- Reutiliza o mesmo renderer `type: 'slider'` existente, mas com min/max customizados via config

Para diferenciar do slider de imageScale (50-150), adicionar `min`/`max` opcionais ao field config:
```ts
{ key: 'overlayOpacity', label: 'Transparência do overlay (%)', type: 'slider', min: 0, max: 80 }
```

### Resultado esperado
- Usuário pode desligar a faixa central preta sobre a imagem do Slide 1
- Pode mudar a cor da faixa (ex: azul, vermelho)
- Pode controlar quanto o filtro escuro cobre a imagem (de 0% transparente a 80% escuro)
- Preview e PNG exportado refletem as configurações

