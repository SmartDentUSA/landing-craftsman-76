
# Strategic Carousel Engine — 6 Layouts Visuais de Alta Conversão

## Situação Atual

O carrossel de Instagram hoje:
- Gera **7 slides via IA** com texto + sugestão textual de imagem ("Foto close do produto com fundo branco")
- **Não existe nenhum preview visual** — o usuário lê a sugestão mas nunca vê como o slide vai parecer
- O `InstagramCopyGenerator` recebe apenas `productId` e `productName` — as imagens reais do produto nunca chegam ao componente
- O carrossel atual tem 7 slides genéricos, sem layouts diferenciados por objetivo de marketing

## O Que Será Construído

Uma nova seção **"Carrossel Visual"** independente do carrossel de texto atual, com:
- **6 slides com layouts únicos** renderizados visualmente no navegador usando as imagens reais do produto
- **Preview em tempo real** em formato 9:16 (retrato Instagram) escalonado para caber no modal
- **Seleção e reordenação de imagens** por slide via thumbnails clicáveis
- **Color pickers** para personalizar cores primária e de destaque
- **Export ZIP** com 6 HTMLs standalone prontos para screenshot

## Arquitetura dos 6 Slides

| Slide | Nome | Lógica de Marketing | Layout Visual |
|-------|------|---------------------|---------------|
| 1 | Hook/Gancho | Maior benefício em pergunta disruptiva | Imagem 50% tela, título extrabold sobreposto, gradiente no rodapé |
| 2 | Solução | Nome do produto + Categoria Premium | Fundo limpo, produto centralizado estilo Apple, preço destacado |
| 3 | Cientificidade | Especificações técnicas viram "razão para acreditar" | Lista de ícones minimalistas (lucide-react), imagem macro lateral |
| 4 | Experiência | Como o usuário se sente ao usar | Layout split 50/50, imagem em uso à esquerda, benefício à direita |
| 5 | Segurança | Prova social, durabilidade, biocompatibilidade | Imagem com blur + overlay escuro, badges Shield/Award/CheckCircle |
| 6 | CTA | Direcionamento claro para compra | Miniatura do produto, botão visual "Comprar Agora", ícone de link |

## Mudanças Necessárias

### Arquivo 1: `src/components/ModernProductCard.tsx`

Linha 735 — passar imagens reais e URL do produto ao `InstagramCopyGenerator`:

```text
// Antes:
<InstagramCopyGenerator
  isOpen={showInstagramModal}
  onClose={() => setShowInstagramModal(false)}
  productId={product.id}
  productName={product.name}
/>

// Depois:
<InstagramCopyGenerator
  isOpen={showInstagramModal}
  onClose={() => setShowInstagramModal(false)}
  productId={product.id}
  productName={product.name}
  productPrice={product.price}
  productCategory={product.category}
  productImages={[
    ...(product.image_url ? [{ url: product.image_url, alt: product.name }] : []),
    ...(Array.isArray(product.images_gallery) ? product.images_gallery : [])
  ]}
  productUrl={product.product_url}
  productBenefits={product.benefits}
  productFeatures={product.features}
  technicalSpecs={product.technical_specifications}
/>
```

### Arquivo 2: `src/components/InstagramCopyGenerator.tsx`

**Novas props da interface:**
```text
interface InstagramCopyGeneratorProps {
  productId: string;
  productName: string;
  productPrice?: number;
  productCategory?: string;
  productImages?: Array<{ url: string; alt?: string }>;
  productUrl?: string;
  productBenefits?: string[];
  productFeatures?: string[];
  technicalSpecs?: Array<{ label: string; value: string }>;
  isOpen: boolean;
  onClose: () => void;
}
```

**Novos estados:**
```text
// URLs de imagem por slide (6 posições)
const [slideImageMap, setSlideImageMap] = useState<Record<number, string>>({})
// Cores personalizáveis
const [primaryColor, setPrimaryColor] = useState('#1a1a2e')
const [accentColor, setAccentColor] = useState('#e94560')
// Estado de export
const [isExporting, setIsExporting] = useState(false)
```

**Inicialização automática** — quando o modal abre com imagens disponíveis:
```text
useEffect(() => {
  if (productImages && productImages.length > 0) {
    const map: Record<number, string> = {}
    for (let i = 1; i <= 6; i++) {
      map[i] = productImages[(i - 1) % productImages.length].url
    }
    setSlideImageMap(map)
  }
}, [productImages, isOpen])
```

**Nova aba adicionada** na TabsList existente: `"🎨 Carrossel Visual"` — aparece entre a aba "Carrossel (7 Slides)" e "Roteiro de Reels".

### Arquivo 3 (NOVO): `src/components/StrategicCarouselPreview.tsx`

Componente puro responsável por renderizar os 6 slides com CSS inline. Recebe:

```text
interface StrategicCarouselPreviewProps {
  slides: SlideConfig[]            // configuração dos 6 slides
  slideImageMap: Record<number, string>  // URL de imagem por slide
  onImageChange: (slideNum: number, url: string) => void
  productImages: Array<{ url: string; alt?: string }>
  primaryColor: string
  accentColor: string
  productData: {
    name: string
    price?: number
    category?: string
    benefits?: string[]
    features?: string[]
    technicalSpecs?: Array<{ label: string; value: string }>
    productUrl?: string
  }
}
```

