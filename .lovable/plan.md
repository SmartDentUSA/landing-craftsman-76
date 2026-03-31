

## Correção: Imagens perderam proporções após adição do link

### Causa raiz

O `<a>` inserido entre `.control-item` e `.image-container` quebra a cadeia de `height: 100%` do CSS. O grid desktop usa regras como:

```css
.control-item, .image-container { height: 100%; }
```

Com o `<a>` no meio, o `.image-container` não herda mais a altura do `.control-item` porque o `<a>` não tem `height: 100%`.

### Correção

**Arquivo: `src/lib/template-engine.ts`**

1. **Desktop (linha 2187):** Adicionar `height:100%;width:100%;` ao style inline do `<a>`:
```mustache
{{#image.href}}<a href="{{image.href}}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;height:100%;width:100%;">{{/image.href}}
```

2. **Mobile (linha 2205):** Mesmo ajuste:
```mustache
{{#image.href}}<a href="{{image.href}}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;height:100%;width:100%;">{{/image.href}}
```

Duas linhas alteradas. A cadeia de `height: 100%` é restaurada e as proporções voltam ao normal.

