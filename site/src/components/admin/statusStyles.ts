// Оформлення розділу «Стан сервера» (світла й темна теми адмінки)
export const STATUS_CSS = `
.ss-wrap { --ss-ok: #1f8a4c; --ss-warn: #b45309; --ss-bad: #c2410c; --ss-ok-bg: #e6f5ec; --ss-warn-bg: #fdf3d6; --ss-bad-bg: #fde8e1;
  padding: 32px var(--gutter-h, 60px) 64px; max-width: 1200px; }
html[data-theme='dark'] .ss-wrap { --ss-ok: #4ccb7f; --ss-warn: #f1b44c; --ss-bad: #ff8a5c; --ss-ok-bg: #12301f; --ss-warn-bg: #3d3214; --ss-bad-bg: #42190f; }
.ss-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; margin-bottom: 18px; }
.ss-head h1 { margin: 0 0 4px; }
.ss-sub, .ss-muted { color: var(--theme-elevation-600); margin: 0; }
.ss-btn { font: inherit; font-size: 13px; font-weight: 600; padding: 8px 14px; border-radius: 8px; border: 1px solid var(--theme-elevation-250); background: var(--theme-elevation-0); color: var(--theme-elevation-1000); cursor: pointer; text-decoration: none; white-space: nowrap; }
.ss-btn:hover { border-color: var(--theme-elevation-500); }
.ss-btn.small { padding: 4px 10px; font-size: 12px; }
.ss-banner { display: flex; gap: 12px; align-items: flex-start; padding: 14px 18px; border-radius: 12px; margin-bottom: 18px; border: 1px solid; }
.ss-banner.ok { background: var(--ss-ok-bg); border-color: color-mix(in srgb, var(--ss-ok) 40%, transparent); }
.ss-banner.warn { background: var(--ss-warn-bg); border-color: color-mix(in srgb, var(--ss-warn) 40%, transparent); }
.ss-banner.bad { background: var(--ss-bad-bg); border-color: color-mix(in srgb, var(--ss-bad) 40%, transparent); }
.ss-banner ul { margin: 6px 0 0; padding-left: 18px; }
.ss-banner li + li { margin-top: 3px; }
.ss-dot { width: 12px; height: 12px; border-radius: 50%; flex: none; margin-top: 5px; background: var(--ss-ok); }
.ss-banner.warn .ss-dot { background: var(--ss-warn); } .ss-banner.bad .ss-dot { background: var(--ss-bad); }
.ss-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.ss-card, .ss-section { border: 1px solid var(--theme-elevation-150); border-radius: 12px; padding: 16px 18px; background: var(--theme-elevation-0); }
.ss-card { display: flex; flex-direction: column; }
.ss-card h2, .ss-section h2 { margin: 0 0 8px; font-size: 13px; font-weight: 600; color: var(--theme-elevation-600); text-transform: uppercase; letter-spacing: .04em; }
.ss-big { font-size: 26px; font-weight: 700; line-height: 1.2; margin: 0 0 4px; font-variant-numeric: tabular-nums; }
.ss-big small { font-size: 13px; font-weight: 400; color: var(--theme-elevation-600); }
.ss-big a { color: inherit; }
.ss-big.warn { color: var(--ss-warn); } .ss-big.bad { color: var(--ss-bad); }
.ss-line { margin: 0 0 8px; font-size: 13px; }
.ss-card dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; margin: 10px 0 0; font-size: 13px; }
.ss-card dt { color: var(--theme-elevation-600); }
.ss-card dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
.ss-card dd small { color: var(--theme-elevation-600); }
.ss-counts { margin-top: 0 !important; font-size: 14px !important; gap: 8px 12px !important; }
.ss-counts dd { font-weight: 700; }
.ss-more { margin-top: auto; padding-top: 10px; font-size: 13px; font-weight: 600; }
.ss-meter { height: 8px; border-radius: 99px; background: var(--theme-elevation-100); overflow: hidden; margin: 6px 0 2px; }
.ss-meter i { display: block; height: 100%; border-radius: 99px; background: var(--ss-ok); }
.ss-meter.warn i { background: var(--ss-warn); } .ss-meter.bad i { background: var(--ss-bad); }
.ss-section { margin-bottom: 12px; }
.ss-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
.ss-section-head h2 { margin: 0; }
.ss-chip { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 99px; background: var(--theme-elevation-100); color: var(--theme-elevation-700); }
.ss-chip.ok { background: var(--ss-ok-bg); color: var(--ss-ok); }
.ss-chip.warn { background: var(--ss-warn-bg); color: var(--ss-warn); }
.ss-chip.bad { background: var(--ss-bad-bg); color: var(--ss-bad); }
.ss-chip.small { font-size: 11px; padding: 1px 6px; }
.ss-list { list-style: none; margin: 8px 0; padding: 0; font-size: 13px; }
.ss-list li { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; padding: 7px 0; border-top: 1px solid var(--theme-elevation-100); }
.ss-list code { font-size: 12px; background: var(--theme-elevation-50); padding: 1px 6px; border-radius: 4px; word-break: break-all; }
.ss-when { color: var(--theme-elevation-600); font-variant-numeric: tabular-nums; white-space: nowrap; }
.ss-msg { flex: 1 1 320px; min-width: 0; word-break: break-word; }
.ss-doc { font-weight: 600; }
.ss-hint { font-size: 13px; color: var(--theme-elevation-700); margin: 8px 0 0; }
.ss-hint code { background: var(--theme-elevation-50); padding: 2px 6px; border-radius: 4px; }
.ss-group { border-top: 1px solid var(--theme-elevation-100); padding: 8px 0; }
.ss-group summary { cursor: pointer; font-size: 14px; }
.ss-group.bad summary b { color: var(--ss-bad); } .ss-group.warn summary b { color: var(--ss-warn); }
.ss-pulse { animation: ss-pulse 1.4s infinite; }
@keyframes ss-pulse { 50% { opacity: .45; } }
@media (max-width: 1000px) { .ss-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .ss-wrap { padding: 20px 16px 48px; } .ss-grid { grid-template-columns: 1fr; } }
`
