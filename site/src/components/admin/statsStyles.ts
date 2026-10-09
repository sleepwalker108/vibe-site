// Оформлення розділу «Статистика» (світла й темна теми адмінки)
export const STATS_CSS = `
.st-wrap, .st-summary { --st-views: #b7d0ee; --st-visitors: #0057b8; --st-up: #1f8a4c; --st-down: #c2410c; }
html[data-theme='dark'] .st-wrap, html[data-theme='dark'] .st-summary { --st-views: #2c4a70; --st-visitors: #7ab2ff; --st-up: #4ccb7f; --st-down: #ff8a5c; }
.st-wrap { padding: 32px var(--gutter-h, 60px) 64px; max-width: 1400px; }
.st-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.st-head h1 { margin: 0 0 6px; }
.st-sub { margin: 0; color: var(--theme-elevation-600); max-width: 640px; }
.st-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.st-badge { display: inline-block; vertical-align: middle; margin-left: 10px; padding: 3px 10px; border-radius: 999px; font-size: 13px; font-weight: 600; background: var(--st-views); color: var(--theme-elevation-1000); }
.st-code { display: inline-block; min-width: 26px; margin-right: 8px; padding: 1px 4px; border-radius: 4px; font-size: 11px; font-weight: 700; text-align: center; background: var(--theme-elevation-100); color: var(--theme-elevation-700); }
.st-periods { display: flex; border: 1px solid var(--theme-elevation-150); border-radius: 999px; padding: 3px; }
.st-periods a { padding: 6px 14px; border-radius: 999px; text-decoration: none; color: inherit; font-size: 13px; font-weight: 600; }
.st-periods a.active { background: var(--theme-elevation-1000); color: var(--theme-elevation-0); }
.st-note { padding: 12px 16px; border-radius: 10px; background: var(--theme-elevation-50); border: 1px dashed var(--theme-elevation-250); margin-bottom: 16px; }
.st-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.st-kpi, .st-card { border: 1px solid var(--theme-elevation-150); border-radius: 12px; padding: 16px 18px; background: var(--theme-elevation-0); }
.st-kpi-label { font-size: 13px; color: var(--theme-elevation-600); }
.st-kpi-value { font-size: 32px; font-weight: 700; line-height: 1.2; margin: 4px 0; display: flex; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }
.st-trend { font-size: 12px; color: var(--theme-elevation-600); }
.st-trend.up { color: var(--st-up); } .st-trend.down { color: var(--st-down); }
.st-trend small { color: var(--theme-elevation-500); font-size: 12px; }
.st-live { width: 10px; height: 10px; border-radius: 50%; background: var(--theme-elevation-300); display: inline-block; }
.st-live.on { background: var(--st-up); box-shadow: 0 0 0 0 var(--st-up); animation: st-pulse 2s infinite; }
@keyframes st-pulse { 70% { box-shadow: 0 0 0 8px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
.st-card h3 { margin: 0 0 12px; font-size: 16px; }
.st-card-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.st-legend { display: flex; gap: 16px; font-size: 12px; color: var(--theme-elevation-700); }
.st-legend span, .st-tip span { display: inline-flex; align-items: center; gap: 6px; }
.sw { width: 10px; height: 10px; border-radius: 3px; display: inline-block; flex: none; }
.sw.views { background: var(--st-views); } .sw.visitors { background: var(--st-visitors); }
.st-chart { position: relative; height: 240px; margin: 8px 0 28px 44px; }
.st-grid { position: absolute; inset: 0; pointer-events: none; }
.st-gridline { position: absolute; left: 0; right: 0; border-top: 1px solid var(--theme-elevation-100); }
.st-gridline span { position: absolute; right: calc(100% + 8px); top: -8px; font-size: 11px; color: var(--theme-elevation-500); font-variant-numeric: tabular-nums; }
.st-bars { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); }
.st-col { position: relative; height: 100%; outline: none; }
.st-col:hover, .st-col:focus-visible { background: var(--theme-elevation-50); }
.st-bar { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: min(70%, 28px); border-radius: 4px 4px 0 0; }
.st-bar.visitors { width: min(40%, 14px); }
.st-bar.views { background: var(--st-views); } .st-bar.visitors { background: var(--st-visitors); }
.st-tip { display: none; position: absolute; bottom: calc(100% - 40px); left: 60%; z-index: 5; min-width: 170px; padding: 10px 12px; border-radius: 8px;
  background: var(--theme-elevation-0); border: 1px solid var(--theme-elevation-200); box-shadow: 0 6px 20px rgba(0,0,0,.15); font-size: 12px; flex-direction: column; gap: 4px; pointer-events: none; }
.st-tip.left { left: auto; right: 60%; }
.st-col:hover .st-tip, .st-col:focus-visible .st-tip { display: flex; }
.st-x { position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); font-size: 11px; color: var(--theme-elevation-500); white-space: nowrap; }
.st-cols { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 12px; margin-top: 12px; align-items: start; }
.st-stack { display: grid; gap: 12px; }
.st-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.st-table th { text-align: right; font-weight: 500; font-size: 12px; color: var(--theme-elevation-500); padding: 0 0 6px 12px; }
.st-table td { padding: 7px 0 7px 12px; text-align: right; border-top: 1px solid var(--theme-elevation-100); font-variant-numeric: tabular-nums; vertical-align: top; }
.st-table td:first-child { text-align: left; padding-left: 0; width: 100%; }
.st-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 520px; }
.st-name a { color: inherit; text-decoration: none; } .st-name a:hover { text-decoration: underline; }
.st-share { height: 4px; background: var(--theme-elevation-100); border-radius: 2px; margin-top: 5px; overflow: hidden; }
.st-share span { display: block; height: 100%; background: var(--st-visitors); border-radius: 2px; }
.st-empty { margin: 0; color: var(--theme-elevation-500); font-size: 13px; }
@media (max-width: 1000px) { .st-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .st-cols { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .st-wrap { padding: 20px 16px 48px; } .st-kpi-value { font-size: 24px; } .st-chart { height: 180px; } }

/* Підсумок на головній сторінці адмінки */
.st-summary { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; border: 1px solid var(--theme-elevation-150); border-radius: 12px; padding: 14px 18px; margin-bottom: 24px; }
.st-summary h3 { margin: 0; font-size: 15px; }
.st-summary .st-s { display: flex; flex-direction: column; }
.st-summary .st-s b { font-size: 22px; font-variant-numeric: tabular-nums; display: flex; align-items: center; gap: 6px; }
.st-summary .st-s span { font-size: 12px; color: var(--theme-elevation-600); }
.st-summary .st-more { margin-left: auto; padding: 8px 14px; border-radius: 999px; background: var(--theme-elevation-1000); color: var(--theme-elevation-0); text-decoration: none; font-weight: 600; font-size: 13px; }
`
