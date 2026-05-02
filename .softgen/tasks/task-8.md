---
title: Cadastros (Admin e Avançado)
status: todo
priority: low
type: feature
tags: [crud, cadastros]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 7
---

## Notes
Páginas /cadastros/* com estrutura padrão: tabela busca/filtros, botão "+Novo", modal criar/editar, toggle ativo/inativo, paginação. 10 cadastros: tipos evento, motivos, categorias, subcategorias, escalation list, equipamentos, grupos equipamento, tipos equipamento, operadores, operações, unidades. Controle de acesso por permissão granular.

## Checklist
- [ ] Criar layout padrão cadastros com sidebar navegação entre cadastros
- [ ] /cadastros/tipos-evento: campos código externo, nome, criticidade, SLA, categoria, subcategoria, notificar telegram
- [ ] /cadastros/motivos: motivo, tipo evento vinculado, filtro por tipo
- [ ] /cadastros/categorias: nome, descrição, ícone, cor
- [ ] /cadastros/subcategorias: nome, categoria vinculada, descrição
- [ ] /cadastros/escalation: pessoa, contato, telegram_chat_id, tipo evento, ordem, turno, nível hierárquico
- [ ] /cadastros/equipamentos: código, nome, grupo, tipo, unidade
- [ ] /cadastros/grupos-equipamento: código, nome
- [ ] /cadastros/tipos-equipamento: código, nome
- [ ] /cadastros/operadores: código, nome
- [ ] /cadastros/operacoes: código, nome
- [ ] /cadastros/unidades: código, nome
- [ ] Modal CRUD padrão para cada cadastro
- [ ] Paginação com 50 itens por página
- [ ] Busca instantânea no lado cliente após carregar dados

## Acceptance
- Cada cadastro exibe tabela com dados do Supabase e busca funcional
- Toggle ativo/inativo atualiza campo no banco sem deletar registro
- Admin acessa todos cadastros, Avançado só os que tiver permissão