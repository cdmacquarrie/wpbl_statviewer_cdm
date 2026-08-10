# WPBL Stats Dashboards

Scrapes [womensprobaseballleague.com](https://www.womensprobaseballleague.com) daily and regenerates
four static HTML dashboards for the 2026 WPBL season. All site data is server-rendered (no headless
browser needed — plain `fetch` + `cheerio` is enough).

## Run it

```
npm install
npm start
```

This runs, in order:

1. `scrape.js` — fetches `/stats/` (batting, pitching, team batting/pitching/fielding tables) and
   `/prospect-ranking/` (drafted players, filtered to `Signed` status, including draft round/pick
   and hometown) → `output/raw_data.json`
2. `geocode.js` — geocodes each unique hometown via Nominatim (OpenStreetMap, no API key) and caches
   lat/lon + distance-from-Springfield-IL (where every 2026 game is played) in the **repo-tracked**
   `hometown_geocache.json`, so only newly-seen hometowns hit the network on later runs.
3. `analyze.js` — merges bios with stats, computes standings/per-game rates/run differential,
   full batting/pitching leaderboards, age & nationality demographics, and a PCA embedding (+ real
   eigenvector loadings) of each batter's rate-stat profile → `output/result.json`
4. `build_stats.js`, `build_bios.js`, `build_analytics.js`, `build_explorer.js` — each reads
   `output/result.json` and writes one self-contained HTML file to `output/`.
5. `build_dashboard.js` — combines all four into one tabbed `output/wpbl_dashboard.html` (scopes
   each panel's CSS by `#panel-<id>` so identical class names across the source pages can't bleed
   into each other).

Note: t-SNE and UMAP were tried and dropped — at ~59 batters with 1–9 PAs each, both nonlinear
embeddings just re-derived "got a hit or not," which isn't worth the "why are you running ML on 2
games of at-bats" look. PCA stayed since it's linear, cheap, and its loadings are directly honest
about what PC1/PC2 mean.

## Live site (GitHub Pages)

`.github/workflows/deploy.yml` runs the full pipeline on a daily cron (~9pm Pacific),
on every push to `main`, and on manual dispatch, then publishes `output/` (with
`wpbl_dashboard.html` copied to `index.html`) to GitHub Pages via the native
`actions/deploy-pages` flow — no PAT or secret needed, just the workflow's own
`GITHUB_TOKEN`. This is what actually solves same-day auto-updates; it doesn't
depend on Claude's GitHub App access at all.

One-time setup (repo owner, via the GitHub web UI): **Settings → Pages → Source:
"GitHub Actions"**. After that the workflow owns deployment — the site goes live at
`https://cdmacquarrie.github.io/wpbl_stats_cdm/` on the next run (or trigger one now
from the Actions tab → "Scrape and deploy WPBL dashboard" → Run workflow).

## Output → published artifacts

After running, publish each generated file to its **existing** artifact URL (do not mint new URLs —
pass the `url` param so the link stays stable for the user):

| File | Artifact URL |
|---|---|
| `output/wpbl_stats.html` | https://claude.ai/code/artifact/bbec1ffd-2e42-4f43-8746-7f2825408ed1 |
| `output/wpbl_bios.html` | https://claude.ai/code/artifact/316df85d-8b74-4ef5-8052-9284798ffa72 |
| `output/wpbl_analytics.html` | https://claude.ai/code/artifact/1145ca46-1246-4d56-98f9-5879a2c9b4ac |
| `output/wpbl_explorer.html` | https://claude.ai/code/artifact/3c789b85-5417-46d5-9d56-90717a59af97 |
| `output/wpbl_dashboard.html` | not yet published as a standalone artifact — combined tabbed view, see repo output/ |

## Design notes

- Light theme, off-white surfaces (`#f5f4f0` page / `#ffffff` cards).
- Team colors are fixed and CVD-validated — do not change without re-running the palette validator:
  `LA #ab7d2e` (tan/gold), `NY #1d4fd6` (blue), `SF #a020a0` (magenta-purple), `BOS #1f7a45` (green).
- `wpbl_explorer.html` is fully client-side interactive (dropdowns recompute Pearson r and redraw
  the SVG scatter in-browser) — everything else is static.
- Every page carries a sample-size caveat since the season is only a few games old; keep it as the
  game count grows unless it becomes misleading.
