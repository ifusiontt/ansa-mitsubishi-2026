#!/usr/bin/env bash
# optimize-hero-media.sh — homepage hero masters from the client NAS (UAT round, Nov 2026).
#
#   01_Home_Page/Hero_Banner_Media/ANSAMTR-7419 … HERO v2.jpg → nuxt/public/images/hero/mitsubishi-family-hero.webp
#   01_Home_Page/Hero_Banner_Media/<Model> - HD 1080p.mov     → nuxt/public/videos/hero/<slug>-hero.mp4 (+ -poster.webp)
#
# Videos: muted (audio stripped), H.264 yuv420p, faststart, ≤1920 wide — browser-safe looping backgrounds.
# CRF 27 alone gave 5–7 MB for these 15 s clips; the 1.8 Mbps cap lands them at ~3 MB each.
# Only the first video stream is mapped: the .mov files also carry an MJPEG cover-art stream.
# Posters are the first frame, so the poster→video swap has no visible jump.
#
# Usage:  bash scripts/optimize-hero-media.sh            (skips outputs that already exist)
#         FORCE=1 bash scripts/optimize-hero-media.sh    (re-encode everything)
# Env:    NAS_ROOT (default /mnt/nas-clients/Ansa Motors/Mitsubishi 2026)
# Needs:  ffmpeg, ImageMagick 7 (magick)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PUB="$HERE/../nuxt/public"
NAS_ROOT="${NAS_ROOT:-/mnt/nas-clients/Ansa Motors/Mitsubishi 2026}"
SRC="$NAS_ROOT/01_Home_Page/Hero_Banner_Media"

[ -d "$SRC" ] || { echo "ERROR: $SRC not found — is the nas-clients share mounted?" >&2; exit 1; }
mkdir -p "$PUB/images/hero" "$PUB/videos/hero"

fresh() { [ -z "${FORCE:-}" ] && [ -s "$1" ]; }

# --- family hero still -----------------------------------------------------------
out="$PUB/images/hero/mitsubishi-family-hero.webp"
if fresh "$out"; then echo "= $(basename "$out")"; else
	magick "$SRC/ANSAMTR-7419 - Mitsubishi Website Photo Content HERO v2.jpg" \
		-resize '2048x>' -strip -quality 85 -define webp:method=6 "$out"
	echo "+ $(basename "$out") $(du -h "$out" | cut -f1)"
fi

# --- model videos + posters ------------------------------------------------------
declare -A VIDEOS=(
	[triton]='Triton - HD 1080p.mov'
	[outlander-sport-hev]='Outlander - HD 1080p.mov'
	[xpander-cross]='Xpander Cross - HD 1080p.mov'
)
# The Outlander cut is letterboxed (~2.35:1 inside 1080p; cropdetect: 1920:804–818). Crop the bars
# so object-cover fills the hero instead of showing black bands.
declare -A PREFILTER=(
	[outlander-sport-hev]='crop=1920:800:0:140,'
)
for slug in "${!VIDEOS[@]}"; do
	in="$SRC/${VIDEOS[$slug]}"
	pre="${PREFILTER[$slug]:-}"
	mp4="$PUB/videos/hero/$slug-hero.mp4"
	poster="$PUB/videos/hero/$slug-hero-poster.webp"
	if fresh "$mp4"; then echo "= $(basename "$mp4")"; else
		ffmpeg -nostdin -loglevel error -y -i "$in" -map 0:v:0 -an \
			-c:v libx264 -pix_fmt yuv420p -crf 27 -maxrate 1800k -bufsize 3600k -preset slow -movflags +faststart \
			-vf "${pre}scale='min(1920,iw)':-2" "$mp4"
		echo "+ $(basename "$mp4") $(du -h "$mp4" | cut -f1)"
	fi
	if fresh "$poster"; then echo "= $(basename "$poster")"; else
		ffmpeg -nostdin -loglevel error -y -i "$mp4" -frames:v 1 -c:v libwebp -quality 82 "$poster"
		echo "+ $(basename "$poster") $(du -h "$poster" | cut -f1)"
	fi
done
