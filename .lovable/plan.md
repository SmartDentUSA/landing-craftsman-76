

## Plano: republicar em massa todas as LPs e Blogs (exceto domínio www.smartdent.com.br)

### Objetivo

Disparar o "Republicar" de **todas** as páginas listadas em `LP Clone & Blogs` (LPs + Blogs) que já estejam vinculadas a um domínio, **excluindo** as do domínio `www.smartdent.com.br`. Cada item será republicado individualmente, usando exatamente a mesma rota que o botão "Republicar" já usa hoje (Git/FTP/Cloudflare conforme a configuração de cada domínio).

### Onde a ação fica na UI

Na aba **Biblioteca** (`/repository` → tab "LP Clone & Blogs" → sub-tab "Biblioteca"), adicionar um botão de ação no topo:

- **Botão**: `🚀 Republicar Tudo (exceto www.smartdent.com.br)`
- **Posição**: ao lado do botão de refresh existente (linha 1180-1193 de `LPClonePanel.tsx`)
- **Confirmação**: modal `window.confirm` listando quantas LPs e Blogs serão republicados e os domínios afetados, antes de iniciar
- **Domínio excluído (hardcoded por segurança)**: `www.smartdent.com.br`

### O que cada item dispara

Reaproveita 100% as mutations já existentes — **nenhuma lógica nova de publicação**:

| Tipo | Mutation usada | Função invocada |
|---|---|---|
| LP com `target_domain` ≠ `www.smartdent.com.br` e `transformed_html` presente | `publishMutation` (linha 516) | `publish-git-kinghost` / `publish-ftp-pages` / `publish-cloudflare-pages` (escolhida pelo `publish_method` do `seoDomains`) |
| Blog com `targetDomain` ≠ `www.smartdent.com.br` e status válido | `publishBlogMutation` (linha 642) | mesma escolha por método de publicação |

### Fluxo de execução

1. Usuário clica no botão.
2. Sistema lista os candidatos (filtrando `www.smartdent.com.br` e itens sem domínio/HTML válido).
3. Mostra `confirm` com totais: ex. *"Republicar 12 LPs e 8 Blogs em 3 domínios? www.smartdent.com.br será ignorado."*
4. Se confirmado, executa **sequencialmente** (1 a 1, com pequeno delay entre chamadas) para evitar throttling do GitHub API e dos endpoints FTP. Ordem: LPs primeiro, Blogs depois, agrupados por domínio.
5. Para cada item, mostra toast de progresso `(N/Total) Republicando: <nome>`.
6. Ao final, toast de sumário: `"✅ Republicado: X | ❌ Falhou: Y"` e refresh automático da biblioteca (`invalidateQueries`).
7. Log no console com a lista de sucessos e falhas para auditoria.

### Tratamento de erros

- Falha individual **não interrompe** o lote — registra erro, continua para o próximo.
- Itens sem `transformed_html` (LPs) ou sem `content`/`publicationId` (Blogs) são pulados com aviso.
- Itens com domínio = `www.smartdent.com.br` são silenciosamente ignorados (constam no log como "skipped: smartdent").

### Por que sequencial e não paralelo?

- O GitHub API tem rate limit (5000 req/h por token, mas atomic commits podem disparar deadlocks se 10+ commits chegarem em paralelo no mesmo branch `stable-website`).
- FTP single-thread é norma — sessões paralelas costumam dar erro `421 Too many connections`.
- Cloudflare Pages aceita melhor, mas mantemos sequencial para uniformidade.
- Delay de 1500ms entre chamadas mantém estabilidade sem sacrificar muito tempo total.

### Estimativa de tempo

- ~3-5s por LP (Git) + ~1.5s delay = ~5-7s por item
- 20 itens ≈ 2-3 minutos de execução

### Arquivos modificados

- `src/components/LPClonePanel.tsx` — adicionar:
  - Estado `bulkRepublishing: boolean` e `bulkProgress: { current, total }`
  - Função `handleBulkRepublish()` que percorre `libraryItems`, filtra por domínio ≠ `www.smartdent.com.br`, e chama as mutations existentes em sequência com `await` e delay
  - Botão na linha ~1180 com ícone `Rocket` e estado de loading exibindo `(N/Total)`

### Fora de escopo

- Não vou criar nova edge function — reutilizo `publish-git-kinghost`, `publish-ftp-pages`, `publish-cloudflare-pages` que já existem.
- Não toco no fluxo de "Republicar individual" — botão por item continua funcionando igual.
- Não republico páginas em **rascunho** (`publish_status: 'draft'`); apenas as que **já foram publicadas pelo menos uma vez** OU que tenham `target_domain + transformed_html` definidos. Critério: mesmo critério do botão individual ("Publicar"/"Republicar") que aparece quando `lp.target_domain && lp.transformed_html`.

### Confirmação visual antes de executar

Modal `confirm` mostrará algo como:

```text
Republicar em massa?

• 8 LPs em loja.smartdent.com.br (Git)
• 4 LPs em landing.eodonto.com.br (Cloudflare)
• 6 Blogs em parametros.smartdent.com.br (FTP)

⚠️ Domínio EXCLUÍDO: www.smartdent.com.br (5 itens não serão tocados)

Tempo estimado: ~3 minutos. Continuar?
```

