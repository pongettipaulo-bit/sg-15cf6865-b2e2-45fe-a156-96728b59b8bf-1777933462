---
title: Relatórios
status: todo
priority: medium
type: feature
tags: [reports, analytics]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 5
---

## Notes
Página /relatorios com seletor período (hoje, 7d, 30d, custom), métricas período, gráficos (linha eventos/dia, barras criticidade, top 10 equipamentos, pizza categorias), tabela eventos encerrados exportável CSV.

## Checklist
- [ ] Criar página /relatorios com seletor de período
- [ ] Métricas do período: total eventos, tempo médio resolução, taxa no prazo, pior equipamento
- [ ] Gráfico linha: eventos por dia do período
- [ ] Gráfico barras: distribuição por criticidade
- [ ] Barras horizontais: top 10 equipamentos com mais eventos
- [ ] Gráfico pizza: eventos por categoria
- [ ] Tabela eventos encerrados: data/hora, equipamento, tipo, criticidade, duração, motivo, responsável
- [ ] Botão exportar CSV (tabela completa)
- [ ] Filtros adicionais: categoria, equipamento, criticidade

## Acceptance
- Seletor de período atualiza todos gráficos e métricas
- CSV exportado contém todos eventos do período com headers corretos
- Gráficos são responsivos e interativos (tooltips, zoom)