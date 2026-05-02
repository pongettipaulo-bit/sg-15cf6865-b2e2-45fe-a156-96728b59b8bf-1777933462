---
title: Cadastros (Admin e Avançado)
status: in_progress
priority: low
type: feature
tags: [crud, admin, cadastros]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 7
---

## Notes
Páginas /cadastros/* com estrutura padrão: tabela busca/filtros, botão "+Novo", modal criar/editar, toggle ativo/inativo, paginação. 10 cadastros: tipos evento, motivos, categorias, subcategorias, escalation list, equipamentos, grupos equipamento, tipos equipamento, operadores, operações, unidades. Controle de acesso por permissão granular.

## Checklist
- [x] Criar página índice /cadastros com grid de cards navegáveis
- [ ] /cadastros/tipos-evento (dim_tipo_evento)
- [ ] /cadastros/motivos (dim_motivo_evento)
- [ ] /cadastros/categorias (dim_categoria_evento)
- [ ] /cadastros/subcategorias (dim_subcategoria_evento)
- [ ] /cadastros/escalation (dim_escalation_list)
- [ ] /cadastros/equipamentos (dim_equipamento)
- [ ] /cadastros/grupos-equipamento (dim_grupo_equipamento)
- [ ] /cadastros/tipos-equipamento (dim_tipo_equipamento)
- [ ] /cadastros/operadores (dim_operador)
- [ ] /cadastros/operacoes (dim_operacao)
- [ ] /cadastros/unidades (dim_unidade)
- [ ] Estrutura consistente: tabela + busca + modal criar/editar + toggle ativo
- [ ] Controle de acesso: Admin total, Avançado só com permissão

## Acceptance
- Cada cadastro exibe tabela com dados do Supabase e busca funcional
- Toggle ativo/inativo atualiza campo no banco sem deletar registro
- Admin acessa todos cadastros, Avançado só os que tiver permissão