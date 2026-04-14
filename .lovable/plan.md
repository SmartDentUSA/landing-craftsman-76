

## Plan: Stop resource exhaustion by gating data queries behind authentication

### Root cause
`CategoryProvider` wraps the entire `App` in `src/App.tsx` (line 34). It calls `useProductCategories` and `useCategoryConfig`, which both fetch from `categories_config` on mount -- even on public routes like `/` and `/auth`. Every visitor, every preview reload, every bot hit fires 2+ Supabase queries unnecessarily.

### Changes

**1. Move `CategoryProvider` inside `ProtectedRoute` (`src/App.tsx`)**
- Remove `<CategoryProvider>` from wrapping the entire app
- Create a small wrapper component that applies `CategoryProvider` only around protected children

**2. Gate `useProductCategories` and `useCategoryConfig` behind auth (`src/hooks/useProductCategories.ts`, `src/hooks/useCategoryConfig.ts`)**
- Accept an `enabled` parameter (default `true`)
- Skip the initial fetch when `enabled` is false
- This is a safety net in case the hooks are used outside the provider

**3. Update `ProtectedRoute` to include `CategoryProvider` (`src/components/ProtectedRoute.tsx`)**
- Wrap children with `CategoryProvider` only after user is authenticated
- This ensures categories only load when a logged-in user reaches a protected page

**4. Handle `useCategoryContext` on public routes**
- Any public component that might call `useCategoryContext` will get a graceful fallback instead of a crash (the context won't exist on public routes)

### Files to edit
- `src/App.tsx` -- remove global `CategoryProvider`
- `src/components/ProtectedRoute.tsx` -- add `CategoryProvider` wrapper around children
- `src/hooks/useProductCategories.ts` -- add `enabled` guard
- `src/hooks/useCategoryConfig.ts` -- add `enabled` guard

### Result
- Public routes (`/`, `/auth`) make zero Supabase queries on load
- Resource consumption drops significantly
- Auth flow becomes faster and more reliable

