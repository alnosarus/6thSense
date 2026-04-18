#!/usr/bin/env bash
# Process a scroll-video source MP4 into the WebP frame sequence, poster,
# and manifest consumed by <ScrollStage />. Offline pipeline — never runs at
# build time. Source MP4s are gitignored; outputs under public/ are committed.
#
# Usage:
#   scripts/process-scroll-video.sh <slug>
#   scripts/process-scroll-video.sh <slug> <path-to-source.mp4>
#
# Env overrides (chromakey tuning):
#   CHROMA_COLOR       (default 0x5a9c5f — the Veo generator's olive green)
#   CHROMA_SIMILARITY  (default 0.22)
#   CHROMA_BLEND       (default 0.10)
#   FRAME_STRIDE       (default 2 — keeps every Nth frame)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/scroll-video-src"
OUT_ROOT="$ROOT/public/scroll-video"

SLUG="${1:-}"
if [[ -z "$SLUG" ]]; then
  echo "usage: $0 <slug> [source.mp4]" >&2
  exit 2
fi

SRC="${2:-}"
if [[ -z "$SRC" ]]; then
  # Slug-to-filename map. Add more as more source videos arrive.
  case "$SLUG" in
    glove)    SRC="$SRC_DIR/Glove_Animation_for_Landing_Page.mp4" ;;
    *)        SRC="$SRC_DIR/${SLUG}.mp4" ;;
  esac
fi

if [[ ! -f "$SRC" ]]; then
  echo "error: source not found: $SRC" >&2
  exit 1
fi

# colorkey operates in RGB space (chromakey is YUV and keyed too aggressively
# on this source). Values tuned for the olive-green Veo generator background
# (~#4f8f53 dark corner → ~#69a96d bright corner); glove body is gray ~#6e6e74,
# distance-wise ~55 from key, while bg is 10-20 away, so a tight threshold
# keeps the glove opaque.
KEY_COLOR="${KEY_COLOR:-0x5a9c5f}"
KEY_SIMILARITY="${KEY_SIMILARITY:-0.09}"
KEY_BLEND="${KEY_BLEND:-0.05}"
FRAME_STRIDE="${FRAME_STRIDE:-2}"

OUT="$OUT_ROOT/$SLUG"
mkdir -p "$OUT/full" "$OUT/mobile"
# Wipe any prior run so stale frames don't linger if frame count drops.
rm -f "$OUT/full"/*.webp "$OUT/mobile"/*.webp "$OUT/poster.jpg" "$OUT/manifest.json"

TMP_FULL="$(mktemp -d -t scrollvid-full)"
TMP_MOBILE="$(mktemp -d -t scrollvid-mobile)"
trap 'rm -rf "$TMP_FULL" "$TMP_MOBILE"' EXIT

# Mask the "Veo" watermark bottom-right before keying, so chromakey never
# has to see non-green pixels there. delogo interpolates from neighbors.
DELOGO="delogo=x=610:y=1215:w=105:h=55:show=0"
KEY="format=rgba,colorkey=${KEY_COLOR}:${KEY_SIMILARITY}:${KEY_BLEND}"
SUBSAMPLE="select='not(mod(n\\,${FRAME_STRIDE}))',setpts=N/FRAME_RATE/TB"

echo "→ Probing $SRC"
ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height,nb_frames,r_frame_rate \
  -of default=noprint_wrappers=1 "$SRC" | sed 's/^/    /'

echo "→ Extracting full-res RGBA PNGs (540×960) — colorkey $KEY_COLOR sim=$KEY_SIMILARITY blend=$KEY_BLEND"
ffmpeg -y -loglevel error -i "$SRC" \
  -vf "${DELOGO},${KEY},${SUBSAMPLE},scale=540:960:flags=lanczos" \
  -vsync 0 -pix_fmt rgba -start_number 0 \
  "$TMP_FULL/frame-%03d.png"

echo "→ Extracting mobile RGBA PNGs (270×480)"
ffmpeg -y -loglevel error -i "$SRC" \
  -vf "${DELOGO},${KEY},${SUBSAMPLE},scale=270:480:flags=lanczos" \
  -vsync 0 -pix_fmt rgba -start_number 0 \
  "$TMP_MOBILE/frame-%03d.png"

FRAME_COUNT=$(ls "$TMP_FULL" | wc -l | tr -d ' ')
if (( FRAME_COUNT == 0 )); then
  echo "error: no frames produced" >&2
  exit 1
fi

# cwebp in parallel where cores allow; keep it simple with xargs -P.
echo "→ Encoding $FRAME_COUNT WebP frames (full)"
find "$TMP_FULL" -name 'frame-*.png' -print0 \
  | xargs -0 -n1 -P4 -I{} sh -c '
      f="$1"; base=$(basename "$f" .png)
      cwebp -quiet -q 75 -alpha_q 80 "$f" -o "'"$OUT/full"'/${base}.webp"
    ' _ {}

echo "→ Encoding $FRAME_COUNT WebP frames (mobile)"
find "$TMP_MOBILE" -name 'frame-*.png' -print0 \
  | xargs -0 -n1 -P4 -I{} sh -c '
      f="$1"; base=$(basename "$f" .png)
      cwebp -quiet -q 75 -alpha_q 80 "$f" -o "'"$OUT/mobile"'/${base}.webp"
    ' _ {}

# Poster: midpoint frame flattened onto --ink-1 (#262312), JPEG q≈78.
MID=$(( FRAME_COUNT / 2 ))
MID_PADDED=$(printf "%03d" "$MID")
POSTER_SRC="$TMP_FULL/frame-${MID_PADDED}.png"
echo "→ Encoding poster.jpg from frame #$MID"
ffmpeg -y -loglevel error \
  -f lavfi -i "color=0x262312:s=540x960:d=1" \
  -i "$POSTER_SRC" \
  -filter_complex "[0][1]overlay=shortest=1,format=yuvj420p" \
  -frames:v 1 -q:v 6 "$OUT/poster.jpg"

cat > "$OUT/manifest.json" <<EOF
{
  "slug": "$SLUG",
  "frameCount": $FRAME_COUNT,
  "width": 540,
  "height": 960,
  "posterSrc": "/scroll-video/$SLUG/poster.jpg",
  "framePathFull": "/scroll-video/$SLUG/full/frame-{NNN}.webp",
  "framePathMobile": "/scroll-video/$SLUG/mobile/frame-{NNN}.webp"
}
EOF

echo
echo "✓ $SLUG → $OUT"
printf "  frames:  full=%s mobile=%s\n" \
  "$(ls "$OUT/full" | wc -l | tr -d ' ')" \
  "$(ls "$OUT/mobile" | wc -l | tr -d ' ')"
printf "  sizes:   full=%s  mobile=%s  poster=%s\n" \
  "$(du -sh "$OUT/full" | cut -f1)" \
  "$(du -sh "$OUT/mobile" | cut -f1)" \
  "$(du -sh "$OUT/poster.jpg" | cut -f1)"
