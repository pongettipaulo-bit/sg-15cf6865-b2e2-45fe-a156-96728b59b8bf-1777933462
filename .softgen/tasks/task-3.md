---
title: Dashboard principal
status: todo
priority: high
type: feature
tags: [dashboard, metrics]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 2
---

## Notes
Página /dashboard com métricas tempo real: total eventos abertos (card grande), por status (4 cards), comparativo encerrados hoje vs ontem, top 5 equipamentos (barras), eventos por categoria (pizza), timeline 24h (linha).

## Checklist
- [ ] Criar página /dashboard com grid de cards de métricas
- [ ] Implementar query vw_fila_evento_aberta para métricas gerais
- [ ] Card destaque: Total de eventos abertos (número grande + badge vermelho)
- [ ] 4 cards status: pendente, em andamento, escalado, atrasado
- [ ] Card comparativo: encerrados hoje vs ontem (diferença percentual)
- [ ] Gráfico barras horizontal: top 5 equipamentos com mais eventos
- [ ] Gráfico pizza: eventos por categoria
- [ ] Gráfico linha: timeline últimas 24h (eventos por hora)
- [ ] Skeleton loaders durante carregamento
- [ ] Auto-refresh a cada 30 segundos

## Acceptance
- Dashboard carrega métricas em menos de 2 segundos
- Cards de status exibem cores corretas do design system
- Gráficos são interativos e responsivos