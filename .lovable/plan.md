

# Estilizar título da seção Consultoria com fundo azul e texto branco

## O que será feito

Alterar o CSS da seção "Consultoria" (advisory) no template engine para que o `<h2>` tenha fundo azul (`var(--primary-color)`) com texto branco, destacando-o visualmente.

## Arquivo a editar

**`src/lib/template-engine.ts`** — Adicionar regra CSS para `.service-text-overlay h2`:

```css
.service-text-overlay h2 {
    background: var(--primary-color);
    color: #ffffff;
    display: inline-block;
    padding: 0.5rem 1.25rem;
    border-radius: 0.5rem;
    margin-bottom: 0.5rem;
}
```

Isso será inserido após o bloco existente `.service-text-overlay h2, .service-text-overlay p` (linha ~1491). O título ficará como um "badge" com fundo azul (cor primária da LP) e texto branco, enquanto o parágrafo mantém o estilo atual.

