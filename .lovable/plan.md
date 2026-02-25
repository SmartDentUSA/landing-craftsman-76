

# Botões individuais "Gerar por IA" para slides do Carrossel Visual

## Contexto

O Carrossel Visual tem 6 slides. O Slide 1 (🎣 Hook) já possui um botão individual "Novo Gancho IA" que chama a edge function `generate-carousel-hook`. Os slides 3 (🔬 Cientificidade), 4 (💫 Experiência) e 5 (🛡️ Segurança) não possuem botões individuais — só podem ser gerados pelo botão geral "🤖 Gerar com IA" que regenera todos os slides de uma vez.

## Plano

### 1. Nova Edge Function: `generate-carousel-slide`

Criar uma edge function genérica que receba o tipo do slide (`cientificidade`, `experiencia`, `seguranca`) e gere apenas o conteúdo daquele slide específico, com prompts especializados por tipo:

- **Cientificidade (Slide 3)**: Gera title, headline, body, bullet1-4 com foco em evidências científicas e dados técnicos
- **Experiência (Slide 4)**: Gera keyword + benefit com foco em experiência clínica e fluxo de trabalho
- **Segurança (Slide 5)**: Gera title, badge1-3 com foco em certificações, garantias e confiança

Recebe: `productName`, `salesPitch`, `benefits`, `features`, `slideType`
Retorna: campos específicos do slide solicitado

### 2. Frontend — Novos estados e handlers (`InstagramCopyGenerator.tsx`)

- Adicionar 3 estados: `generatingScience`, `generatingExperience`, `generatingSecurity`
- Criar 3 handlers que chamam `generate-carousel-slide` com o `slideType` correto e atualizam apenas o slide correspondente em `slideTexts`

### 3. Frontend — 3 novos botões no header do Carrossel Visual

Adicionar ao lado do botão "🎣 Novo Gancho IA" (linha ~1962):

- **🔬 Cientificidade IA** — gera apenas Slide 3
- **💫 Experiência IA** — gera apenas Slide 4
- **🛡️ Segurança IA** — gera apenas Slide 5

Cada botão com loading state individual, mesmo padrão visual do botão Hook existente.

### Detalhes técnicos

**Edge function `generate-carousel-slide/index.ts`:**
- Usa Lovable AI Gateway (`google/gemini-2.5-flash`)
- Prompt especializado por slideType com regras de formatação
- Temperature 1.0 para variedade
- Retorna JSON estruturado via tool calling para garantir campos corretos

**Mapeamento de retorno:**
- `cientificidade` → `{ title, headline, body, bullet1, bullet2, bullet3, bullet4 }`
- `experiencia` → `{ keyword, benefit }`
- `seguranca` → `{ title, badge1, badge2, badge3 }`

