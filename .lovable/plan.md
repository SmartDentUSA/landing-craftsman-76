

# Fix: Perfis FTP não persistem após salvar

## Problema

Três bugs no `PublicationSettings.tsx`:

1. **Filtro `user_id` na query de load** (linha 67): `.eq('user_id', user.user.id)` exclui perfis criados por outro admin. Perfis compartilhados devem ser visíveis para todos os admins.

2. **Mutação direta do state** (linha 159): `profile.id = data.id` altera o objeto sem chamar `setState`, então React não sabe que o perfil agora tem ID. No próximo save ou reload, o perfil pode ser duplicado ou perdido.

3. **Sobrescreve `user_id` no update** (linha 135): Ao atualizar um perfil existente criado por outro admin, o `user_id` é substituído pelo do usuário atual. Deve manter o original.

## Correções em `src/pages/PublicationSettings.tsx`

### 1. Remover filtro `user_id` do loadSettings (linha 67)
```typescript
// Antes:
.eq('user_id', user.user.id)

// Depois: remover esta linha
```

### 2. Corrigir mutação de state após insert (linhas 152-160)
```typescript
// Após insert bem-sucedido, atualizar state corretamente:
if (data) {
  setFtpProfiles(prev => prev.map((p, i) =>
    i === ftpProfiles.indexOf(profile) ? { ...p, id: data.id } : p
  ));
}
```

### 3. No update, não enviar `user_id` (linha 134-144)
Separar o record para insert vs update — no update, omitir `user_id`.

### Arquivo alterado
- `src/pages/PublicationSettings.tsx`

