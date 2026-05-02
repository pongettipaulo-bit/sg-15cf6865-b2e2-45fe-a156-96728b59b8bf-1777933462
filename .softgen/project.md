# FieldOS — Gestão de Eventos Operacionais Agroindustriais

## Vision
Plataforma de gestão de eventos operacionais para centrais de operação agroindustrial (COA). Recebe telemetria de equipamentos agrícolas (colhedoras, transbordos, canavieiros), detecta anomalias via motor de regras, e entrega fila de eventos para analistas tratarem em turnos 24/7. Três perfis: Admin (config total), Avançado (operador COA), Básico (analista). Backend Supabase já existe.

## Design
Industrial operational control system — dark sidebar (#1a1a2e) + white content area, high-contrast status indicators.

Colors (HSL format):
- `--primary: 207 71% 37%` (#185FA5 — primary blue)
- `--primary-light: 210 76% 94%` (#E6F1FB)
- `--primary-dark: 207 77% 27%` (#0C447C)
- `--success: 90 63% 25%` (#3B6D11 — harvest green)
- `--success-bg: 90 52% 91%` (#EAF3DE)
- `--warning: 36 86% 29%` (#854F0B — soil amber)
- `--warning-bg: 45 84% 93%` (#FAEEDA)
- `--destructive: 0 65% 30%` (#791F1F — drought red)
- `--destructive-bg: 0 71% 95%` (#FCEBEB)
- `--sidebar: 240 25% 14%` (#1a1a2e — dark industrial)
- `--background: 0 0% 100%` (white)
- `--foreground: 240 10% 3.9%` (near-black)
- `--muted: 210 40% 96%` (light neutral)
- `--accent: 210 40% 96%` (light blue-gray)

Criticality colors:
- critica: `--destructive-bg` / `--destructive`
- alta: `--warning-bg` / hsl(36, 86%, 19%)
- media: `--primary-light` / `--primary-dark`
- baixa: `--success-bg` / hsl(90, 63%, 15%)

Fonts:
- Headings: IBM Plex Sans 600
- Body: IBM Plex Sans 400
- Data/mono: IBM Plex Mono 400

Style: Utilitarian industrial — real-time status badges, kanban with semantic colors, left-border severity indicators (3px red for overdue), dark sidebar for night-shift clarity.

## Features
1. Autenticação (3 perfis: Admin, Avançado, Básico) com controle granular de permissões
2. Dashboard: métricas tempo real (total eventos, por status, equipamentos top, categorias)
3. Fila de Eventos: kanban 5 colunas (pendente → em andamento → escalado → atrasado → encerrado), filtros, real-time Supabase
4. Equipamentos: grid com status online/offline, histórico por equipamento
5. Relatórios: período customizável, gráficos (linha, barras, pizza), exportar CSV
6. Configurações (Admin): motor de regras, fontes de dados, perfis/permissões
7. Cadastros (Admin + Avançado): tipos evento, motivos, categorias, subcategorias, escalation list, equipamentos, grupos, tipos, operadores, operações, unidades
8. Usuários (Admin): CRUD com Supabase Auth, vincular dim_usuario_sistema