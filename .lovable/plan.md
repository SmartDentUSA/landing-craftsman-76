

# Plano: Otimizar Copy de Reels com estrutura "Loop e Engajamento"

## O que muda

A geracao de **Copy para Reels** (as 4 variacoes de texto) sera reformulada para seguir a estrutura "Loop e Engajamento" fornecida:

1. **Headline** (Gancho de 3 segundos)
2. **Conflito** (Frustracao com metodo antigo)
3. **Solucao** (Produto como heroi, nome em negrito)
4. **Bullet Points de Desejo** (3 beneficios com emojis)
5. **CTA de Engajamento** (Isca digital com palavra gatilho BOT)
6. **5 Hashtags** (2 amplas + 3 especificas)

Os **Roteiros de Reels audiovisuais** (com cenas, visual, dialogo) permanecem inalterados.

## Alteracoes

### Arquivo: `supabase/functions/generate-social-content/index.ts`

**Funcao `buildPromptWithApproach`** (bloco `else` para reels, linhas ~590-630):

Substituir o prompt generico de Reels pelo prompt especializado:

- Persona: Estrategista de conteudo para Instagram, especialista em Reels virais para tecnologia odontologica
- Estrutura obrigatoria: Headline > Conflito > Solucao > Bullet Points > CTA > Hashtags
- Diretrizes de algoritmo: Maximo 2 frases por paragrafo, termos como "mudar o jogo", "proximo nivel"
- Cada uma das 4 abordagens (educational, trending, behind_scenes, demonstration) aplicara a estrutura com angulo diferente
- O JSON de saida continua no mesmo formato (`feed_copy`, `hashtags`, `call_to_action`) para compatibilidade com o frontend

**Funcao `getDefaultPrompt`** (bloco reels, linhas ~710-755):

Atualizar tambem o prompt padrao de reels (usado quando nao ha variacoes multiplas) com a mesma estrutura "Loop e Engajamento".

### Resultado no frontend

- As 4 variacoes de Copy Reels terao o formato otimizado (Headline > Conflito > Solucao > Bullets > CTA + Hashtags)
- Os Roteiros de Reels (tab separada com cenas audiovisuais) continuam identicos
- Nenhuma alteracao no componente `InstagramCopyGenerator.tsx` e necessaria pois o formato JSON de saida permanece o mesmo

## Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/generate-social-content/index.ts` | Atualizar prompts de Reels copy com estrutura "Loop e Engajamento" em `buildPromptWithApproach` e `getDefaultPrompt` |

