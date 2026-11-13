#!/usr/bin/env bash
# optimize-brochures.sh — compress the official 2026 spec sheets / brochures for web download.
#
# Sources (client NAS, "MITSUBISHI Spec Sheet"):
#   MitsubishiTriton Spec Sheet 2026 Updated (1).PDF      4 pp, letter landscape, ~12 MB
#   Outlander Sport HEV_Brouchure FAW 20.08.2026.pdf      14 pp, 16:9 brochure,   ~20 MB
#   Mitsubishi Xpander Cross - Spec Sheet.pdf             2 pp, A4,               ~15 MB
# (Xpander (10MB).pdf / Xpander (Short).PDF belong to the archived Xpander; the .psd is artwork.)
#
# Ghostscript /ebook (150 dpi images) → .tmp/brochures/<slug>-….pdf, the inputs for
# scripts/upload-brochures.mjs. If gs cannot shrink a file, the original is copied instead.
# Page counts are checked so a broken conversion never reaches the upload step.
#
# Usage: scripts/optimize-brochures.sh           (skips outputs that already exist)
#        FORCE=1 scripts/optimize-brochures.sh   (re-compress everything)
# Env:   NAS_ROOT (default /mnt/nas-clients/Ansa Motors/Mitsubishi 2026)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAS_ROOT="${NAS_ROOT:-/mnt/nas-clients/Ansa Motors/Mitsubishi 2026}"
SRC_DIR="$NAS_ROOT/MITSUBISHI Spec Sheet"
OUT_DIR="$ROOT/.tmp/brochures"

# output name | source file name
BROCHURES=(
	"triton-spec-sheet-2026.pdf|MitsubishiTriton Spec Sheet 2026 Updated (1).PDF"
	"outlander-sport-hev-brochure-2026.pdf|Outlander Sport HEV_Brouchure FAW 20.08.2026.pdf"
	"xpander-cross-spec-sheet-2026.pdf|Mitsubishi Xpander Cross - Spec Sheet.pdf"
)

command -v gs >/dev/null || { echo "ERROR: ghostscript (gs) is not installed" >&2; exit 1; }
command -v pdfinfo >/dev/null || { echo "ERROR: pdfinfo (poppler) is not installed" >&2; exit 1; }
[ -d "$SRC_DIR" ] || { echo "ERROR: $SRC_DIR not found — is the NAS mounted?" >&2; exit 1; }
mkdir -p "$OUT_DIR"

pages() { pdfinfo "$1" 2>/dev/null | awk '/^Pages:/ {print $2}'; }
size() { stat -c %s "$1"; }
human() { numfmt --to=iec --suffix=B "$1"; }

for entry in "${BROCHURES[@]}"; do
	out_name="${entry%%|*}"
	src="$SRC_DIR/${entry#*|}"
	out="$OUT_DIR/$out_name"
	[ -f "$src" ] || { echo "ERROR: missing source $src" >&2; exit 1; }

	if [ -f "$out" ] && [ -z "${FORCE:-}" ]; then
		echo "= $out_name exists ($(human "$(size "$out")")) — FORCE=1 to redo"
		continue
	fi

	tmp="$out.part"
	gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
		-dNOPAUSE -dQUIET -dBATCH -dDetectDuplicateImages=true \
		-sOutputFile="$tmp" "$src"

	src_pages="$(pages "$src")"
	out_pages="$(pages "$tmp")"
	if [ "$src_pages" != "$out_pages" ]; then
		rm -f "$tmp"
		echo "ERROR: $out_name has $out_pages pages after compression, source has $src_pages" >&2
		exit 1
	fi

	if [ "$(size "$tmp")" -ge "$(size "$src")" ]; then
		cp "$src" "$out"; rm -f "$tmp"
		note="gs could not shrink it — original kept"
	else
		mv "$tmp" "$out"
		note="$(( 100 - 100 * $(size "$out") / $(size "$src") ))% smaller"
	fi
	echo "+ $out_name: $(human "$(size "$src")") → $(human "$(size "$out")") ($note, $out_pages pages)"
done

echo
echo "Done. Upload with: node scripts/upload-brochures.mjs"