**SmartContrast** — determina cor do texto sobre fundo colorido:
```text
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1,3), 16) / 255
  const g = parseInt(hex.slice(3,5), 16) / 255
  const b = parseInt(hex.slice(5,7), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b
}
const textOnPrimary = getLuminance(primaryColor) > 0.5 ? '#000000' : '#ffffff'
```

**Escalonamento dos slides:**
- Dimensão real: `1080 × 1350px` (9:16 retrato)
- Escala visual no modal: `scale(0.22)` → ~238px × 297px por slide
- `transform-origin: top left` com `width` do container ajustado

## Detalhes de Cada Layout

### Slide 1 — Hook/Gancho
```text
[Imagem do produto ocupa 50% inferior]
[Fundo de cor primária ocupa 50% superior]
[Título extrabold em branco/preto (smartContrast) centralizado]
[Gradiente suave na junção das duas metades]
[Badge numérico "1" canto superior esquerdo]
```
Texto gerado: pergunta disruptiva baseada no primeiro benefício do produto

### Slide 2 — Apresentação/Solução
```text
[Fundo branco ou cor primária clara]
[Produto centralizado com sombra suave (estilo e-commerce)]
[Nome do produto em fonte extrabold]
[Categoria em badge colorido]
[Preço formatado em destaque]
```

### Slide 3 — Cientificidade/Diferencial Técnico
```text
[Coluna esquerda: imagem do produto macro]
[Coluna direita: lista de specs técnicas]
[Cada spec: ícone Lucide + label + valor]
[Ícones auto-selecionados: Zap, Shield, Award, Star, CheckCircle, Layers]
[Fundo escuro, texto claro para aparência premium]
```

### Slide 4 — Experiência/Benefício na Prática
```text
[Split 50/50 horizontal]
[Esquerda: imagem do produto em uso/resultado]
[Direita: fundo de cor primária]
[Direita: palavra-chave de experiência em extrabold]
[Direita: descrição do benefício em texto menor]
```

### Slide 5 — Segurança/Quebra de Objeção
```text
[Imagem do produto com filter: blur(8px)]
[Overlay escuro rgba(0,0,0,0.65)]
[Sobre o overlay: 3 badges de credencial]
[Badge 1: Shield + "Biocompatível"]
[Badge 2: Award + "5 Anos de Casos"]
[Badge 3: CheckCircle + "Qualidade Premium"]
[Título central: "Você pode confiar"]
```
Os textos dos badges são gerados a partir de `features` e `benefits` do produto quando disponíveis.

### Slide 6 — CTA
```text
[Fundo de cor primária]
[Miniatura do produto (120×120px) com borda branca]
[Nome do produto abaixo da miniatura]
[Botão visual simulado: "🛒 Comprar Agora" em cor de destaque]
[Link visual: ícone ExternalLink + "Link na Bio"]
[Rodapé: "Direct para mais informações"]
```

## Seleção de Imagem por Slide

Abaixo de cada preview de slide, uma strip horizontal de thumbnails (40×40px com `object-fit: cover`, borda arredondada). A imagem atualmente selecionada tem borda colorida `ring-2` na cor primária. Clicar em qualquer thumbnail atualiza o `slideImageMap[slideNum]` e o preview é atualizado em tempo real.

## Export ZIP

Botão "📦 Baixar ZIP (6 Slides)" usa `jszip` (já instalado) para gerar:

```text
carrossel-[nome-produto]/
  slide-1-hook.html
  slide-2-solucao.html
  slide-3-tecnico.html
  slide-4-experiencia.html
  slide-5-seguranca.html
  slide-6-cta.html
```

Cada HTML tem:
- Dimensões fixas `1080×1350px`
- CSS idêntico ao preview (sem `transform: scale`)
- Imagem referenciada por URL absoluta pública
- Pronto para abrir no navegador e tirar screenshot

## Seção Técnica

### Arquivos modificados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/components/ModernProductCard.tsx` | Edição | Passar 7 novas props para `InstagramCopyGenerator` |
| `src/components/InstagramCopyGenerator.tsx` | Edição | Novas props, 4 estados, nova aba "Carrossel Visual", lógica de init e export ZIP |
| `src/components/StrategicCarouselPreview.tsx` | Criação | Componente de renderização dos 6 slides com todos os layouts |

Nenhuma nova dependência: `jszip` e `@hello-pangea/dnd` já instalados.

### Fluxo completo do usuário

```text
1. Usuário clica no ícone Instagram em um card de produto
2. Modal abre → aba "Carrossel Visual" disponível
3. Sistema distribui automaticamente as imagens da galeria pelos 6 slides
4. Usuário vê 6 previews visuais em 9:16 com as fotos reais
5. Pode trocar qual imagem aparece em cada slide (thumbnails clicáveis)
6. Pode ajustar cor primária e cor de destaque com color pickers
7. Preview atualiza em tempo real a cada mudança
8. Clica "Baixar ZIP" → recebe 6 HTMLs em 1080×1350px
9. Abre cada HTML no Chrome → Print/Screenshot → imagem pronta para postar
```

### Compatibilidade com carrossel de texto existente

A nova aba "Carrossel Visual" é **completamente independente** do carrossel de 7 slides existente. Nenhuma das funcionalidades atuais é alterada. Os dados do carrossel visual não são persistidos no banco nesta fase (somente o export é necessário).
