

## Adicionar botões 📦 Baixar ZIP e 💾 Salvar ao Carrossel Engajamento

### Situação atual
- O botão "Baixar ZIP" já existe mas sem o emoji 📦
- Não existe botão "Salvar" — os dados são salvos automaticamente com debounce (1s) a cada edição

### Alterações

**Arquivo: `src/components/EngagementCarouselSection.tsx`**

1. Adicionar estado `saving` para feedback visual no botão Salvar
2. Criar função `handleManualSave` que chama `persistData` diretamente e mostra toast de confirmação
3. Adicionar import do ícone `Save` do lucide-react
4. Atualizar o texto do botão ZIP para `📦 Baixar ZIP`
5. Adicionar botão `💾 Salvar` com ícone Save, variante outline, que chama `handleManualSave`

Ordem dos botões: `Copiar Textos` → `💾 Salvar` → `📦 Baixar ZIP` → `Regenerar/Gerar com IA`

