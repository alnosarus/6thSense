#!/usr/bin/env bash
# Build the camera scroll-stop composite: stack two real-footage clips
# (headband on top, chest on bottom) with a 1-px hairline divider, then
# subsample to 96 WebP frames per variant. Offline pipeline — never runs
# at build time. Source MP4s are gitignored; outputs under public/ are
# committed.
#
# Usage:
#   scripts/process-camera-stack.sh
#   scripts/process-camera-stack.sh <headband.mp4> <chest.mp4>
#
# Env overrides:
#   FRAME_STRIDE   (default 2 — keeps every Nth frame from 192 → 96)
#   DIVIDER_HEX    (default 736A3C — --khaki-0)
#   FULL_W         (default 540)
#   MOBILE_W       (default 270)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_DIR="$ROOT/scroll-video-src"
OUT="$ROOT/public/scroll-video/camera"

HB="${1:-$SRC_DIR/Camera_on_headband.mp4}"
CH="${2:-$SRC_DIR/Camera_on_chest.mp4}"

for f in "$HB" "$CH"; do
  if [[ ! -f "$f" ]]; then
    echo "error: source not found: $f" >&2
    exit 1
  fi
done

FRAME_STRIDE="${FRAME_STRIDE:-2}"

# LAYOUT: "side" (horizontal, headband left of chest, default) or "stacked"
# (vertical, headband on top of chest with OVERLAP_PX of overlap).
LAYOUT="${LAYOUT:-side}"

# Side-mode horizontal gap (transparent pixels between headband-right and
# chest-left). Widens the composite so paintCentered shrinks it to fit the
# canvas — devices end up smaller and pushed toward the canvas edges,
# leaving the centered headline ("VISION") visible between them.
GAP_PX="${GAP_PX:-800}"

# Output widths are layout-dependent: side mode is naturally ~3-4× wider
# than stacked, so it needs a larger target to keep per-device pixel density
# comparable to the glove stage.
if [[ "$LAYOUT" == "side" ]]; then
  FULL_W="${FULL_W:-1440}"
  MOBILE_W="${MOBILE_W:-720}"
else
  FULL_W="${FULL_W:-540}"
  MOBILE_W="${MOBILE_W:-270}"
fi

# Both source clips are on a Veo-style olive-green backdrop. Tuned via
# parameter sweep: 0x5a9c5f at sim=0.14 keys ~85% bg transparent on both
# clips while leaving device + straps fully opaque with minimal halo.
KEY_COLOR="${KEY_COLOR:-0x5a9c5f}"
KEY_SIMILARITY="${KEY_SIMILARITY:-0.14}"
KEY_BLEND="${KEY_BLEND:-0.06}"

# Crop window per clip. Source is 720x1280 portrait; subject doesn't sit at
# the source center, so a default center crop chops the device top/bottom.
# CROP_H is the cropped height; CROP_HB_Y / CROP_CH_Y are the top-y of the
# crop window for each clip. Tuned by sampling subject extent in source:
#   chest:    subject y=329-758 → crop y=180-800 (CROP_CH_Y=180, CROP_H=620)
#   headband: subject y=240-720 → crop y=190-810 (CROP_HB_Y=190, CROP_H=620)
# 620 gives both subjects ~50-150 px of breathing room top and bottom.
CROP_H="${CROP_H:-620}"
CROP_HB_Y="${CROP_HB_Y:-190}"
CROP_CH_Y="${CROP_CH_Y:-180}"

# Vertical overlap (in source-720-wide space) between headband bottom and
# chest top. With CROP_H=580 + per-clip y offsets, each subject fills the
# middle of its half. OVERLAP_PX=320 brings the bottom of the headband
# strap into contact with the top of the chest V-straps, reading as one
# connected rig with no visible gap and no pixel collision.
OVERLAP_PX="${OVERLAP_PX:-320}"

