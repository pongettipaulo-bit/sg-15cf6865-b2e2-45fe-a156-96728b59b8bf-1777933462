---
title: Relatórios
status: done
priority: medium
type: feature
tags: [reports, analytics, export]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 5
---

## Notes
Página /relatorios com período selecionável (hoje, 7d, 30d, customizado), métricas agregadas (total, tempo médio, taxa no prazo, pior equipamento), 4 gráficos (eventos/dia linha, criticidade barras, top10 equipamentos barras horizontal, categoria pizza), tabela exportável CSV.

## Checklist
- [x] Seletor de período: hoje | 7 dias | 30 dias | personalizado (date range)
- [x] Cards métricas: total eventos, tempo médio resolução, taxa no prazo, pior equipamento
- [x] Gráfico linha: eventos por dia
- [x] Gráfico barras vertical: eventos por criticidade
- [x] Gráfico barras horizontal: top 10 equipamentos com mais eventos
- [x] Gráfico pizza: eventos por categoria
- [x] Tabela eventos encerrados (primeiros 50, paginação futura)
- [x] Botão exportar CSV com todos os eventos do período

## Acceptance
- Seletor de período filtra eventos de fila_evento (status=encerrado)
- Exportar CSV gera arquivo com headers corretos
- Gráficos são responsivos e interativos (tooltips, zoom)