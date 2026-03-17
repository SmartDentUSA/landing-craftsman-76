

# Diagnóstico: CSS está correto, mas pode não estar visível

## Análise

Verifiquei extensivamente o código:

1. **CSS está presente** — A regra `.service-text-overlay h2 { background: var(--primary-color); color: #ffffff; display: inline-block; padding: 0.5rem 1.25rem; border-radius: 0.5rem; }` está na linha 1496-1503 de `src/lib/template-engine.ts`
2. **`--primary-color`** está definida como `#007bff` (azul) na linha 123
3. **Ambos `generatePreviewHTML` e `generateHTML`** usam o mesmo `TEMPLATE_HTML` — o CSS é compartilhado
4. **O iframe do Editor** usa `Date.now()` no key, forçando refresh a cada render
5. **A seção advisory está visível** no banco (`visible_desktop: true, visible_mobile: true`) para a LP "#1 - Institucional"

## Possível causa

A seção `.service-text-overlay` já tem:
- `color: white` (herdado)
- `background: linear-gradient(transparent, rgba(0,0,0,0.3))` — gradiente escuro
- `text-shadow: 2px 2px 6px rgba(0,0,0,1)` — sombra forte

O `h2` com `display: inline-block` e `background: var(--primary-color)` pode estar **sobreposto pelo gradiente do container pai** (que é `position: absolute` cobrindo a imagem), tornando o fundo azul pouco visível.

## Plano de correção

Adicionar `position: relative` e `z-index: 1` ao `.service-text-overlay h2` para garantir que o badge fique acima do gradiente, e remover o `text-shadow` do h2 (não precisa mais com fundo sólido):

**Arquivo:** `src/lib/template-engine.ts` (linhas 1496-1503)

```css
.service-text-overlay h2 {
    background: var(--primary-color);
    color: #ffffff;
    display: inline-block;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
    position: relative;
    z-index: 1;
    text-shadow: none;
}
```

Apenas 3 propriedades adicionadas. Zero risco de quebrar outros componentes.