mkdir -p "$OUT/full" "$OUT/mobile"
# Wipe any prior run so stale frames don't linger if frame count drops.
rm -f "$OUT/full"/*.webp "$OUT/mobile"/*.webp "$OUT/poster.jpg" "$OUT/manifest.json"

TMP_FULL="$(mktemp -d -t camerastack-full)"
TMP_MOBILE="$(mktemp -d -t camerastack-mobile)"
trap 'rm -rf "$TMP_FULL" "$TMP_MOBILE"' EXIT

# Per-clip filter:
#   1. crop portrait 720x1280 → 720xCROP_H window starting at the configured y
#   2. drop the green backdrop with colorkey (RGBA from here on)
#   3. subsample every Nth frame, reset PTS so timing aligns
KEY="format=rgba,colorkey=${KEY_COLOR}:${KEY_SIMILARITY}:${KEY_BLEND}"
SUBSAMPLE="select='not(mod(n\\,${FRAME_STRIDE}))',setpts=N/FRAME_RATE/TB"
CROP_HB="crop=720:${CROP_H}:0:${CROP_HB_Y},${KEY},${SUBSAMPLE}"
CROP_CH="crop=720:${CROP_H}:0:${CROP_CH_Y},${KEY},${SUBSAMPLE}"

# Composite filter graph. In stacked mode the headband is padded down so the
# chest can be overlaid into a transparent region with OVERLAP_PX of overlap.
# In side mode the two clips sit next to each other via hstack — no overlap.
COMPOSITE_H=$(( CROP_H + CROP_H - OVERLAP_PX ))
CHEST_Y=$(( CROP_H - OVERLAP_PX ))

build_graph() {
  local target_w="$1"
  if [[ "$LAYOUT" == "side" ]]; then
    if (( GAP_PX > 0 )); then
      # Pad headband chain to full composite width, then overlay chest after
      # the configured gap. The transparent middle band sits behind the
      # centered headline so the two devices flank it instead of overlapping.
      local side_w=$(( 720 + GAP_PX + 720 ))
      local chest_x=$(( 720 + GAP_PX ))
      cat <<EOF
[0:v]${CROP_HB},pad=${side_w}:${CROP_H}:0:0:color=0x00000000[hb_pad];
[1:v]${CROP_CH}[ch];
[hb_pad][ch]overlay=${chest_x}:0:format=auto,scale=${target_w}:-2:flags=lanczos
EOF
    else
      cat <<EOF
[0:v]${CROP_HB}[hb];
[1:v]${CROP_CH}[ch];
[hb][ch]hstack=inputs=2,scale=${target_w}:-2:flags=lanczos
EOF
    fi
  else
    cat <<EOF
[0:v]${CROP_HB},pad=720:${COMPOSITE_H}:0:0:color=0x00000000[hb_pad];
[1:v]${CROP_CH}[ch];
[hb_pad][ch]overlay=0:${CHEST_Y}:format=auto,scale=${target_w}:-2:flags=lanczos
EOF
  fi
}

echo "→ Probing inputs"
for f in "$HB" "$CH"; do
  printf "    %s\n" "$(basename "$f")"
  ffprobe -v error -select_streams v:0 \
    -show_entries stream=width,height,nb_frames,r_frame_rate \
    -of default=noprint_wrappers=1 "$f" | sed 's/^/      /'
done

echo "→ Extracting full-res RGBA PNGs (${FULL_W}-wide stacked composite, key=${KEY_COLOR})"
ffmpeg -y -loglevel error -i "$HB" -i "$CH" \
  -filter_complex "$(build_graph "$FULL_W")" \
  -vsync 0 -pix_fmt rgba -start_number 0 \
  "$TMP_FULL/frame-%03d.png"

echo "→ Extracting mobile RGBA PNGs (${MOBILE_W}-wide stacked composite)"
ffmpeg -y -loglevel error -i "$HB" -i "$CH" \
  -filter_complex "$(build_graph "$MOBILE_W")" \
  -vsync 0 -pix_fmt rgba -start_number 0 \
  "$TMP_MOBILE/frame-%03d.png"

FRAME_COUNT=$(ls "$TMP_FULL" | wc -l | tr -d ' ')
if (( FRAME_COUNT == 0 )); then
  echo "error: no frames produced" >&2
  exit 1
fi

echo "→ Encoding $FRAME_COUNT WebP frames (full, alpha)"
find "$TMP_FULL" -name 'frame-*.png' -print0 \
  | xargs -0 -n1 -P4 -I{} sh -c '
      f="$1"; base=$(basename "$f" .png)
      cwebp -quiet -q 75 -alpha_q 80 "$f" -o "'"$OUT/full"'/${base}.webp"
    ' _ {}

echo "→ Encoding $FRAME_COUNT WebP frames (mobile, alpha)"
find "$TMP_MOBILE" -name 'frame-*.png' -print0 \
  | xargs -0 -n1 -P4 -I{} sh -c '
      f="$1"; base=$(basename "$f" .png)
      cwebp -quiet -q 75 -alpha_q 80 "$f" -o "'"$OUT/mobile"'/${base}.webp"
    ' _ {}

# Probe the actual encoded height — the -2 in scale rounds, so we read it
# back instead of trusting the spec math.
OUT_W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width \
  -of default=noprint_wrappers=1:nokey=1 "$OUT/full/frame-000.webp")
OUT_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height \
  -of default=noprint_wrappers=1:nokey=1 "$OUT/full/frame-000.webp")

# Poster: midpoint frame flattened onto --ink-1 (#262312), JPEG q≈78.
MID=$(( FRAME_COUNT / 2 ))
MID_PADDED=$(printf "%03d" "$MID")
POSTER_SRC="$TMP_FULL/frame-${MID_PADDED}.png"
echo "→ Encoding poster.jpg from frame #$MID"
ffmpeg -y -loglevel error \
  -f lavfi -i "color=0x262312:s=${OUT_W}x${OUT_H}:d=1" \
  -i "$POSTER_SRC" \
  -filter_complex "[0][1]overlay=shortest=1,format=yuvj420p" \
  -frames:v 1 -q:v 6 "$OUT/poster.jpg"

cat > "$OUT/manifest.json" <<EOF
{
  "slug": "camera",
  "frameCount": $FRAME_COUNT,
  "width": $OUT_W,
  "height": $OUT_H,
  "posterSrc": "/scroll-video/camera/poster.jpg",
  "framePathFull": "/scroll-video/camera/full/frame-{NNN}.webp",
  "framePathMobile": "/scroll-video/camera/mobile/frame-{NNN}.webp"
}
EOF

echo
echo "✓ camera → $OUT"
printf "  composite: %sx%s\n" "$OUT_W" "$OUT_H"
printf "  frames:    full=%s mobile=%s\n" \
  "$(ls "$OUT/full" | wc -l | tr -d ' ')" \
  "$(ls "$OUT/mobile" | wc -l | tr -d ' ')"
printf "  sizes:     full=%s  mobile=%s  poster=%s\n" \
  "$(du -sh "$OUT/full" | cut -f1)" \
  "$(du -sh "$OUT/mobile" | cut -f1)" \
  "$(du -sh "$OUT/poster.jpg" | cut -f1)"
