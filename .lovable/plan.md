

# Adicionar campos de redes sociais faltantes no Perfil da Empresa

## Situação atual

A aba "Redes Sociais" do CompanyProfileManager tem apenas **YouTube** e **Instagram** como campos dedicados. Faltam: **WhatsApp, Facebook, TikTok, Kwai, Telegram, LinkedIn, Pinterest, X (Twitter)**.

## Plano

### 1. `src/components/icons/SocialIcons.tsx`
- Adicionar `KwaiIcon` (único ícone que falta no sistema)
- Adicionar entrada `kwai` no array `SOCIAL_PLATFORMS`

### 2. `src/components/CompanyProfileManager.tsx`
Após os campos de YouTube/Instagram (linha ~1381) e antes da seção de Hashtags (linha ~1383), adicionar uma seção **"Outras Redes Sociais"** com grid de inputs mapeados do `SOCIAL_PLATFORMS`, excluindo `youtube` e `instagram` (que já têm campos dedicados). Cada input:
- Mostra ícone colorido + nome da plataforma
- Salva/carrega do array `social_media_links` (JSONB já existente no banco)
- Filtra entradas vazias ao salvar

### Redes que serão adicionadas
| Rede | Ícone | Status |
|------|-------|--------|
| WhatsApp | ✅ existe | campo falta |
| Facebook | ✅ existe | campo falta |
| TikTok | ✅ existe | campo falta |
| **LinkedIn** | ✅ existe | **campo falta** |
| Telegram | ✅ existe | campo falta |
| Pinterest | ✅ existe | campo falta |
| X (Twitter) | ✅ existe | campo falta |
| Threads | ✅ existe | campo falta |
| **Kwai** | ❌ criar | campo falta |

### Arquivos alterados
- `src/components/icons/SocialIcons.tsx`
- `src/components/CompanyProfileManager.tsx`

