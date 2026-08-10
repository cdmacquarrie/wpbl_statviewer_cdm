# WPBL Stat Viewer (Unofficial)

An unofficial, fan-made dashboard for the 2026 WPBL (Women's Pro Baseball League) season. This
project is **not affiliated with, endorsed by, or sponsored by the WPBL**. All underlying stats,
player bios, and draft data are sourced from the league's own public site,
[womensprobaseballleague.com](https://www.womensprobaseballleague.com) — go there for official
information. Every generated page links back to it and carries the same disclaimer in its footer.

Built with [Claude Code](https://claude.com/claude-code): the scraper, analysis pipeline, dashboard
pages, and this README were written by Claude in an interactive session with the repo owner, not
hand-coded from scratch.

Scrapes the league site daily and regenerates four HTML dashboards (Team Stats, Player Bios,
At-Bat Analytics, Stat Explorer), combined into one tabbed page. All site data is server-rendered
(no headless browser needed — plain `fetch` + `cheerio` is enough).

## Run it

```
npm install
npm start
```

This runs, in order:

1. `scrape.js` — fetches `/stats/` (batting, pitching, team batting/pitching/fielding tables) and
   `/prospect-ranking/` (the full draft class — both `Signed` and `Drafted`-but-not-yet-signed
   players — including draft round/pick and hometown) → `output/raw_data.json`
2. `geocode.js` — geocodes each unique hometown via Nominatim (OpenStreetMap, no API key) and caches
   lat/lon + distance-from-Springfield-IL (where every 2026 game is played) in the **repo-tracked**
   `hometown_geocache.json`, so only newly-seen hometowns hit the network on later runs.
3. `analyze.js` — merges bios with stats, computes standings/per-game rates/run differential,
   full batting/pitching leaderboards, age & nationality demographics, and a PCA embedding (+ real
   eigenvector loadings) of each batter's at-bat rate-stat profile → `output/result.json`
4. `build_stats.js`, `build_bios.js`, `build_analytics.js`, `build_explorer.js` — each reads
   `output/result.json` and writes one self-contained HTML file to `output/`.
5. `build_dashboard.js` — combines all four into one tabbed `output/wpbl_dashboard.html` (scopes
   each panel's CSS and wraps each panel's script in its own IIFE so identical class/variable names
   across the source pages can't collide once they share one document).

Every page (and the Stat Explorer / Analytics / Team Stats leaderboards specifically) has a toggle
to include or exclude drafted-but-not-yet-signed players, since the site's own "Signed" status flag
has been observed to lag actual game participation for at least one player.

Note: t-SNE and UMAP were tried and dropped — at ~59 batters with 1–9 PAs each, both nonlinear
embeddings just re-derived "got a hit or not," which isn't worth the "why are you running ML on 2
games of at-bats" look. PCA stayed since it's linear, cheap, and its loadings are directly honest
about what PC1/PC2 mean. The PCA/Analytics page only covers batting (at-bat outcomes) — pitching,
fielding, and base-running aren't part of that model; use the Stat Explorer for those.

## Live site (GitHub Pages)

`.github/workflows/deploy.yml` runs the full pipeline on a daily cron (~9pm Pacific),
on every push to `main`, and on manual dispatch, then publishes `output/` (with
`wpbl_dashboard.html` copied to `index.html`) to GitHub Pages via the native
`actions/deploy-pages` flow — no PAT or secret needed, just the workflow's own
`GITHUB_TOKEN`. This is what actually solves same-day auto-updates; it doesn't
depend on Claude's GitHub App access at all.

GitHub Pages requires the repo to be public (or a paid plan) — this repo is public, and was
confirmed to contain no secrets/credentials before making it so.

One-time setup (repo owner, via the GitHub web UI): **Settings → Pages → Source:
"GitHub Actions"**. After that the workflow owns deployment — the site goes live at
`https://cdmacquarrie.github.io/wpbl_statviewer_cdm/` on the next run (or trigger one now
from the Actions tab → "Scrape and deploy WPBL dashboard" → Run workflow).

## Related fan projects

A few other unofficial WPBL projects exist on GitHub — worth a look if you're building something
similar:

- [rockysnow7/wpybl](https://github.com/rockysnow7/wpybl) — a Python library for pulling WPBL data
  from the league's API (a `pybaseball`-style tool), MIT-licensed, with the same "fan-made, not
  affiliated" disclaimer this project carries.
- [ty-porter/wpbl-api-request-samples](https://github.com/ty-porter/wpbl-api-request-samples) —
  captured API request/response samples from `stats.womensprobaseballleague.com` during a live
  game. Useful if this project ever moves off scraping server-rendered HTML onto that API directly.
- [MaryGaney/wpbl-global-view](https://github.com/MaryGaney/wpbl-global-view) — an interactive
  Leaflet.js world map of player hometowns. Built independently of (and before either project knew
  about) this repo's "distance from Springfield, IL" hometown stat, but worth crediting as a
  parallel take on the same idea.

## Design notes

- Light theme, off-white surfaces (`#f5f4f0` page / `#ffffff` cards).
- Team colors are fixed and CVD-validated — do not change without re-running the palette validator:
  `LA #ab7d2e` (tan/gold), `NY #1d4fd6` (blue), `SF #a020a0` (magenta-purple), `BOS #1f7a45` (green).
- `wpbl_explorer.html` and the leaderboards on `wpbl_stats.html`/`wpbl_bios.html` are fully
  client-side interactive (dropdowns and toggles recompute stats and redraw in-browser).
- Every page carries a sample-size caveat since the season is only a few games old; keep it as the
  game count grows unless it becomes misleading.
