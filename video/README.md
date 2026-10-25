# Football Lab clips (Remotion)

Renders 10–15 s MP4 clips from the site's **existing real data** (nothing is invented). Each clip comes in 1920×1080 and 1080×1350 (X portrait) at 30 fps.

| Composition | Data | Source |
|---|---|---|
| `TableRace-*` (13 s) | La Liga 2026/27 points per matchday (`data/results/2026-27_es.json`) | openfootball (CC0) + ESPN public scoreboard |
| `ShotTimeline-*` (12 s) | Latest Barça report (`data/live/matches/*.json`) | ESPN public match summary (no free xG, so shots are unweighted) |
| `RadarCompare-*` (12 s) | Messi vs Ronaldo percentiles, La Liga 2015/16 (`data/lab/laliga.json`) | StatsBomb Open Data, **historical** |
| `ClasicoXG-*` (13 s) | Real Madrid 0–4 Barcelona, 21 Nov 2015, cumulative xG | StatsBomb Open Data, **historical** |

Every clip shows its data credit (plus the StatsBomb logo where StatsBomb data is used) and "Football Lab · bepojoseph.xyz".

```bash
cd video && npm ci
npm run prep          # builds src/clipdata.json from ../data
npm run studio        # preview
npm run render -- ../../football-lab-clips   # render all 8 MP4s (default: video/out)
```

On demand in CI: Actions → **Render clips** → Run workflow. The MP4s are uploaded as a build artifact and are never published or posted anywhere.

**Charts are 2D SVG/DOM only, with no WebGL or 3D.** The motion ideas (masked title wipe, staggered rise, spring scale-in, count-ups, fade-out outro) are general patterns inspired by browsing free references on 60fps.design. No assets, code or designs were copied.

## License note
[Remotion](https://www.remotion.dev/license) is free for individuals and companies/teams of **3 or fewer people**. Larger organisations need a company license. This is a personal project, so the free license applies.
