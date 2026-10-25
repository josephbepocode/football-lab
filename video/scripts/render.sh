#!/usr/bin/env bash
# Render every clip (both sizes) from the repo's current data. Usage: bash scripts/render.sh [outdir]
set -euo pipefail
cd "$(dirname "$0")/.."; OUT="${1:-out}"; mkdir -p "$OUT"
node scripts/prep.mjs
for clip in TableRace ShotTimeline RadarCompare ClasicoXG; do for size in Landscape Portrait; do id="$clip-$size"
  npx remotion render src/index.ts "$id" "$OUT/$id.mp4" --log=error
done; done
