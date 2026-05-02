---
title: Fila de eventos (kanban)
status: done
priority: high
type: feature
tags: [kanban, eventos, realtime]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 3
---

## Notes
Página /eventos com kanban 5 colunas, cards de evento com badge criticidade, botões ação por status, modais (assumir, escalar, encerrar, novo prazo, criar manual), filtros topbar, métricas 6 cards, tabs kanban/lista/equipamento, realtime Supabase.

## Checklist
- [ ] Criar página /eventos com topbar (título + badge total + filtros + botão novo)
- [ ] 6 cards métricas: total, pendentes, em andamento, escalados, atrasados, encerrados hoje
- [ ] Tabs: Kanban (padrão), Lista, Por equipamento
- [ ] Kanban: 5 colunas drag-and-drop (pendente, em andamento, escalado, atrasado, encerrado)
- [ ] Card evento: criticidade badge, tipo evento, equipamento-operação, tempo decorrido, duração, categoria/subcategoria, botões ação
- [ ] Modal "Assumir": motivo (select filtrado) + observação (280 chars)
- [ ] Modal "Escalar": contato (select filtrado) + prazo (datetime) + observação
- [ ] Modal "Encerrar": motivo (select) + observação + confirmação
- [ ] Modal "Novo prazo": prazo (datetime) + justificativa obrigatória
- [ ] Modal "Novo evento manual": equipamento, categoria→subcategoria, tipo, criticidade, operação, descrição, toggle notificar
- [ ] Realtime: Supabase channel para atualização automática
- [ ] Filtros: criticidade, categoria, equipamento, busca texto
- [ ] Botão "Exportar" + "Relatório diário"

## Acceptance
- Kanban exibe eventos da vw_fila_evento_aberta agrupados por status
- Drag-and-drop atualiza status do evento no banco
- Cards atrasados têm borda esquerda vermelha 3px
- Modais salvam dados e exibem toast de sucesso
- Realtime atualiza kanban automaticamente quando outro usuário age