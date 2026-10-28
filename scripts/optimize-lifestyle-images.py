#!/usr/bin/env python3
"""
optimize-lifestyle-images.py — web masters for the client's showroom lifestyle photography.

Reads each model's "<Model>- Lifestyle Images" folder in the content library and writes one
WebP master per cut to nuxt/public/images/models/<slug>/lifestyle/<slug>-<cut>.webp:

    ex-front     EX FRONT      → showroom hero (scripts/lib/hero-media.mjs)
    ex-back      EX BACK       → exterior stance / utility story row
    interior-1   INTERIOR 1    → cockpit & dash
    interior-2   INTERIOR 2    → infotainment (Triton, Xpander Cross) / drive controls (Outlander)
    interior-3   INTERIOR 3    → cabin seating & space

Masters are the hero tier: max 2048px wide, WebP quality 85, EXIF stripped (orientation baked in).
The smaller tiers — story rows 1200px @ q82, gallery thumbnails 600px @ q80 — are Directus
transforms of the uploaded master (see LIFESTYLE_* in nuxt/app/utils/directus-file.ts), so they are
not written here. scripts/upload-lifestyle-assets.mjs uploads the masters and maps them.

Source names are matched loosely ("TRTON EX FRONT.jpg", "OUTLANDER Interior  3.jpg").
Idempotent: a master newer than its source is skipped.

Usage:  python3 scripts/optimize-lifestyle-images.py
Env:    CONTENT_DIR (default ~/Documents/PERSONAL WORK/2026/Ansa/Mitsubishi/Content/Mitsubishi 2026)
"""

import os
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = Path(
    os.environ.get("CONTENT_DIR", Path.home() / "Documents/PERSONAL WORK/2026/Ansa/Mitsubishi/Content/Mitsubishi 2026")
)
MODELS_DIR = CONTENT_DIR / "02_Showroom_Models"
OUTPUT_ROOT = PROJECT_ROOT / "nuxt/public/images/models"

MAX_WIDTH = 2048
WEBP_QUALITY = 85
WEBP_METHOD = 6  # slowest / smallest — 15 files, run rarely

# vehicle slug → lifestyle folder (relative to MODELS_DIR)
SOURCES = {
    "xpander-cross": "Xpander_Cross/Mitsubishi Xpander Cross- Lifestyle Images",
    "triton": "Triton/Mitsubishi Triton- Lifestyle Images",
    "outlander-sport": "Outlander_Sport_HEV/Mitsubishi Outlander Sport HEV- Lifestyle Images",
}

CUT_PATTERNS = {
    "ex-front": re.compile(r"\bEX\s+FRONT\b", re.I),
    "ex-back": re.compile(r"\bEX\s+BACK\b", re.I),
    "interior-1": re.compile(r"\bINTERIOR\s+1\b", re.I),
    "interior-2": re.compile(r"\bINTERIOR\s+2\b", re.I),
    "interior-3": re.compile(r"\bINTERIOR\s+3\b", re.I),
}


def kb(n: int) -> str:
    return f"{n / 1024:,.0f} KB"


def main() -> int:
    total_in = total_out = 0
    for slug, rel in SOURCES.items():
        src_dir = MODELS_DIR / rel
        if not src_dir.is_dir():
            print(f"ERROR: {slug}: missing {src_dir}", file=sys.stderr)
            return 1
        sources = [p for p in src_dir.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
        out_dir = OUTPUT_ROOT / slug / "lifestyle"
        out_dir.mkdir(parents=True, exist_ok=True)

        for cut, pattern in CUT_PATTERNS.items():
            matches = [p for p in sources if pattern.search(p.stem)]
            if len(matches) != 1:
                print(f"ERROR: {slug} {cut}: expected 1 source, found {[m.name for m in matches]}", file=sys.stderr)
                return 1
            src = matches[0]
            dst = out_dir / f"{slug}-{cut}.webp"
            total_in += src.stat().st_size

            if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
                total_out += dst.stat().st_size
                print(f"= {dst.relative_to(PROJECT_ROOT)}")
                continue

            with Image.open(src) as im:
                im = ImageOps.exif_transpose(im).convert("RGB")
                if im.width > MAX_WIDTH:
                    im = im.resize((MAX_WIDTH, round(im.height * MAX_WIDTH / im.width)), Image.LANCZOS)
                im.save(dst, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)
                size = im.size
            total_out += dst.stat().st_size
            print(f"+ {dst.relative_to(PROJECT_ROOT)}  {size[0]}x{size[1]}  {kb(src.stat().st_size)} → {kb(dst.stat().st_size)}  ({src.name})")

    print(f"\n{kb(total_in)} → {kb(total_out)} ({100 - 100 * total_out / total_in:.0f}% smaller)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
