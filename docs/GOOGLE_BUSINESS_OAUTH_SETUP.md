# 🔐 Google Business Profile OAuth 2.0 Setup Guide

Este guia detalha como configurar autenticação OAuth 2.0 para extrair reviews reais do Google Business Profile.

---

## 📋 Pré-requisitos

- Conta Google com perfil no Google Business
- Acesso ao [Google Cloud Console](https://console.cloud.google.com/)
- Acesso ao Supabase Dashboard do projeto

---

## 🚀 Etapa 1: Configurar Google Cloud Project

### 1.1 Criar Projeto

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em **"Select a project"** → **"NEW PROJECT"**
3. Nome: `Google Business Reviews API` (ou similar)
4. Clique em **"CREATE"**

### 1.2 Ativar Google My Business API

1. No menu lateral, vá em **"APIs & Services"** → **"Library"**
2. Busque por: `Google My Business API`
3. Clique em **"ENABLE"**

### 1.3 Configurar OAuth Consent Screen

1. Vá em **"APIs & Services"** → **"OAuth consent screen"**
2. Escolha **"External"**
3. Preencha:
   - **App name:** Nome da sua aplicação
   - **User support email:** Seu email
   - **Developer contact:** Seu email
4. Clique em **"SAVE AND CONTINUE"**
5. Em **"Scopes"**, adicione:
   - `https://www.googleapis.com/auth/business.manage`
6. Clique em **"SAVE AND CONTINUE"**

### 1.4 Criar Credenciais OAuth 2.0

1. Vá em **"APIs & Services"** → **"Credentials"**
2. Clique em **"CREATE CREDENTIALS"** → **"OAuth client ID"**
3. Tipo: **"Web application"**
4. Nome: `Google Business OAuth Client`
5. **Authorized redirect URIs:**
   - `https://landing-craftsman-76.lovable.app/oauth2/callback`
6. Clique em **"CREATE"**
7. **Copie:**
   - `Client ID` (formato: `xxx.apps.googleusercontent.com`)
   - `Client Secret` (formato: `GOCSPX-xxx`)

---

## 🖥️ Configuração via Interface Web

### 2.1 Acessar Painel Google Business OAuth

1. Acesse seu painel de administração
2. Navegue para **Repository** → **Google Business OAuth**

### 2.2 Configurar Credenciais

1. **Preencha os campos:**
   - **Client ID:** Cole o valor obtido no passo 1.4
   - **Client Secret:** Cole o valor obtido no passo 1.4

2. **Gerar Refresh Token:**
   - Clique no botão **"Gerar Token"**
   - Uma janela OAuth será aberta
   - Faça login com sua conta do Google Business
   - Autorize o acesso
   - Após autorização, copie o código da URL de callback
   - Cole no modal e clique em **"Trocar por Token"**

3. **Salvar e Testar:**
   - Clique em **"Salvar Credenciais"**
   - Clique em **"Testar Conexão"**
   - Verifique o badge de status: 🟢 **Conectado**

---

## ✅ Checklist Rápido (Pré-requisitos Obrigatórios)

Antes de gerar o token, certifique-se:

### 📍 Redirect URI
- ✅ Redirect URI **exato**: `https://landing-craftsman-76.lovable.app/oauth2/callback`
- ⚠️ **Sem barra final** (`/`)
- ⚠️ **HTTPS obrigatório**

### 🔑 Escopos OAuth
Adicione no **OAuth Consent Screen → Scopes**:
- `https://www.googleapis.com/auth/business.manage`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`
- `openid`

### 📚 APIs Obrigatórias (ATUALIZADO 2025)

⚠️ **IMPORTANTE:** A API v4 foi descontinuada em 2022. Use apenas v1.

**APIs CORRETAS (v1 - ativas desde 2021):**
1. ✅ **My Business Business Information API v1** (crítico!)
   - Endpoint: `mybusinessbusinessinformation.googleapis.com/v1`
   - Usado para: Locations, Reviews
   
2. ✅ **My Business Account Management API v1** (crítico!)
   - Endpoint: `mybusinessaccountmanagement.googleapis.com/v1`
   - Usado para: Accounts

3. ✅ **Business Profile Performance API** (opcional, fallback)
4. ✅ **Google Places API** (opcional, fallback)

**APIs INCORRETAS (NÃO USAR):**
- ❌ ~~Google My Business API v4~~ (DESCONTINUADO desde 2022)
- ❌ ~~mybusiness.googleapis.com/v4~~ (retorna 404)

**Como ativar:**
1. Google Cloud Console → APIs & Services → Library
2. Buscar "My Business Business Information API" → Enable
3. Buscar "My Business Account Management API" → Enable

### 👤 Usuário de Teste
- ✅ Adicione seu email em **OAuth Consent Screen → Test users**
- ⚠️ **Use o mesmo email** ao fazer login no fluxo OAuth

---

## 🔧 Troubleshooting: Erros Comuns

### ❌ Erro: `invalid_grant` / `Bad Request`

| Causa | Solução |
|-------|---------|
| Código OAuth reutilizado | Refaça o fluxo do início (código expira em ~10min) |
| Redirect URI incorreto | Verifique que é exatamente `https://landing-craftsman-76.lovable.app/oauth2/callback` |
| Escopo não habilitado | Adicione `business.manage` no OAuth Consent Screen |
| API errada | Ative **My Business Business Information API** (não só Performance) |
| Email não autorizado | Use o mesmo email cadastrado como Test User no GCP |

### 🧪 Como Testar

1. Limpe credenciais antigas com o botão "🗑️ Limpar Token e Refazer OAuth"
2. Cole código **imediatamente** após autorização (expira em ~10min)
3. Verifique logs no Supabase Edge Functions
4. Confira se `redirectMatch: true` aparece nos logs

---

## 🔄 Fluxo de Extração

```
Google Business Profile API (OAuth) → Reviews Reais
    ↓ (fallback)
Google Places API (API Key) → Reviews Limitados
    ↓ (fallback)
Web Scraping → Reviews Básicos
```

---

## 📚 Referências

- [Google My Business API](https://developers.google.com/my-business)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [My Business Business Information API](https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com)
- [Business Profile Performance API](https://console.cloud.google.com/apis/library/businessprofileperformance.googleapis.com)

---

**Última atualização:** 2025-10-06
