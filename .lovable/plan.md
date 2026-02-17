

# Plano: URL Final (Loja Integrada) Visivel e Editavel nos Banners Display

## Problema

Atualmente o `product_url` (link da Loja Integrada) ja e embutido no HTML5 via `onclick`, mas:
1. O usuario nao consegue **ver** qual URL esta sendo usada na aba Display
2. Se o `product_url` estiver vazio, o banner usa `#` (link quebrado)
3. Nao ha como editar a URL final antes de gerar

## Solucao

Adicionar um campo **"URL Final (Loja Integrada)"** visivel e editavel no `DisplayBannerGenerator`, pre-populado com `product.product_url`.

## Alteracao

### Arquivo: `src/components/google-ads/DisplayBannerGenerator.tsx`

1. Adicionar state `finalUrl` inicializado com `product.product_url || ''`
2. Adicionar campo Input visivel no card "Estilo e Cores" com label "URL Final (Loja Integrada)"
3. Usar `finalUrl` em vez de `product.product_url || '#'` nas chamadas de geracao
4. Mostrar aviso se `finalUrl` estiver vazio (badge amarelo "URL nao definida")

### Secao Tecnica

Novo state:
```text
const [finalUrl, setFinalUrl] = useState(product.product_url || '');
```

Novo campo no card de configuracao (abaixo do CTA):
```text
<Label>URL Final (Loja Integrada)</Label>
<Input value={finalUrl} onChange={...} placeholder="https://minhaloja.lojaintegrada.com.br/produto/..." />
```

Substituir todas as referencias `product.product_url || '#'` por `finalUrl || '#'` (linhas 97, 119, 139).

Validacao: se `finalUrl` estiver vazio ao clicar "Gerar", mostrar toast de aviso (nao bloqueante, apenas informativo).

Apenas 1 arquivo modificado.

