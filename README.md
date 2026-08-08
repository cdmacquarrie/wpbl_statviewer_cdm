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
   `/prospect-ranking/` (drafted players, filtered to `Signed` status) → `output/raw_data.json`
2. `analyze.js` — merges bios with stats, computes standings/per-game rates/run differential,
   batting/pitching/SB/SO leaderboards, age & nationality demographics, age-vs-performance
   correlations, and PCA/t-SNE/UMAP embeddings of each batter's rate-stat profile →
   `output/result.json`
3. `build_stats.js`, `build_bios.js`, `build_analytics.js`, `build_explorer.js` — each reads
   `output/result.json` and writes one self-contained HTML file to `output/`.

## Output → published artifacts

After running, publish each generated file to its **existing** artifact URL (do not mint new URLs —
pass the `url` param so the link stays stable for the user):

| File | Artifact URL |
|---|---|
| `output/wpbl_stats.html` | https://claude.ai/code/artifact/bbec1ffd-2e42-4f43-8746-7f2825408ed1 |
| `output/wpbl_bios.html` | https://claude.ai/code/artifact/316df85d-8b74-4ef5-8052-9284798ffa72 |
| `output/wpbl_analytics.html` | https://claude.ai/code/artifact/1145ca46-1246-4d56-98f9-5879a2c9b4ac |
| `output/wpbl_explorer.html` | https://claude.ai/code/artifact/3c789b85-5417-46d5-9d56-90717a59af97 |

## Design notes

- Light theme, off-white surfaces (`#f5f4f0` page / `#ffffff` cards).
- Team colors are fixed and CVD-validated — do not change without re-running the palette validator:
  `LA #ab7d2e` (tan/gold), `NY #1d4fd6` (blue), `SF #a020a0` (magenta-purple), `BOS #1f7a45` (green).
- `wpbl_explorer.html` is fully client-side interactive (dropdowns recompute Pearson r and redraw
  the SVG scatter in-browser) — everything else is static.
- Every page carries a sample-size caveat since the season is only a few games old; keep it as the
  game count grows unless it becomes misleading.
