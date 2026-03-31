

## Correção: Links das imagens de soluções não funcionam no HTML gerado

### Causa raiz

O componente `ImageUploader` permite definir um campo `href` (link de destino) para cada imagem de solução, mas o **template HTML** (`src/lib/template-engine.ts`, linhas 2186-2193 e 2202-2209) renderiza apenas `<img>` sem envolver em `<a>`.

O `href` é salvo nos dados mas nunca chega ao HTML final.

### Correção

**Arquivo: `src/lib/template-engine.ts`**

Nas duas seções de soluções (desktop grid e mobile carousel), envolver o conteúdo do card em `<a>` quando `image.href` estiver presente, usando blocos condicionais Mustache:

**Desktop (linhas ~2186-2193):**
```mustache
{{#image.href}}<a href="{{image.href}}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;color:inherit;">{{/image.href}}
  <div class="image-container image-container-{{sizeType}}">
    <img src="{{image.src}}" alt="{{image.alt}}" ...>
    <div class="control-item-text-overlay">
      <p>{{{text}}}</p>
    </div>
  </div>
{{#image.href}}</a>{{/image.href}}
```

**Mobile (linhas ~2202-2209):** mesma lógica.

### Resultado esperado
- Imagens de soluções com `href` preenchido tornam-se links clicáveis no HTML gerado
- Imagens sem `href` continuam sem link (sem regressão)

