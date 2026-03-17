

# Diagnóstico: Dados do Editor vs HTML Publicado

## O que está acontecendo

O campo `data` da LP institucional (`5f7bea68`) tem **estrutura preservada** mas muitos **campos de texto vazios**:

| Seção | Estado no editor | No HTML publicado |
|-------|-----------------|-------------------|
| Banner (title, subtitle) | Vazio | Tem conteúdo |
| Advisory (title, paragraph) | Vazio | Tem conteúdo |
| CTA Final (title, paragraph) | Vazio | Tem conteúdo |
| Desktop Info (title, text) | Vazio | Tem conteúdo |
| Video Section | Desabilitado | Pode ter |
| **Solutions** (5 itens) | **OK** | OK |
| **FAQ** (9 itens) | **OK** | OK |
| **Partners** (9 itens) | **OK** | OK |
| **Footer** (links, social, locations) | **OK** | OK |
| **SEO** (title, description) | **OK** | OK |

Os campos de texto foram sobrescritos com strings vazias em algum update anterior, mas os arrays/objetos complexos foram preservados.

## Plano: Importar dados do HTML baixado

Criar uma funcionalidade "Restaurar do HTML" no editor que:

1. Permite upload do arquivo HTML baixado
2. Faz parsing do HTML usando DOMParser no browser
3. Extrai textos das seções conhecidas (banner h1/h2, advisory, CTA final, etc.) usando seletores CSS
4. Preenche os campos vazios do `data` sem sobrescrever campos que já têm dados

### Implementação

**Arquivo: `src/components/editor/RestoreFromHTMLButton.tsx`** (novo)
- Botão "Restaurar do HTML" no toolbar do editor
- Input file para upload de `.html`
- Função `extractDataFromHTML(html: string)` que usa DOMParser para extrair:
  - Banner: `h1` → title, primeiro `p` após h1 → subtitle
  - Advisory: seção advisory → title, paragraph
  - CTA Final: seção cta → title, paragraph, buttons
  - Desktop Info: seção desktop → title, text
- Retorna um objeto parcial `Partial<LandingPageData>` com os campos extraídos

**Arquivo: `src/pages/LandingPageEditor.tsx`**
- Adicionar o botão RestoreFromHTMLButton na toolbar
- Ao restaurar, chamar `updateLandingPage(id, { data: mergedData })` com merge dos dados extraídos

### Abordagem de parsing

O parser vai buscar padrões conhecidos do template SmartDent:
- Seções identificadas por classes CSS ou IDs semânticos
- Fallback: buscar por estrutura h1/h2/p dentro de sections
- Só preenche campos que estão atualmente vazios (não sobrescreve dados existentes)

### Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/components/editor/RestoreFromHTMLButton.tsx` | Novo - componente de upload + parsing |
| `src/pages/LandingPageEditor.tsx` | Adicionar botão na toolbar |

