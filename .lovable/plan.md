

# Estender faixa animada para largura total da página

## Problema
A faixa de logos está limitada pelo `container mx-auto px-4` (max-width ~1280px com padding). Na imagem do usuário, vê-se que a faixa não ocupa toda a largura.

## Alteração

### `src/components/InfinitePartnersCarousel.tsx`
- Remover o `<div className="container mx-auto px-4">` wrapper
- Manter apenas o `overflow-hidden` diretamente dentro da `<section>`
- Adicionar um fundo cinza claro (`bg-gray-100`) à section para criar a faixa visual full-width, como se vê na imagem de referência

Resultado: a faixa ocupará 100% da viewport width com as logos animando de ponta a ponta.

