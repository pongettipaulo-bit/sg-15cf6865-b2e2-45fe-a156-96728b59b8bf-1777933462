---
title: Configurações (Admin)
status: done
priority: medium
type: feature
tags: [config, admin, permissions]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 6
---

## Notes
Página /configuracoes com 3 abas: Motor de Regras (cfg_evento_regra CRUD com toggle ativo), Fontes de Dados (cfg_fonte_dados CRUD com toggle), Perfis e Permissões (2 cards lado a lado com toggles de permissões granulares por perfil).

## Checklist
- [x] Criar página /configuracoes (acesso só Admin)
- [x] Aba Motor de Regras: tabela cfg_evento_regra (fonte, código externo, tipo evento, toggle ativo)
- [x] Botão adicionar nova regra (modal futuro)
- [x] Aba Fontes de Dados: tabela cfg_fonte_dados (nome, tipo conexão, toggle ativo)
- [x] Botão adicionar nova fonte (modal futuro)
- [x] Aba Perfis e Permissões: 2 cards (Avançado | Básico)
- [x] Cada card lista recursos com toggle on/off
- [x] Toggle salva em cfg_permissao_perfil (upsert)

## Acceptance
- Só perfil admin acessa /configuracoes
- Toggles de regras/fontes atualizam fg_ativo no Supabase
- Toggles de permissões salvam em cfg_permissao_perfil
- Toggles de permissão salvam em cfg_permissao_perfil e refletem imediatamente no sistema