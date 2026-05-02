---
title: Configurações (Admin)
status: todo
priority: medium
type: feature
tags: [config, admin]
created_by: agent
created_at: 2026-05-02T21:52:00Z
position: 6
---

## Notes
Página /configuracoes com 3 abas: Motor de Regras (cfg_evento_regra CRUD), Fontes de Dados (cfg_fonte_dados CRUD), Perfis e Permissões (2 cards Avançado/Básico com toggles permissões salvas em cfg_permissao_perfil). Acesso: Admin full, Avançado só vê se tiver permissão "config_sistema".

## Checklist
- [ ] Criar página /configuracoes com proteção Admin + Avançado com permissão
- [ ] Aba "Motor de Regras": tabela cfg_evento_regra (fonte, código externo, tipo evento, toggle ativo)
- [ ] Modal adicionar/editar regra motor
- [ ] Aba "Fontes de Dados": tabela cfg_fonte_dados (nome, tipo conexão, toggle ativo)
- [ ] Modal CRUD fontes de dados
- [ ] Aba "Perfis e Permissões": 2 cards lado a lado (Avançado | Básico)
- [ ] Cada card: lista permissões com toggle on/off, salva em cfg_permissao_perfil
- [ ] Permissões Avançado: cadastrar tipos/motivos/categorias, editar equipamentos/operadores, ver relatórios, exportar
- [ ] Permissões Básico: ver histórico equipamentos, ver relatórios, exportar

## Acceptance
- Apenas Admin acessa todas as 3 abas
- Avançado com permissão "config_sistema" acessa Regras e Fontes, mas não Perfis
- Toggles de permissão salvam em cfg_permissao_perfil e refletem imediatamente no sistema