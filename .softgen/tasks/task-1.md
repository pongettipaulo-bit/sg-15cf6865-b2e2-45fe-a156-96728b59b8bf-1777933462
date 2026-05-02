---
title: Design system e estrutura base
status: in_progress
priority: urgent
type: feature
tags: [design-system, layout, auth]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 0
---

## Notes
Configurar design system completo (cores industriais agrícolas, fontes IBM Plex), layout com sidebar escura colapsável, provider Supabase, React Query, ThemeProvider, e estrutura de pastas.

## Checklist
- [x] Criar .softgen/project.md com Vision, Design, Features
- [x] Configurar globals.css com CSS variables (cores criticidade, status, sidebar)
- [x] Configurar tailwind.config.ts (IBM Plex Sans/Mono, cores customizadas)
- [x] Criar componente Sidebar com navegação e collapse
- [x] Criar layout _app.tsx com Sidebar + providers (Supabase, React Query, Theme)
- [x] Criar página index.tsx com redirect para /dashboard
- [x] Instalar dependências: @supabase/supabase-js, @tanstack/react-query, date-fns

## Acceptance
- Sidebar escura (#1a1a2e) exibe logo "FieldOS" e menu de navegação
- Cores de criticidade e status aplicam corretamente via Tailwind
- Fontes IBM Plex Sans/Mono carregam do Google Fonts