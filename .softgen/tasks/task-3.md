---
title: Dashboard principal
status: done
priority: high
type: feature
tags: [dashboard, metrics, charts]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 2
---

## Notes
Dashboard com métricas tempo real: total eventos, por status, encerrados (comparativo hoje vs ontem), top 5 equipamentos, eventos por categoria (pizza), timeline 24h. React Query com refetch automático a cada 30s.

## Checklist
- [x] Criar hook useDashboardMetrics com React Query (refetch 30s)
- [x] Card grande destaque: total eventos abertos
- [x] Cards status: pendentes, em andamento, escalados, atrasados
- [x] Card encerrados hoje vs ontem com indicador de tendência
- [x] Gráfico barras horizontal: top 5 equipamentos
- [x] Gráfico pizza: eventos por categoria
- [x] Gráfico linha: timeline últimas 24h
- [x] Skeleton loaders durante carregamento

## Acceptance
- Dashboard carrega métricas de vw_fila_evento_aberta e fila_evento
- Cards de status exibem cores corretas do design system
- Gráficos são interativos e responsivos