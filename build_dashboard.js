const fs = require('fs');

const SECTIONS = [
  { file: 'wpbl_stats.html', id: 'stats', tab: 'Team Stats' },
  { file: 'wpbl_bios.html', id: 'bios', tab: 'Player Bios' },
  { file: 'wpbl_analytics.html', id: 'analytics', tab: 'Analytics' },
  { file: 'wpbl_explorer.html', id: 'explorer', tab: 'Stat Explorer' },
];

const parts = SECTIONS.map(s => {
  const raw = fs.readFileSync(`./output/${s.file}`, 'utf8');
  const m = raw.match(/<title>([\s\S]*?)<\/title>\s*<style>([\s\S]*?)<\/style>\s*([\s\S]*)$/);
  if (!m) throw new Error(`Could not parse ${s.file} — unexpected template shape`);
  const [, title, style, rest] = m;
  return { ...s, title: title.trim(), style, rest };
});

const tabButtons = parts.map((p, i) =>
  `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${p.id}">${p.tab}</button>`
).join('\n      ');

const tabPanels = parts.map((p, i) =>
  `<section class="tab-panel${i === 0 ? ' active' : ''}" id="panel-${p.id}">\n<style>${p.style}</style>\n${p.rest}\n</section>`
).join('\n\n');

const html = `<title>WPBL 2026 Dashboard</title>
<style>
.dash-root {
  color-scheme: light;
  --surface-0: #f5f4f0; --surface-1: #ffffff;
  --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #898781;
  --border: rgba(11,11,11,0.10); --accent: #1d4fd6;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: var(--surface-0); min-height: 100vh;
}
.dash-nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; gap: 6px; flex-wrap: wrap;
  background: var(--surface-1); border-bottom: 1px solid var(--border);
  padding: 12px 20px; box-sizing: border-box;
}
.dash-nav .brand { font-weight: 800; font-size: 14px; color: var(--text-primary); margin-right: 18px; align-self: center; letter-spacing: -0.01em; }
.tab-btn {
  font-family: inherit; font-size: 13px; font-weight: 600; color: var(--text-secondary);
  background: transparent; border: 1px solid transparent; border-radius: 7px;
  padding: 8px 14px; cursor: pointer;
}
.tab-btn:hover { background: var(--surface-0); color: var(--text-primary); }
.tab-btn.active { background: var(--accent); color: #fff; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }
</style>
<div class="dash-root">
  <nav class="dash-nav">
    <span class="brand">WPBL 2026</span>
    ${tabButtons}
  </nav>
  ${tabPanels}
</div>
<script>
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});
</script>
`;

fs.writeFileSync('./output/wpbl_dashboard.html', html);
console.log('Wrote wpbl_dashboard.html —', SECTIONS.length, 'tabs combined');
