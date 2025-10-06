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

---

**Última atualização:** 2025-10-06
