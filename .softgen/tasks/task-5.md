---
title: Equipamentos
status: done
priority: medium
type: feature
tags: [equipments, history, timeline]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 4
---

## Notes
Página /equipamentos com grid de cards (status online/offline, badge eventos abertos), drawer lateral com histórico 30 dias, métricas do equipamento, timeline colorida por criticidade.

## Checklist
- [x] Criar página /equipamentos com cards de métricas gerais (total, online, com eventos)
- [x] Busca por equipamento (código, nome, grupo, tipo)
- [x] Grid de cards: nome completo, grupo-tipo, indicador online/offline, badge eventos abertos
- [x] Botão "Ver histórico" abre drawer lateral (Sheet)
- [x] Drawer: métricas do equipamento (total eventos 30d, tempo médio, criticidade top)
- [x] Timeline últimos 30 dias: data/hora, tipo, criticidade, duração, motivo encerramento
- [x] Linha colorida por criticidade (border-left)
- [x] Scroll vertical na timeline

## Acceptance
- Grid exibe equipamentos de dim_equipamento com fg_ativo=true
- Indicador online/offline reflete fg_online da vw_fila_evento_aberta (último registro)
- Timeline ordena eventos por data decrescente com scroll vertical