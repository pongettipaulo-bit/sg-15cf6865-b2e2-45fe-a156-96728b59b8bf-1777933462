---
title: Autenticação e controle de acesso
status: todo
priority: urgent
type: feature
tags: [auth, permissions]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 1
---

## Notes
Tela de login com visual agroindustrial (fundo campo + card branco), integração Supabase Auth, proteção de rotas por perfil (admin/avancado/basico), hook useAuth, controle de permissões granular via cfg_permissao_perfil.

## Checklist
- [ ] Criar página /login com visual field background + card central
- [ ] Criar lib/supabase.ts com cliente Supabase configurado
- [ ] Criar hook useAuth (login, logout, session, perfil, permissões)
- [ ] Criar middleware/proteção de rotas (_app.tsx redirect se não autenticado)
- [ ] Criar hook usePermissions para verificar acesso a recursos
- [ ] Criar componente ProtectedRoute para controle fino de acesso
- [ ] Adicionar "Esqueceu a senha?" funcional

## Acceptance
- Login com email/senha redireciona para /dashboard se sucesso
- Rotas protegidas redirecionam para /login se não autenticado
- Menu sidebar oculta itens sem permissão baseado no perfil do usuário