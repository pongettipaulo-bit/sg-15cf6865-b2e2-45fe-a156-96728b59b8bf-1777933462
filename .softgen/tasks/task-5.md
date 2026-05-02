---
title: Equipamentos
status: todo
priority: medium
type: feature
tags: [equipments, history]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 4
---

## Notes
Página /equipamentos com grid de cards, cada card mostra nome (formato "CÓDIGO - NUM - TIPO - MODELO"), grupo/tipo, indicador online/offline, badge eventos abertos, botão "Ver histórico" que abre drawer lateral com timeline últimos 30 dias.

## Checklist
- [ ] Criar página /equipamentos com grid responsivo de cards
- [ ] Card equipamento: nome formato padrão, grupo/tipo, status online (verde) / offline (cinza), badge eventos abertos (vermelho)
- [ ] Botão "Ver histórico" abre drawer lateral
- [ ] Drawer: nome completo equipamento, métricas (total eventos, tempo médio resolução, criticidade mais frequente)
- [ ] Timeline últimos 30 dias: data/hora, tipo evento, criticidade, duração, motivo encerramento, linha colorida por criticidade
- [ ] Busca e filtro por grupo/tipo/status

## Acceptance
- Grid exibe todos equipamentos ativos do dim_equipamento
- Indicador online/offline baseado em fg_online da vw_fila_evento_aberta (último registro)
- Timeline ordena eventos por data decrescente com scroll vertical